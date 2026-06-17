import { contextBridge, ipcRenderer } from 'electron';

/** Résultat de numérisation exposé à l'app web (cf. apps/web/src/lib/desktop-scan.ts). */
export interface ScanResult {
  base64: string;
  mimeType: string;
  fileName: string;
}

export interface ScanDevice {
  id: string;
  name: string;
}

export interface ScanOptions {
  deviceId?: string;
  dpi?: number;
  colorMode?: 'color' | 'gray' | 'bw';
  source?: 'flatbed' | 'adf';
}

export interface FacturationScanApi {
  listDevices: () => Promise<ScanDevice[]>;
  scan: (opts?: ScanOptions) => Promise<ScanResult>;
}

export interface FacturationPrintApi {
  /** Imprime un PDF (base64) via le dialogue d'impression natif. */
  printPdf: (base64: string) => Promise<void>;
}

// On n'expose que des wrappers nommés — jamais `ipcRenderer` brut.
contextBridge.exposeInMainWorld('facturationScan', {
  listDevices: (): Promise<ScanDevice[]> => ipcRenderer.invoke('scan:list'),
  scan: (opts?: ScanOptions): Promise<ScanResult> => ipcRenderer.invoke('scan:acquire', opts ?? {}),
} satisfies FacturationScanApi);

contextBridge.exposeInMainWorld('facturationPrint', {
  printPdf: (base64: string): Promise<void> => ipcRenderer.invoke('print:pdf', base64),
} satisfies FacturationPrintApi);
