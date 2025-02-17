import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const store = new Store();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      enableRemoteModule: true,
      preload: path.join(__dirname, 'preload.cjs') // Note: changed to .cjs
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

// IPC handlers
ipcMain.handle('connect-telnet', async (event, { host, port }) => {
  // Implement telnet connection logic
});

ipcMain.handle('send-telnet', async (event, message) => {
  // Implement telnet send logic
});

// Persist data handlers
ipcMain.handle('save-data', (event, { key, data }) => {
  store.set(key, data);
  return true;
});

ipcMain.handle('load-data', (event, { key }) => {
  return store.get(key);
});
