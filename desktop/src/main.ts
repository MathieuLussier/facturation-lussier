import { app, BrowserWindow, dialog, ipcMain, session, shell } from 'electron';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { URL } from 'node:url';
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';
import { config } from './config';
import { listScanDevices, performScan, type ScanOptions } from './scan/index';

const APP_URL = config.appUrl;
const APP_ORIGIN = new URL(APP_URL).origin;

/** N'autorise la navigation que sur l'origine de l'app web. */
function isAllowedOrigin(url: string): boolean {
  try {
    return new URL(url).origin === APP_ORIGIN;
  } catch {
    return false;
  }
}

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: 'Facturation Lussier',
    backgroundColor: '#0b0f14',
    webPreferences: {
      contextIsolation: true, // isole le preload du contenu web
      nodeIntegration: false, // jamais de Node dans le renderer
      sandbox: true, // sandbox Chromium complet
      preload: path.join(__dirname, 'preload.js'),
      allowRunningInsecureContent: false,
      webSecurity: true,
    },
  });

  // ── Garde-fous de sécurité : uniquement sur la fenêtre du contenu distant ──
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedOrigin(url)) {
      log.warn(`Navigation bloquée : ${url}`);
      event.preventDefault();
    }
  });
  // Les sous-frames (iframes) ont leur propre événement : on applique la même
  // restriction d'origine (« will-navigate » ne couvre que la frame principale).
  mainWindow.webContents.on('will-frame-navigate', (details) => {
    if (!isAllowedOrigin(details.url)) {
      log.warn(`Navigation (sous-frame) bloquée : ${details.url}`);
      details.preventDefault();
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Liens externes → navigateur système ; aucune nouvelle fenêtre Electron.
    if (url.startsWith('https://') || url.startsWith('http://')) {
      setImmediate(() => {
        void shell.openExternal(url);
      });
    }
    return { action: 'deny' };
  });

  void mainWindow.loadURL(APP_URL);
  if (config.isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  void app.whenReady().then(() => {
    // Refuser toutes les permissions web (caméra, géoloc, etc.) — non requises.
    session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => {
      callback(false);
    });

    createWindow();

    app.on('activate', () => {
      if (mainWindow === null) createWindow();
    });

    if (app.isPackaged) {
      setupAutoUpdater();
    }
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ── IPC : numérisation ─────────────────────────────────────────────────────
ipcMain.handle('scan:list', () => listScanDevices());
ipcMain.handle('scan:acquire', (_event, opts: ScanOptions) => performScan(opts));

// ── IPC : impression (dialogue natif + aperçu du PDF) ──────────────────────
ipcMain.handle('print:pdf', (_event, base64: string) => printPdf(base64));

/**
 * Affiche le PDF dans une fenêtre (aperçu) et ouvre le dialogue d'impression
 * natif (sélection de l'imprimante). L'utilisateur ferme la fenêtre ensuite.
 */
async function printPdf(base64: string): Promise<void> {
  const tmp = path.join(os.tmpdir(), `facture-print-${Date.now()}.pdf`);
  await fs.writeFile(tmp, Buffer.from(base64, 'base64'));

  const win = new BrowserWindow({
    width: 900,
    height: 1000,
    title: 'Imprimer la facture',
    parent: mainWindow ?? undefined,
    autoHideMenuBar: true,
    backgroundColor: '#525659',
    webPreferences: { plugins: true },
  });
  win.on('closed', () => {
    void fs.unlink(tmp).catch(() => undefined);
  });

  await win.loadFile(tmp);
  // Laisser le visualiseur PDF rendre la page, puis ouvrir le dialogue natif.
  setTimeout(() => {
    if (win.isDestroyed()) return;
    win.webContents.print({ silent: false }, () => {
      /* impression lancée ou annulée : on garde la fenêtre comme aperçu */
    });
  }, 700);
}

// ── Mises à jour automatiques (prod packagée uniquement) ───────────────────
function setupAutoUpdater(): void {
  autoUpdater.logger = log;
  log.transports.file.level = 'info';

  autoUpdater.on('update-available', (info) => {
    log.info(`Mise à jour disponible : v${info.version}`);
  });
  autoUpdater.on('update-downloaded', (info) => {
    log.info(`Mise à jour téléchargée : v${info.version}`);
    // Demander confirmation avant de fermer l'app (ne pas tuer un travail en
    // cours sans prévenir). Sinon, la mise à jour s'installe au prochain quit.
    void dialog
      .showMessageBox({
        type: 'info',
        buttons: ['Redémarrer maintenant', 'Plus tard'],
        defaultId: 0,
        cancelId: 1,
        title: 'Mise à jour disponible',
        message: `Une nouvelle version (v${info.version}) est prête.`,
        detail: 'Redémarrer maintenant pour l’installer, ou plus tard à la fermeture.',
      })
      .then((res) => {
        if (res.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
  });
  autoUpdater.on('error', (err) => {
    log.error('Erreur auto-update :', err);
  });

  void autoUpdater.checkForUpdates();
}
