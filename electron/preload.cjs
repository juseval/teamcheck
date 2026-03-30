// electron/preload.cjs
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,

  // ── Config ────────────────────────────────────────────────────────────────
  getConfig: () => ipcRenderer.invoke('get-config'),

  // ── Screenshots ───────────────────────────────────────────────────────────
  setScreenshotInterval: (ms)      => ipcRenderer.send('set-screenshot-interval', ms),
  toggleScreenshots:     (enabled) => ipcRenderer.send('toggle-screenshots', enabled),

  // ── Auto-launch ───────────────────────────────────────────────────────────
  setAutoLaunch: (enabled) => ipcRenderer.send('set-auto-launch', enabled),

  // ── Clock ─────────────────────────────────────────────────────────────────
  notifyClockIn:  () => ipcRenderer.send('clock-in'),
  notifyClockOut: () => ipcRenderer.send('clock-out'),

  // ── Auto-update ───────────────────────────────────────────────────────────
  checkForUpdates:  () => ipcRenderer.send('update-check-manual'),
  downloadUpdate:   () => ipcRenderer.send('update-download'),
  installUpdate:    () => ipcRenderer.send('update-install'),

  onUpdateAvailable: (cb) => {
    const handler = (_, data) => cb(data);
    ipcRenderer.on('update-available', handler);
    return () => ipcRenderer.removeListener('update-available', handler);
  },
  onUpdateNotAvailable: (cb) => {
    const handler = () => cb();
    ipcRenderer.on('update-not-available', handler);
    return () => ipcRenderer.removeListener('update-not-available', handler);
  },
  onUpdateDownloadProgress: (cb) => {
    const handler = (_, data) => cb(data);
    ipcRenderer.on('update-download-progress', handler);
    return () => ipcRenderer.removeListener('update-download-progress', handler);
  },
  onUpdateDownloaded: (cb) => {
    const handler = (_, data) => cb(data);
    ipcRenderer.on('update-downloaded', handler);
    return () => ipcRenderer.removeListener('update-downloaded', handler);
  },
  onUpdateError: (cb) => {
    const handler = (_, data) => cb(data);
    ipcRenderer.on('update-error', handler);
    return () => ipcRenderer.removeListener('update-error', handler);
  },

  // ── Sistema → React ───────────────────────────────────────────────────────
  onScreenshotTaken: (cb) => {
    const handler = (_, data) => cb(data);
    ipcRenderer.on('screenshot-taken', handler);
    return () => ipcRenderer.removeListener('screenshot-taken', handler);
  },
  onSystemIdle: (cb) => {
    const handler = (_, data) => cb(data);
    ipcRenderer.on('system-idle', handler);
    return () => ipcRenderer.removeListener('system-idle', handler);
  },
  onSystemActive: (cb) => {
    const handler = (_, data) => cb(data);
    ipcRenderer.on('system-active', handler);
    return () => ipcRenderer.removeListener('system-active', handler);
  },
  onSystemSuspended: (cb) => {
    const handler = (_, data) => cb(data);
    ipcRenderer.on('system-suspended', handler);
    return () => ipcRenderer.removeListener('system-suspended', handler);
  },
  onSystemResumed: (cb) => {
    const handler = (_, data) => cb(data);
    ipcRenderer.on('system-resumed', handler);
    return () => ipcRenderer.removeListener('system-resumed', handler);
  },
});
