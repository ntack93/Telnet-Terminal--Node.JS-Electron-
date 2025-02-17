const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');
const store = new Store();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      additionalArguments: [`--cols=136`, `--rows=50`]
    }
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

// User preferences
ipcMain.handle('save-preferences', (event, prefs) => {
  store.set('preferences', prefs);
});

ipcMain.handle('load-preferences', () => {
  return store.get('preferences', {
    rememberUsername: false,
    rememberPassword: false,
    username: '',
    password: '',
    keepAlive: false,
    autoLogin: false,
    logonAutomation: false,
    font: 'Perfect DOS VGA 437',
    fontSize: 16
  });
});

// Favorites management
ipcMain.handle('save-favorites', (event, favorites) => {
  store.set('favorites', favorites);
});

ipcMain.handle('load-favorites', () => {
  return store.get('favorites', []);
});

// Chatlog management  
ipcMain.handle('save-chatlog', (event, chatlog) => {
  store.set('chatlog', chatlog);
});

ipcMain.handle('load-chatlog', () => {
  return store.get('chatlog', {});
});

// Triggers management
ipcMain.handle('save-triggers', (event, triggers) => {
  store.set('triggers', triggers);
});

ipcMain.handle('load-triggers', () => {
  return store.get('triggers', []);
});

// Chat members management
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
