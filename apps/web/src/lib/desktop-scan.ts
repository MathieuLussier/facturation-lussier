/**
 * Pont vers les fonctions natives exposées par la coquille Electron (« desktop/ »).
 *
 * En navigateur classique, `window.facturationScan` / `window.facturationPrint`
 * sont absents : l'app retombe sur le sélecteur de fichier (scan) et l'ouverture
 * du PDF (impression). Dans l'app de bureau, le preload expose la numérisation
 * (choix du scanner + réglages) et l'impression native (sélection d'imprimante).
 */

export interface DesktopScanResult {
  /** Document numérisé encodé en base64 (sans préfixe data:). */
  base64: string;
  mimeType: string;
  fileName: string;
}

export interface ScanDevice {
  id: string;
  name: string;
}

export type ScanColorMode = 'color' | 'gray' | 'bw';
export type ScanSource = 'flatbed' | 'adf';

export interface ScanOptions {
  deviceId?: string;
  dpi?: number;
  colorMode?: ScanColorMode;
  source?: ScanSource;
}

export interface FacturationScanApi {
  listDevices: () => Promise<ScanDevice[]>;
  scan: (opts?: ScanOptions) => Promise<DesktopScanResult>;
}

export interface FacturationPrintApi {
  printPdf: (base64: string) => Promise<void>;
}

declare global {
  interface Window {
    facturationScan?: FacturationScanApi;
    facturationPrint?: FacturationPrintApi;
  }
}

/** Vrai uniquement dans l'app de bureau (scanner natif disponible). */
export function isDesktopScanAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.facturationScan?.scan === 'function';
}

/** Vrai uniquement dans l'app de bureau (impression native disponible). */
export function isDesktopPrintAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.facturationPrint?.printPdf === 'function';
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

/** Convertit un blob (ex. PDF) en base64 sans préfixe data:. */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (): void => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = (): void => reject(reader.error ?? new Error('Lecture du fichier échouée.'));
    reader.readAsDataURL(blob);
  });
}

/** Reconstitue un File à partir d'un résultat de numérisation. */
export function desktopScanResultToFile(result: DesktopScanResult): File {
  const blob = base64ToBlob(result.base64, result.mimeType);
  return new File([blob], result.fileName, { type: result.mimeType });
}

/** Liste les scanners disponibles (app de bureau). */
export function listScanDevices(): Promise<ScanDevice[]> {
  if (!window.facturationScan) throw new Error('Scanner de bureau indisponible.');
  return withTimeout(
    window.facturationScan.listDevices(),
    30_000,
    'Délai dépassé lors de la détection des scanners.',
  );
}

/** Rejette si la promesse ne se résout pas dans le délai imparti. */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (err) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      },
    );
  });
}

/** Déclenche une numérisation avec les options choisies (app de bureau). */
export function scanViaDesktop(opts?: ScanOptions): Promise<DesktopScanResult> {
  if (!window.facturationScan) throw new Error('Scanner de bureau indisponible.');
  // Filet de sécurité : le dialogue ne doit jamais rester bloqué indéfiniment.
  return withTimeout(
    window.facturationScan.scan(opts),
    150_000,
    'Délai de numérisation dépassé. Vérifie que le scanner est prêt, puis réessaie.',
  );
}

/** Imprime un PDF via le dialogue natif (app de bureau). */
export async function printPdfViaDesktop(blob: Blob): Promise<void> {
  if (!window.facturationPrint) throw new Error('Impression de bureau indisponible.');
  const base64 = await blobToBase64(blob);
  return window.facturationPrint.printPdf(base64);
}
