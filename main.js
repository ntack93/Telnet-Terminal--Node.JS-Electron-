import { app, BrowserWindow, ipcMain } from 'electron';
import ElectronStore from 'electron-store';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

const store = new ElectronStore();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      additionalArguments: [`--cols=136`, `--rows=50`],
      preload: path.join(__dirname, 'preload.js') // Load ESM preload
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

ipcMain.handle('connect-telnet', async (event, { host, port }) => {
  return new Promise((resolve, reject) => {
      const telnetSocket = new net.Socket();

      telnetSocket.connect(port, host, () => {
          console.log(`Connected to ${host}:${port}`);
          resolve({ success: true, message: `Connected to ${host}:${port}` });
      });

      telnetSocket.on('error', (err) => {
          console.error('Socket error:', err);
          reject({ success: false, message: `Error: ${err.message}` });
      });

      telnetSocket.on('close', () => {
          console.log('Connection closed');
      });
  });
});

// Favorites management
ipcMain.handle('remove-favorite', (event, favorite) => {
  try {
      let favorites = store.get('favorites', []);
      favorites = favorites.filter(fav => fav !== favorite); // Remove favorite
      store.set('favorites', favorites);
      return { success: true, favorites };
  } catch (error) {
      console.error("Error removing favorite:", error);
      return { success: false, error: error.message };
  }
});

ipcMain.handle('save-favorite', (event, favorite) => {
  try {
      let favorites = store.get('favorites', []);
      if (!favorites.includes(favorite)) {
          favorites.push(favorite);
          store.set('favorites', favorites);
      }
      return { success: true, favorites };
  } catch (error) {
      console.error("Error saving favorite:", error);
      return { success: false, error: error.message };
  }
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
  try {
      store.set('chatMembers', data.members);
      store.set('lastSeen', data.lastSeen);
      return { success: true };
  } catch (error) {
      console.error("Error saving chat members:", error);
      return { success: false, error: error.message };
  }
});

ipcMain.handle('load-chat-members', async () => {
  return {
    members: store.get('chatMembers', []),
    lastSeen: store.get('lastSeen', {})
  };
});

ipcMain.handle('send-message', async (event, message) => {
  console.log("Message to send:", message);
  if (telnetSocket) {
      telnetSocket.write(message + '\r\n');
      return { success: true, message: "Message sent" };
  }
  return { success: false, message: "Not connected" };
});

ipcMain.handle('clear-chatlog', () => {
  store.set('chatlog', {});
  return { success: true };
});
