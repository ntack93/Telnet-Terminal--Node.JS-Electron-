const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    connectTelnet: (options) => ipcRenderer.invoke('connect-telnet', options),
    sendTelnet: (message) => ipcRenderer.invoke('send-telnet', message),
    saveData: (key, data) => ipcRenderer.invoke('save-data', { key, data }),
    loadData: (key) => ipcRenderer.invoke('load-data', { key }),
    onTelnetData: (callback) => ipcRenderer.on('telnet-data', callback),
    onTelnetConnect: (callback) => ipcRenderer.on('telnet-connect', callback),
    onTelnetDisconnect: (callback) => ipcRenderer.on('telnet-disconnect', callback),
    onTelnetError: (callback) => ipcRenderer.on('telnet-error', callback)
});