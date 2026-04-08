const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Server events
    onServerFound:       (cb) => ipcRenderer.on('server-found',       (_e, v) => cb(v)),
    onServerDisconnected:(cb) => ipcRenderer.on('server-disconnected', (_e, v) => cb(v)),

    // Security / lock events
    onSecurityAlert: (cb) => ipcRenderer.on('security-alert', (_e, v) => cb(v)),
    onLockState:     (cb) => ipcRenderer.on('lock-state',     (_e, v) => cb(v)),

    // Task events
    onTaskStarted: (cb) => ipcRenderer.on('task-started', (_e, v) => cb(v)),

    // Offline-first cache
    onCacheLoaded: (cb) => ipcRenderer.on('cache-loaded', (_e, v) => cb(v)),
    cacheTask:     (data)  => ipcRenderer.send('cache-task', data),
    clearTaskCache:()      => ipcRenderer.send('clear-task-cache'),
    getCache:      ()      => ipcRenderer.invoke('get-cache'),

    // Message window events (used by message.html)
    onSetMsg: (cb) => ipcRenderer.on('set-msg', (_e, m) => cb(m)),
    hideMsg:  ()   => ipcRenderer.send('hide-msg'),

    // Focus events
    onFocusLost:   (cb) => ipcRenderer.on('focus-lost',  (_e) => cb()),
    onFocusGained: (cb) => ipcRenderer.on('focus-gained',(_e) => cb()),

    // Actions
    submitTask:    (data) => ipcRenderer.send('submit-task', data),
    forceQuit:     ()     => ipcRenderer.send('force-quit'),
    examStarted:   ()     => ipcRenderer.send('exam-started'),
    examEnded:     ()     => ipcRenderer.send('exam-ended'),
    openDocsWindow:()     => ipcRenderer.send('open-docs-window'),

    // Info
    getHostname: () => ipcRenderer.invoke('get-hostname'),
});

