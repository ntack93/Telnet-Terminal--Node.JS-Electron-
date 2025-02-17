const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    connectTelnet: (host, port) => ipcRenderer.invoke('connect-telnet', { host, port }),
    loadChatMembers: () => ipcRenderer.invoke('load-chat-members'),
    loadPreferences: () => ipcRenderer.invoke('load-preferences'),
    sendMessage: (message) => ipcRenderer.invoke('send-message', message),
    saveSettings: (settings) => ipcRenderer.invoke('save-preferences', settings),
    saveTriggers: (triggers) => ipcRenderer.invoke('save-triggers', triggers),
    saveFavorites: (favorites) => ipcRenderer.invoke('save-favorites', favorites),
    removeFavorite: (favorite) => ipcRenderer.invoke('remove-favorite', favorite),
    loadFavorites: () => ipcRenderer.invoke('load-favorites'),
    clearChatlog: () => ipcRenderer.invoke('clear-chatlog'),
});
