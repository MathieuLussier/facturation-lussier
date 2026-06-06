import { contextBridge, ipcRenderer } from 'electron';

/** Résultat de numérisation exposé à l'app web (même contrat que apps/web/src/lib/desktop-scan.ts). */
export interface ScanResult {
  /** Document numérisé (PDF) encodé en base64, sans préfixe data:. */
  base64: string;
  mimeType: string;
  fileName: string;
}

export interface FacturationScanApi {
  scan: () => Promise<ScanResult>;
}

// On n'expose qu'un wrapper nommé — jamais `ipcRenderer` brut.
contextBridge.exposeInMainWorld('facturationScan', {
  scan: (): Promise<ScanResult> => ipcRenderer.invoke('scan'),
} satisfies FacturationScanApi);
