import { app, BrowserWindow, ipcMain, session, shell } from 'electron';
import path from 'node:path';
import { URL } from 'node:url';
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';
import { config } from './config';
import { performScan } from './scan/index';

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

  void mainWindow.loadURL(APP_URL);
  if (config.isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── Garde-fous de sécurité (contenu distant) ───────────────────────────────
app.on('web-contents-created', (_event, contents) => {
  // Bloque toute navigation hors de l'origine de l'app.
  contents.on('will-navigate', (event, url) => {
    if (!isAllowedOrigin(url)) {
      log.warn(`Navigation bloquée : ${url}`);
      event.preventDefault();
    }
  });
  // Aucune nouvelle fenêtre Electron ; les liens externes s'ouvrent dans le navigateur système.
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      setImmediate(() => {
        void shell.openExternal(url);
      });
    }
    return { action: 'deny' };
  });
});

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
ipcMain.handle('scan', () => performScan());

// ── Mises à jour automatiques (prod packagée uniquement) ───────────────────
function setupAutoUpdater(): void {
  autoUpdater.logger = log;
  log.transports.file.level = 'info';

  autoUpdater.on('update-available', (info) => {
    log.info(`Mise à jour disponible : v${info.version}`);
  });
  autoUpdater.on('update-downloaded', () => {
    log.info('Mise à jour téléchargée — installation au redémarrage.');
    // isSilent = true, isForceRunAfter = true
    autoUpdater.quitAndInstall(true, true);
  });
  autoUpdater.on('error', (err) => {
    log.error('Erreur auto-update :', err);
  });

  void autoUpdater.checkForUpdates();
}
