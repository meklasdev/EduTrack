const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
    onServerFound: (callback) => ipcRenderer.on('server-found', (_event, value) => callback(value)),
    onSecurityAlert: (callback) => ipcRenderer.on('security-alert', (_event, value) => callback(value)),
    onTaskStarted: (callback) => ipcRenderer.on('task-started', (_event, value) => callback(value)),
    onFocusLost: (callback) => ipcRenderer.on('focus-lost', (_event) => callback()),
    onFocusGained: (callback) => ipcRenderer.on('focus-gained', (_event) => callback()),
    submitTask: (data) => ipcRenderer.send('submit-task', data)
});
