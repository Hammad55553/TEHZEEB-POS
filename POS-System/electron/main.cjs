const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const isDev = !app.isPackaged;

// MEMORY: cap the renderer's JS heap so the app can never balloon to GBs.
// 1024MB is plenty for a POS UI and prevents runaway growth.
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=1024');

const { spawn } = require('child_process');
let mainWindow;
let backendProcess = null;

function startBackend() {
  if (isDev) return;
  const backendPath = path.join(process.resourcesPath, 'server.exe');
  
  backendProcess = spawn(backendPath, [], {
    detached: false,
    windowsHide: true,
    // 'ignore' stdio so the backend's console output is NOT piped into and
    // accumulated by Electron's memory over long running sessions (major leak fix).
    stdio: 'ignore',
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Tehzeeb Sweets & Super Store - POS Terminal",
    icon: path.join(__dirname, '../public/vite.svg'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: true,  // reduce CPU/memory when window not focused
      spellcheck: false,           // spellchecker dictionaries eat memory
    },
  });

  // LICENSE: read the hidden per-shop license key that YOU place at install time.
  // File location (production): next to the app in resources, named "license.key".
  // Contains just the key text, e.g.  TZB-001
  let licenseKey = '';
  try {
    const fs = require('fs');
    // Search several easy locations so YOU can drop the key file wherever is
    // convenient on the client machine. First match wins.
    const licPaths = [
      path.join(process.resourcesPath || __dirname, 'license.key'), // inside app resources
      path.join(__dirname, '..', 'license.key'),                    // beside the app
      path.join(app.getPath('userData'), 'license.key'),            // app data folder
      'C:\\tehzeeb-license.key',                                   // simple: root of C: drive (Windows)
      path.join(app.getPath('home'), 'tehzeeb-license.key'),        // user home folder
    ];
    for (const p of licPaths) {
      try { if (fs.existsSync(p)) { licenseKey = String(fs.readFileSync(p, 'utf8')).trim(); break; } } catch (e) {}
    }
  } catch (e) { /* no license file -> key stays empty */ }

  // Inject the key into the page so React can read it (window.__POS_LICENSE__).
  mainWindow.webContents.on('did-finish-load', () => {
    try {
      mainWindow.webContents.executeJavaScript(
        `window.__POS_LICENSE__ = ${JSON.stringify(licenseKey)};` +
        `try{ if(${JSON.stringify(licenseKey)}) localStorage.setItem('tehzeeb_license_key', ${JSON.stringify(licenseKey)}); }catch(e){}`
      );
    } catch (e) {}
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.setMenuBarVisibility(false);
}

let isManualCheck = false;

app.whenReady().then(() => {
  startBackend();
  createWindow();

  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});

// AUTO-UPDATER EVENTS
autoUpdater.on('checking-for-update', () => {
  if (isManualCheck && mainWindow) mainWindow.webContents.send('update-message', 'Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-message', 'Update Available. Downloading...');
    mainWindow.webContents.send('update-available', info);
  }
});

autoUpdater.on('update-not-available', () => {
  if (isManualCheck && mainWindow) {
    mainWindow.webContents.send('update-message', 'System is up to date.');
    mainWindow.webContents.send('update-not-available');
  }
});

autoUpdater.on('error', (err) => {
  if (isManualCheck && mainWindow) {
    mainWindow.webContents.send('update-message', 'Error in auto-update: ' + err);
  }
});

autoUpdater.on('download-progress', (progress) => {
  if (mainWindow) mainWindow.webContents.send('download-progress', progress);
});

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) {
    mainWindow.webContents.send('update-message', 'Update Downloaded. Restart to apply.');
    mainWindow.webContents.send('update-downloaded');
  }
});

// IPC LISTENERS
ipcMain.on('check-for-updates', () => {
  isManualCheck = true;
  if (isDev) {
    if (mainWindow) mainWindow.webContents.send('update-message', 'Running in Dev mode. Update skipped.');
  } else {
    autoUpdater.checkForUpdates();
  }
});

ipcMain.on('restart-app', () => {
  autoUpdater.quitAndInstall();
});
