// Copie les ressources non-TS (script PowerShell WIA) vers dist/ après compilation,
// pour qu'en dev `__dirname/scan/wia.ps1` existe. En production, electron-builder
// embarque aussi wia.ps1 via `extraResources` (voir electron-builder.yml).
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src', 'scan', 'wia.ps1');
const destDir = join(root, 'dist', 'scan');

if (existsSync(src)) {
  mkdirSync(destDir, { recursive: true });
  cpSync(src, join(destDir, 'wia.ps1'));
  console.log('[copy-resources] wia.ps1 -> dist/scan/wia.ps1');
} else {
  console.warn('[copy-resources] src/scan/wia.ps1 introuvable (skip)');
}
