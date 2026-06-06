import { spawn } from 'node:child_process';
import path from 'node:path';
import { app } from 'electron';

export interface WIAOptions {
  outputPath?: string;
  deviceName?: string;
  dpi?: number;
  colorMode?: 'color' | 'gray' | 'bw';
  source?: 'flatbed' | 'adf';
}

/**
 * Localise le script wia.ps1 :
 * - prod packagée : extraResources (process.resourcesPath/scan/wia.ps1)
 * - dev : dist/scan/wia.ps1 (copié par scripts/copy-resources.mjs)
 */
function getScriptPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'scan', 'wia.ps1');
  }
  return path.join(__dirname, 'wia.ps1');
}

/**
 * Numérise via WIA (PowerShell headless) et renvoie le chemin du fichier image
 * produit (JPEG, ou BMP en repli). Tente d'abord PowerShell 64 bits, puis 32 bits
 * (wiaaut.dll est parfois uniquement enregistrée en 32 bits).
 */
export function scanViaWIA(opts: WIAOptions = {}): Promise<string> {
  return attemptWIA(opts, false).catch((err: Error) => {
    if (process.platform === 'win32') {
      return attemptWIA(opts, true);
    }
    throw err;
  });
}

function attemptWIA(opts: WIAOptions, use32bit: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    const scriptPath = getScriptPath();
    const psExe = use32bit
      ? 'C:\\Windows\\SysWOW64\\WindowsPowerShell\\v1.0\\powershell.exe'
      : 'powershell.exe';

    const args: string[] = [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      scriptPath,
      '-DPI',
      String(opts.dpi ?? 300),
      '-ColorMode',
      opts.colorMode ?? 'color',
      '-Source',
      opts.source ?? 'flatbed',
    ];
    if (opts.outputPath) args.push('-OutputPath', opts.outputPath);
    if (opts.deviceName) args.push('-DeviceName', opts.deviceName);

    const ps = spawn(psExe, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';

    ps.stdout.on('data', (d: Buffer) => {
      stdout += d.toString();
    });
    ps.stderr.on('data', (d: Buffer) => {
      stderr += d.toString();
    });

    ps.on('close', (code: number | null) => {
      if (code !== 0) {
        reject(new Error(`Numérisation WIA échouée (code ${code ?? 'null'}).\n${stderr.trim()}`));
        return;
      }
      // La dernière ligne non vide de stdout est le chemin du fichier.
      const filePath = stdout
        .trim()
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .pop();
      if (!filePath) {
        reject(new Error('Numérisation WIA : aucun chemin de fichier retourné.'));
        return;
      }
      resolve(filePath);
    });

    ps.on('error', (err: Error) => {
      reject(new Error(`Impossible de lancer PowerShell (${psExe}) : ${err.message}`));
    });
  });
}
