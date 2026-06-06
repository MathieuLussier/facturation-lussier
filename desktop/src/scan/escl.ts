import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { URL } from 'node:url';

export interface ESCLOptions {
  host: string;
  port?: number;
  dpi?: number;
  colorMode?: 'RGB24' | 'Grayscale8' | 'BlackAndWhite1';
  source?: 'Platen' | 'Feeder';
  timeoutMs?: number;
}

interface HttpResponse {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}

function request(options: http.RequestOptions, body: Buffer | null = null): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () =>
        resolve({
          statusCode: res.statusCode ?? 0,
          headers: res.headers,
          body: Buffer.concat(chunks),
        }),
      );
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

/** Construit le XML ScanSettings eSCL (PWG/eSCL). */
function buildScanSettings(opts: Required<ESCLOptions>): Buffer {
  // A4 en 1/300 de pouce, mis à l'échelle de la résolution demandée.
  const unitFactor = opts.dpi / 300;
  const width = Math.round(2480 * unitFactor);
  const height = Math.round(3507 * unitFactor);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<scan:ScanSettings
    xmlns:scan="http://schemas.hp.com/imaging/escl/2011/05/03"
    xmlns:pwg="http://www.pwg.org/schemas/2010/12/sm"
    xmlns:escl="http://schemas.hp.com/imaging/escl/2011/05/03">
  <pwg:Version>2.0</pwg:Version>
  <pwg:ScanRegions>
    <pwg:ScanRegion>
      <pwg:ContentRegionUnits>escl:ThreeHundredthsOfInches</pwg:ContentRegionUnits>
      <pwg:Width>${width}</pwg:Width>
      <pwg:Height>${height}</pwg:Height>
      <pwg:XOffset>0</pwg:XOffset>
      <pwg:YOffset>0</pwg:YOffset>
    </pwg:ScanRegion>
  </pwg:ScanRegions>
  <pwg:InputSource>${opts.source}</pwg:InputSource>
  <pwg:DocumentFormat>application/pdf</pwg:DocumentFormat>
  <scan:DocumentFormatExt>application/pdf</scan:DocumentFormatExt>
  <scan:XResolution>${opts.dpi}</scan:XResolution>
  <scan:YResolution>${opts.dpi}</scan:YResolution>
  <scan:ColorMode>${opts.colorMode}</scan:ColorMode>
</scan:ScanSettings>`;

  return Buffer.from(xml, 'utf8');
}

/** Crée le job eSCL, renvoie l'URI complète du job (header Location). */
async function createJob(opts: Required<ESCLOptions>, xmlBody: Buffer): Promise<string> {
  const res = await request(
    {
      host: opts.host,
      port: opts.port,
      path: '/eSCL/ScanJobs',
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Content-Length': xmlBody.length,
      },
    },
    xmlBody,
  );

  if (res.statusCode !== 201) {
    throw new Error(
      `eSCL ScanJobs POST échoué : HTTP ${res.statusCode}\n${res.body.toString().slice(0, 200)}`,
    );
  }

  const location = res.headers.location;
  const locationStr = Array.isArray(location) ? location[0] : location;
  if (!locationStr) {
    throw new Error('eSCL : aucun header Location dans la réponse 201.');
  }
  return locationStr;
}

/** Attend que le document soit prêt en interrogeant ScannerStatus. */
async function waitForDocument(
  host: string,
  port: number,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 800));

    const res = await request({ host, port, path: '/eSCL/ScannerStatus', method: 'GET' });
    const xml = res.body.toString();

    if (/Aborted|Canceled/i.test(xml)) {
      throw new Error('Job eSCL annulé ou interrompu par le scanner.');
    }

    const match = xml.match(/<(?:pwg|scan):ImagesToTransfer>(\d+)<\/(?:pwg|scan):ImagesToTransfer>/);
    if (match && parseInt(match[1], 10) > 0) {
      return;
    }
    if (xml.includes('Completed') || xml.includes('ReadyToUpload')) {
      return;
    }
  }

  throw new Error('eSCL : délai dépassé en attendant le document numérisé.');
}

/** Récupère le document suivant du job. */
async function fetchNextDocument(host: string, port: number, jobUri: string): Promise<Buffer> {
  const jobPath = new URL(jobUri).pathname;
  const res = await request({ host, port, path: `${jobPath}/NextDocument`, method: 'GET' });
  if (res.statusCode !== 200) {
    throw new Error(`eSCL NextDocument GET échoué : HTTP ${res.statusCode}`);
  }
  return res.body;
}

/** Scan complet via eSCL. Renvoie le chemin du PDF temporaire produit. */
export async function scanViaESCL(opts: ESCLOptions): Promise<string> {
  const resolved: Required<ESCLOptions> = {
    host: opts.host,
    port: opts.port ?? 8080,
    dpi: opts.dpi ?? 300,
    colorMode: opts.colorMode ?? 'RGB24',
    source: opts.source ?? 'Platen',
    timeoutMs: opts.timeoutMs ?? 30_000,
  };

  const xmlBody = buildScanSettings(resolved);
  const jobUri = await createJob(resolved, xmlBody);
  await waitForDocument(resolved.host, resolved.port, resolved.timeoutMs);
  const pdfBuffer = await fetchNextDocument(resolved.host, resolved.port, jobUri);

  const outPath = path.join(os.tmpdir(), `escl_scan_${Date.now()}.pdf`);
  await fs.writeFile(outPath, pdfBuffer);
  return outPath;
}
