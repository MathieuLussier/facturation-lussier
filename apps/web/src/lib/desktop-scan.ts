/**
 * Pont vers le scanner natif exposé par la coquille Electron (« desktop/ »).
 *
 * En contexte navigateur classique, `window.facturationScan` est absent : l'app
 * retombe alors sur le sélecteur de fichier / la caméra. Dans l'app de bureau
 * Electron, le preload expose `window.facturationScan.scan()` qui pilote le
 * scanner de l'imprimante (WIA puis eSCL) et renvoie un PDF.
 */

export interface DesktopScanResult {
  /** Contenu du document numérisé encodé en base64 (sans préfixe data:). */
  base64: string;
  /** Type MIME du document (ex. application/pdf, image/jpeg). */
  mimeType: string;
  /** Nom de fichier suggéré (ex. Numerisation-2026-06-05-2230.pdf). */
  fileName: string;
}

export interface FacturationScanApi {
  scan: () => Promise<DesktopScanResult>;
}

declare global {
  interface Window {
    facturationScan?: FacturationScanApi;
  }
}

/** Vrai uniquement dans l'app de bureau Electron (scanner natif disponible). */
export function isDesktopScanAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.facturationScan?.scan === 'function';
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

/** Déclenche la numérisation native et renvoie le document prêt à téléverser. */
export async function scanViaDesktop(): Promise<File> {
  if (!window.facturationScan) {
    throw new Error('Scanner de bureau indisponible.');
  }
  const result = await window.facturationScan.scan();
  const blob = base64ToBlob(result.base64, result.mimeType);
  return new File([blob], result.fileName, { type: result.mimeType });
}
