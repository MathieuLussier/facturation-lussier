import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import imageSize from 'image-size';
import log from 'electron-log';
import PDFDocument from 'pdfkit';
import { config } from '../config';
import { scanViaWIA } from './wia';
import { scanViaESCL } from './escl';

export interface ScanResult {
  base64: string;
  mimeType: string;
  fileName: string;
}

const ESCL_COLOR: Record<string, 'RGB24' | 'Grayscale8' | 'BlackAndWhite1'> = {
  color: 'RGB24',
  gray: 'Grayscale8',
  bw: 'BlackAndWhite1',
};

function timestamp(): string {
  const d = new Date();
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/** Numérise (WIA puis eSCL en repli) et renvoie le document en PDF base64. */
export async function performScan(): Promise<ScanResult> {
  const scanned = await scanDocument();
  const temps = [scanned];
  let pdfPath = scanned;

  // eSCL renvoie déjà un PDF ; WIA renvoie une image → conversion.
  if (!scanned.toLowerCase().endsWith('.pdf')) {
    pdfPath = scanned.replace(/\.(jpe?g|bmp|png|tiff?)$/i, '.pdf');
    await imageToPdf(scanned, pdfPath);
    temps.push(pdfPath);
  }

  const buffer = await fs.readFile(pdfPath);
  await Promise.all(temps.map((f) => fs.unlink(f).catch(() => undefined)));

  return {
    base64: buffer.toString('base64'),
    mimeType: 'application/pdf',
    fileName: `Numerisation-${timestamp()}.pdf`,
  };
}

/** WIA (Windows) en priorité, eSCL réseau en repli. Renvoie un chemin (image ou PDF). */
async function scanDocument(): Promise<string> {
  const { resolution, colorMode, wiaDeviceName, esclHost, esclPort } = config.scan;

  if (process.platform === 'win32') {
    try {
      return await scanViaWIA({
        dpi: resolution,
        colorMode,
        source: 'flatbed',
        deviceName: wiaDeviceName,
      });
    } catch (wiaErr) {
      if (!esclHost) throw wiaErr;
      log.warn('WIA indisponible, bascule eSCL :', wiaErr instanceof Error ? wiaErr.message : wiaErr);
    }
  }

  if (!esclHost) {
    throw new Error(
      "Numérisation indisponible : aucun scanner WIA et aucun hôte eSCL configuré (FACT_SCAN_ESCL_HOST).",
    );
  }

  return scanViaESCL({
    host: esclHost,
    port: esclPort,
    dpi: resolution,
    colorMode: ESCL_COLOR[colorMode],
    source: 'Platen',
  });
}

function imageToPdf(imagePath: string, pdfPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let dims: { width?: number; height?: number };
    try {
      dims = imageSize(imagePath);
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
      return;
    }
    if (!dims.width || !dims.height) {
      reject(new Error("Dimensions de l'image numérisée illisibles."));
      return;
    }
    // px → points PDF (72 pt/pouce) selon la résolution de scan.
    const ptW = (dims.width / config.scan.resolution) * 72;
    const ptH = (dims.height / config.scan.resolution) * 72;

    const doc = new PDFDocument({ size: [ptW, ptH], margin: 0, autoFirstPage: false });
    const out = createWriteStream(pdfPath);
    doc.pipe(out);
    doc.addPage({ size: [ptW, ptH], margin: 0 });
    doc.image(imagePath, 0, 0, { width: ptW, height: ptH });
    doc.end();

    out.on('finish', () => resolve());
    out.on('error', reject);
  });
}
