const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const isDev = !app.isPackaged;

const { spawn } = require('child_process');
let mainWindow;
let backendProcess = null;

function startBackend() {
  if (isDev) return;
  const backendPath = path.join(process.resourcesPath, 'server.exe');
  
  backendProcess = spawn(backendPath, [], {
    detached: false,
    windowsHide: true,
  });

  backendProcess.stdout.on('data', (data) => console.log(`Backend: ${data}`));
  backendProcess.stderr.on('data', (data) => console.error(`Backend Error: ${data}`));
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
    },
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
