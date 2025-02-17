const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');
const store = new Store();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,  // Increased width to accommodate 136 columns
    height: 900,  // Increased height to accommodate 50 rows
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      additionalArguments: [
        `--cols=136`,  // Set terminal width to 136 columns
        `--rows=50`    // Set terminal height to 50 rows
      ]
    }
  });

  // Set terminal size in store
  store.set('terminal', {
    cols: 136,
    rows: 50,
    encoding: 'cp437'
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for various features
ipcMain.handle('save-favorites', (event, favorites) => {
  store.set('favorites', favorites);
});

ipcMain.handle('load-favorites', () => {
  return store.get('favorites', []);
});

// Settings handlers
ipcMain.handle('save-settings', (event, settings) => {
  store.set('settings', settings);
});

ipcMain.handle('load-settings', () => {
  return store.get('settings', {
    font: 'Perfect DOS VGA 437',
    fontSize: 16,
    autoLogin: false,
    logonAutomation: false,
    keepAlive: false
  });
});

// Chatlog handlers
ipcMain.handle('save-chatlog', (event, chatlog) => {
  store.set('chatlog', chatlog);
});

ipcMain.handle('load-chatlog', () => {
  return store.get('chatlog', {});
});

// Chat members handlers
ipcMain.handle('save-chat-members', (event, data) => {
  store.set('chatMembers', data.members);
  store.set('lastSeen', data.lastSeen);
});

ipcMain.handle('load-chat-members', () => {
  return {
    members: store.get('chatMembers', []),
    lastSeen: store.get('lastSeen', {})
  };
});
