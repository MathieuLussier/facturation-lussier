import fs from 'node:fs/promises';
import log from 'electron-log';
import { config } from '../config';
import { scanViaWIA } from './wia';
import { scanViaESCL } from './escl';

export interface ScanResult {
  /** Document numérisé encodé en base64 (sans préfixe data:). */
  base64: string;
  mimeType: string;
  fileName: string;
}

const ESCL_COLOR: Record<string, 'RGB24' | 'Grayscale8' | 'BlackAndWhite1'> = {
  color: 'RGB24',
  gray: 'Grayscale8',
  bw: 'BlackAndWhite1',
};

const MIME_BY_EXT: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.bmp': 'image/bmp',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
};

function extOf(p: string): string {
  const i = p.lastIndexOf('.');
  return i >= 0 ? p.slice(i).toLowerCase() : '';
}

function timestamp(): string {
  const d = new Date();
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/**
 * Numérise (WIA puis eSCL en repli) et renvoie le document tel quel :
 * - WIA → image (JPEG, ou BMP en repli)
 * - eSCL → PDF
 * Le document est joint à la facture par l'app web (qui accepte image et PDF).
 */
export async function performScan(): Promise<ScanResult> {
  const scanned = await scanDocument();
  const ext = extOf(scanned) || '.jpg';
  const mimeType = MIME_BY_EXT[ext] ?? 'application/octet-stream';
  const buffer = await fs.readFile(scanned);
  await fs.unlink(scanned).catch(() => undefined);

  return {
    base64: buffer.toString('base64'),
    mimeType,
    fileName: `Numerisation-${timestamp()}${ext}`,
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
