import { spawn } from 'node:child_process';
import path from 'node:path';
import { app } from 'electron';

export interface WIAOptions {
  outputPath?: string;
  deviceId?: string;
  deviceName?: string;
  dpi?: number;
  colorMode?: 'color' | 'gray' | 'bw';
  source?: 'flatbed' | 'adf';
}

export interface WIADevice {
  id: string;
  name: string;
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

/** Lance wia.ps1 avec les arguments donnés et renvoie son stdout. */
function runPowerShell(args: string[], use32bit: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    const psExe = use32bit
      ? 'C:\\Windows\\SysWOW64\\WindowsPowerShell\\v1.0\\powershell.exe'
      : 'powershell.exe';
    const ps = spawn(
      psExe,
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', getScriptPath(), ...args],
      { windowsHide: true },
    );
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
      resolve(stdout);
    });
    ps.on('error', (err: Error) => {
      reject(new Error(`Impossible de lancer PowerShell (${psExe}) : ${err.message}`));
    });
  });
}

function lastNonEmptyLine(stdout: string): string | undefined {
  return stdout
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .pop();
}

/** Exécute avec repli PowerShell 32 bits (wiaaut.dll parfois enregistrée en 32 bits). */
async function withFallback<T>(fn: (use32bit: boolean) => Promise<T>): Promise<T> {
  try {
    return await fn(false);
  } catch (err) {
    if (process.platform === 'win32') {
      return fn(true);
    }
    throw err;
  }
}

/** Énumère les scanners WIA disponibles. */
export function listWiaDevices(): Promise<WIADevice[]> {
  return withFallback(async (use32bit) => {
    const out = await runPowerShell(['-Mode', 'list'], use32bit);
    const line = lastNonEmptyLine(out);
    if (!line) return [];
    try {
      const parsed = JSON.parse(line) as unknown;
      return Array.isArray(parsed) ? (parsed as WIADevice[]) : [];
    } catch {
      return [];
    }
  });
}

/**
 * Numérise via WIA et renvoie le chemin du fichier image produit (JPEG ou BMP).
 */
export function scanViaWIA(opts: WIAOptions = {}): Promise<string> {
  const args: string[] = [
    '-Mode',
    'acquire',
    '-DPI',
    String(opts.dpi ?? 300),
    '-ColorMode',
    opts.colorMode ?? 'color',
    '-Source',
    opts.source ?? 'flatbed',
  ];
  if (opts.outputPath) args.push('-OutputPath', opts.outputPath);
  if (opts.deviceId) args.push('-DeviceId', opts.deviceId);
  if (opts.deviceName) args.push('-DeviceName', opts.deviceName);

  return withFallback(async (use32bit) => {
    const out = await runPowerShell(args, use32bit);
    const filePath = lastNonEmptyLine(out);
    if (!filePath) {
      throw new Error('Numérisation WIA : aucun chemin de fichier retourné.');
    }
    return filePath;
  });
}
