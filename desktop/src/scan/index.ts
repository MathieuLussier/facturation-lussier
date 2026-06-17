import fs from 'node:fs/promises';
import log from 'electron-log';
import { config } from '../config';
import { listWiaDevices, scanViaWIA } from './wia';
import { scanViaESCL } from './escl';

export interface ScanResult {
  /** Document numérisé encodé en base64 (sans préfixe data:). */
  base64: string;
  mimeType: string;
  fileName: string;
}

export interface ScanDevice {
  id: string;
  name: string;
}

export type ColorMode = 'color' | 'gray' | 'bw';
export type ScanSource = 'flatbed' | 'adf';

export interface ScanOptions {
  /** Identifiant d'appareil (WIA DeviceID, ou « escl:<host> » pour le réseau). */
  deviceId?: string;
  dpi?: number;
  colorMode?: ColorMode;
  source?: ScanSource;
}

const ESCL_PREFIX = 'escl:';

const ESCL_COLOR: Record<ColorMode, 'RGB24' | 'Grayscale8' | 'BlackAndWhite1'> = {
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

/** Liste les scanners disponibles (WIA sous Windows + entrée eSCL si configurée). */
export async function listScanDevices(): Promise<ScanDevice[]> {
  const devices: ScanDevice[] = [];
  if (process.platform === 'win32') {
    try {
      devices.push(...(await listWiaDevices()));
    } catch (err) {
      log.warn('Énumération WIA échouée :', err instanceof Error ? err.message : err);
    }
  }
  if (config.scan.esclHost) {
    devices.push({
      id: `${ESCL_PREFIX}${config.scan.esclHost}`,
      name: `Réseau eSCL (${config.scan.esclHost})`,
    });
  }
  return devices;
}

/** Numérise selon les options choisies et renvoie le document (image ou PDF) en base64. */
export async function performScan(opts: ScanOptions = {}): Promise<ScanResult> {
  const dpi = opts.dpi ?? config.scan.resolution;
  const colorMode = opts.colorMode ?? config.scan.colorMode;
  const source = opts.source ?? 'flatbed';

  const scanned = await scanDocument(opts.deviceId, dpi, colorMode, source);
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

function scanEscl(host: string, dpi: number, colorMode: ColorMode, source: ScanSource): Promise<string> {
  return scanViaESCL({
    host,
    port: config.scan.esclPort,
    dpi,
    colorMode: ESCL_COLOR[colorMode],
    source: source === 'adf' ? 'Feeder' : 'Platen',
  });
}

/** Route vers WIA ou eSCL selon le périphérique choisi. Renvoie un chemin (image ou PDF). */
async function scanDocument(
  deviceId: string | undefined,
  dpi: number,
  colorMode: ColorMode,
  source: ScanSource,
): Promise<string> {
  // Périphérique réseau explicitement choisi.
  if (deviceId && deviceId.startsWith(ESCL_PREFIX)) {
    const host = deviceId.slice(ESCL_PREFIX.length) || config.scan.esclHost;
    if (!host) throw new Error('Hôte eSCL manquant.');
    return scanEscl(host, dpi, colorMode, source);
  }

  // WIA (Windows) — par DeviceID si fourni, sinon filtre par nom configuré.
  if (process.platform === 'win32') {
    try {
      return await scanViaWIA({
        deviceId,
        dpi,
        colorMode,
        source,
        deviceName: deviceId ? undefined : config.scan.wiaDeviceName,
      });
    } catch (wiaErr) {
      if (!config.scan.esclHost) throw wiaErr;
      log.warn('WIA indisponible, bascule eSCL :', wiaErr instanceof Error ? wiaErr.message : wiaErr);
    }
  }

  // Repli eSCL configuré (hors Windows, ou échec WIA).
  if (config.scan.esclHost) {
    return scanEscl(config.scan.esclHost, dpi, colorMode, source);
  }

  throw new Error(
    "Numérisation indisponible : aucun scanner WIA et aucun hôte eSCL configuré (FACT_SCAN_ESCL_HOST).",
  );
}
