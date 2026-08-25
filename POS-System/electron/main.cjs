const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const isDev = !app.isPackaged;

let mainWindow;

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

app.whenReady().then(() => {
  createWindow();

  if (!isDev) {
    // autoUpdater.checkForUpdatesAndNotify();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// AUTO-UPDATER EVENTS
autoUpdater.on('checking-for-update', () => {
  mainWindow.webContents.send('update-message', 'Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  mainWindow.webContents.send('update-message', 'Update Available. Downloading...');
  mainWindow.webContents.send('update-available', info);
});

autoUpdater.on('update-not-available', () => {
  mainWindow.webContents.send('update-message', 'System is up to date.');
});

autoUpdater.on('error', (err) => {
  mainWindow.webContents.send('update-message', 'Error in auto-update: ' + err);
});

autoUpdater.on('download-progress', (progress) => {
  mainWindow.webContents.send('download-progress', progress);
});

autoUpdater.on('update-downloaded', () => {
  mainWindow.webContents.send('update-message', 'Update Downloaded. Restart to apply.');
  mainWindow.webContents.send('update-downloaded');
});

// IPC LISTENERS
ipcMain.on('check-for-updates', () => {
  if (isDev) {
    mainWindow.webContents.send('update-message', 'Running in Dev mode. Update skipped.');
  } else {
    autoUpdater.checkForUpdates();
  }
});

ipcMain.on('restart-app', () => {
  autoUpdater.quitAndInstall();
});
