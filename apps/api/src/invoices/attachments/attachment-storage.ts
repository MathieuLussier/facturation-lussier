import * as fs from 'fs';
import * as path from 'path';

/**
 * Répertoire de stockage des pièces jointes de facture.
 * PRIVÉ : contrairement à `uploads/` (logo), ce dossier n'est PAS servi
 * statiquement — l'accès passe uniquement par l'endpoint de téléchargement authentifié.
 */
export const ATTACHMENTS_DIR = path.join(process.cwd(), 'storage', 'attachments');

export function ensureAttachmentsDir(): void {
  fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });
}

export function attachmentAbsPath(storedName: string): string {
  return path.join(ATTACHMENTS_DIR, storedName);
}

/**
 * Multer décode `originalname` en latin1 ; on le réinterprète en UTF-8 pour
 * conserver les accents des noms de fichiers français.
 */
export function decodeOriginalName(name: string): string {
  return Buffer.from(name, 'latin1').toString('utf8').slice(0, 255);
}
