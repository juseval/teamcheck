// electron/main.cjs
const {
  app, BrowserWindow, Tray, Menu, ipcMain,
  desktopCapturer, powerMonitor, nativeImage,
} = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs   = require('fs');

// ── Configuración ─────────────────────────────────────────────────────────────
const CONFIG = {
  IDLE_THRESHOLD_SECONDS: 10 * 60,
  SCREENSHOT_INTERVAL_MS:  3 * 60 * 1000,
  SCREENSHOT_QUALITY:      60,
  SCREENSHOT_MAX_WIDTH:    1280,
  DEV_MODE:                !app.isPackaged,
};

let mainWindow         = null;
let tray               = null;
let screenshotTimer    = null;
let idleCheckTimer     = null;
let isIdle             = false;
let screenshotsEnabled = false;

// ── Helpers de ícono ──────────────────────────────────────────────────────────
function getAppIcon() {
  const ext = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
  return path.join(__dirname, '..', 'public', ext);
}

function getTrayIcon() {
  return path.join(__dirname, '..', 'public', 'tray-icon.png');
}

// ── Auto-updater ──────────────────────────────────────────────────────────────
function setupAutoUpdater() {
  if (CONFIG.DEV_MODE) return;

  autoUpdater.autoDownload         = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update-available', {
      version:      info.version,
      releaseNotes: info.releaseNotes || '',
    });
  });

  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('update-not-available');
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('update-download-progress', {
      percent:        Math.round(progress.percent),
      transferred:    progress.transferred,
      total:          progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('update-downloaded', { version: info.version });
  });

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] Error:', err.message);
    mainWindow?.webContents.send('update-error', { message: err.message });
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(e =>
      console.warn('[AutoUpdater] checkForUpdates failed:', e.message)
    );
  }, 3000);

  setInterval(() => {
    autoUpdater.checkForUpdates().catch(e =>
      console.warn('[AutoUpdater] checkForUpdates failed:', e.message)
    );
  }, 4 * 60 * 60 * 1000);
}

// ── Ventana principal ─────────────────────────────────────────────────────────
function createWindow() {
  const iconPath = getAppIcon();

  mainWindow = new BrowserWindow({
    width:     1280,
    height:    800,
    minWidth:  900,
    minHeight: 600,
    title:     'TeamCheck',
    icon:      iconPath,
    webPreferences: {
      preload:          path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration:  false,
    },
  });

  mainWindow.webContents.session.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      const allowed = ['media', 'screen', 'desktopCapture', 'display-capture'];
      callback(allowed.includes(permission));
    }
  );

  mainWindow.webContents.session.setDisplayMediaRequestHandler(
    (request, callback) => {
      desktopCapturer.getSources({ types: ['screen'] }).then(sources => {
        callback({ video: sources[0], audio: 'loopback' });
      });
    }
  );

  if (CONFIG.DEV_MODE) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('close', (e) => {
    if (!app.isQuiting) { e.preventDefault(); mainWindow.hide(); }
  });
}

// ── System Tray ───────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = getTrayIcon();
  let icon;

  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
    if (process.platform === 'win32') {
      icon = icon.resize({ width: 16, height: 16 });
    }
  } else {
    console.warn('[Tray] tray-icon.png no encontrado en:', iconPath);
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('TeamCheck');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir TeamCheck', click: () => { mainWindow.show(); mainWindow.focus(); } },
    { type: 'separator' },
    { label: 'Buscar actualizaciones', click: () => {
      if (!CONFIG.DEV_MODE) autoUpdater.checkForUpdates();
    }},
    { type: 'separator' },
    { label: 'Salir', click: () => { app.isQuiting = true; app.quit(); } },
  ]));
  tray.on('double-click', () => { mainWindow.show(); mainWindow.focus(); });
}

// ── Auto-launch ───────────────────────────────────────────────────────────────
function setAutoLaunch(enabled) {
  app.setLoginItemSettings({ openAtLogin: enabled, openAsHidden: true });
}

// ── Idle detection ────────────────────────────────────────────────────────────
function startIdleDetection() {
  if (idleCheckTimer) clearInterval(idleCheckTimer);
  idleCheckTimer = setInterval(() => {
    const idleSecs = powerMonitor.getSystemIdleTime();
    if (idleSecs >= CONFIG.IDLE_THRESHOLD_SECONDS && !isIdle) {
      isIdle = true;
      mainWindow?.webContents.send('system-idle', {
        idleStartedAt: Date.now() - idleSecs * 1000,
        idleSeconds:   idleSecs,
      });
    } else if (idleSecs < CONFIG.IDLE_THRESHOLD_SECONDS && isIdle) {
      isIdle = false;
      mainWindow?.webContents.send('system-active', { resumedAt: Date.now() });
    }
  }, 5_000);
}

// ── Screenshots ───────────────────────────────────────────────────────────────
async function takeScreenshot() {
  try {
    console.log('[Screenshot] Capturando pantalla...');
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width:  CONFIG.SCREENSHOT_MAX_WIDTH,
        height: Math.round(CONFIG.SCREENSHOT_MAX_WIDTH * 9 / 16),
      },
    });
    if (!sources.length) {
      console.warn('[Screenshot] No se encontraron fuentes de pantalla');
      return null;
    }
    const jpegBuffer = sources[0].thumbnail.toJPEG(CONFIG.SCREENSHOT_QUALITY);
    const base64 = `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`;
    console.log(`[Screenshot] ✅ Captura exitosa (${Math.round(jpegBuffer.length / 1024)}KB)`);
    return base64;
  } catch (err) {
    console.error('[Screenshot] ❌ Error:', err.message);
    return null;
  }
}

/**
 * Envía un screenshot al renderer si se pudo capturar.
 * Se usa tanto para la captura inmediata como para las periódicas.
 */
async function sendScreenshot() {
  if (!screenshotsEnabled || isIdle) return;
  const base64 = await takeScreenshot();
  if (base64) {
    console.log('[Screenshot] Enviando al renderer...');
    mainWindow?.webContents.send('screenshot-taken', {
      timestamp: Date.now(),
      data: base64,
    });
  }
}

function startScreenshots(intervalMs) {
  stopScreenshots();
  screenshotsEnabled = true;
  if (intervalMs) CONFIG.SCREENSHOT_INTERVAL_MS = intervalMs;

  console.log(`[Screenshot] 🟢 Iniciando capturas cada ${CONFIG.SCREENSHOT_INTERVAL_MS / 1000}s`);

  // ── FIX: tomar una captura inmediata al iniciar ──
  // Esperar 5 segundos para que la ventana se estabilice
  setTimeout(() => sendScreenshot(), 5000);

  // Luego continuar con el intervalo regular
  screenshotTimer = setInterval(() => sendScreenshot(), CONFIG.SCREENSHOT_INTERVAL_MS);
}

function stopScreenshots() {
  if (screenshotsEnabled) {
    console.log('[Screenshot] 🔴 Deteniendo capturas');
  }
  screenshotsEnabled = false;
  if (screenshotTimer) { clearInterval(screenshotTimer); screenshotTimer = null; }
}

// ── IPC ───────────────────────────────────────────────────────────────────────
ipcMain.handle('get-config', () => ({
  screenshotIntervalMs: CONFIG.SCREENSHOT_INTERVAL_MS,
  idleThresholdSeconds: CONFIG.IDLE_THRESHOLD_SECONDS,
  autoLaunchEnabled:    app.getLoginItemSettings().openAtLogin,
  appVersion:           app.getVersion(),
}));

ipcMain.on('set-screenshot-interval', (_, intervalMs) => {
  CONFIG.SCREENSHOT_INTERVAL_MS = intervalMs;
  if (screenshotsEnabled) startScreenshots(intervalMs);
});

ipcMain.on('toggle-screenshots', (_, enabled) => {
  enabled ? startScreenshots() : stopScreenshots();
});

ipcMain.on('set-auto-launch', (_, enabled) => { setAutoLaunch(enabled); });

ipcMain.on('clock-in', () => {
  console.log('[IPC] clock-in recibido');
  isIdle = false;
  startScreenshots();
});

ipcMain.on('clock-out', () => {
  console.log('[IPC] clock-out recibido');
  isIdle = false;
  stopScreenshots();
});

// Auto-update IPC
ipcMain.on('update-download',     () => { autoUpdater.downloadUpdate(); });
ipcMain.on('update-install',      () => { autoUpdater.quitAndInstall(); });
ipcMain.on('update-check-manual', () => {
  if (!CONFIG.DEV_MODE) autoUpdater.checkForUpdates();
});

// ── Eventos del sistema ───────────────────────────────────────────────────────
powerMonitor.on('suspend', () => {
  stopScreenshots();
  mainWindow?.webContents.send('system-suspended', { timestamp: Date.now() });
});
powerMonitor.on('resume', () => {
  mainWindow?.webContents.send('system-resumed', { timestamp: Date.now() });
});

// ── Ciclo de vida ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  createTray();
  startIdleDetection();
  setAutoLaunch(true);
  setupAutoUpdater();
});

app.on('window-all-closed', () => {
  if (process.platform === 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
  else mainWindow?.show();
});

app.on('before-quit', () => {
  app.isQuiting = true;
  stopScreenshots();
  if (idleCheckTimer) clearInterval(idleCheckTimer);
});
