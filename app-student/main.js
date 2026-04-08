const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } = require('electron');
const { Bonjour } = require('bonjour-service');
const { io } = require('socket.io-client');
const { exec } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const screenshot = require('screenshot-desktop');

// How long (ms) to wait before attempting a socket reconnect
const RECONNECTION_DELAY_MS = 3000;

let socket;
let messageWindow;
let mainWindow;
let docsWindow;
let tray;
const bonjour = new Bonjour();

/** @security Prevent unexpected quit during exam */
let isQuitting = false;
let examActive = false;

app.on('before-quit', (e) => {
    if (!isQuitting) {
        e.preventDefault();
    }
});

// ---------------------------------------------------------------------------
// Offline-first: persist the last known task and server URL to disk
// ---------------------------------------------------------------------------
const CACHE_FILE = path.join(app.getPath('userData'), 'edutrack-cache.json');

function readCache() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
        }
    } catch (_) {}
    return {};
}

function writeCache(data) {
    try {
        const existing = readCache();
        fs.writeFileSync(CACHE_FILE, JSON.stringify({ ...existing, ...data }, null, 2), 'utf8');
    } catch (_) {}
}

/** @ui Create main student exam window */
function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1280, height: 820,
        minWidth: 900, minHeight: 600,
        title: 'EduTrack Student Terminal',
        backgroundColor: '#0a0c10',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });
    mainWindow.loadFile(path.join(__dirname, 'ui/index.html'));

    // Pass cached data so the UI can restore offline task immediately
    mainWindow.webContents.once('did-finish-load', () => {
        const cache = readCache();
        if (cache.lastTask) {
            mainWindow.webContents.send('cache-loaded', cache);
        }
    });

    mainWindow.on('blur', () => {
        if (examActive && socket && socket.connected) {
            socket.emit('security-alert', {
                hostname: os.hostname(),
                msg: 'Uczeń opuścił okno egzaminacyjne (Alt-Tab)!',
                type: 'focus_loss'
            });
        }
    });

    mainWindow.on('close', (e) => {
        if (!isQuitting) {
            e.preventDefault();
            if (examActive) {
                mainWindow.webContents.send('security-alert', { msg: 'Zamykanie aplikacji podczas egzaminu jest zabronione!' });
            } else {
                mainWindow.hide();
            }
        }
    });
}

/** @ui Message pop-up sent by teacher */
function createMessageWindow() {
    messageWindow = new BrowserWindow({
        width: 520, height: 320,
        show: false, frame: false, alwaysOnTop: true, transparent: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });
    messageWindow.on('close', (e) => {
        if (!isQuitting) {
            e.preventDefault();
            messageWindow.hide();
        }
    });
    messageWindow.loadFile(path.join(__dirname, 'ui/message.html'));
}

/** @ui Multi-window documentation assistant (TODO item: multi-window docs) */
function openDocsWindow() {
    if (docsWindow && !docsWindow.isDestroyed()) {
        docsWindow.focus();
        return;
    }
    docsWindow = new BrowserWindow({
        width: 720, height: 600,
        minWidth: 480, minHeight: 400,
        title: 'EduTrack — Asystent Dokumentacji',
        backgroundColor: '#0d1117',
        parent: mainWindow,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });
    docsWindow.loadFile(path.join(__dirname, 'ui/docs.html'));
    docsWindow.on('closed', () => { docsWindow = null; });
}

/** @ui System tray for quick access when exam window is minimised/hidden */
function createTray() {
    // If icon.png is missing the tray will use an invisible placeholder icon.
    // Place a 16×16 icon.png next to main.js to display a proper tray icon.
    const iconPath = path.join(__dirname, 'icon.png');
    const icon = fs.existsSync(iconPath)
        ? nativeImage.createFromPath(iconPath)
        : nativeImage.createEmpty();

    tray = new Tray(icon);
    tray.setToolTip('EduTrack Student Terminal');

    const contextMenu = Menu.buildFromTemplate([
        { label: 'Otwórz terminal', click: () => { mainWindow.show(); mainWindow.focus(); } },
        { label: 'Asystent dokumentacji', click: () => openDocsWindow() },
        { type: 'separator' },
        {
            label: 'Zakończ (tylko poza egzaminem)',
            click: () => {
                if (!examActive) {
                    isQuitting = true;
                    app.quit();
                }
            }
        }
    ]);
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => { mainWindow.show(); mainWindow.focus(); });
}

// ---------------------------------------------------------------------------
// IPC handlers
// ---------------------------------------------------------------------------
ipcMain.on('hide-msg', () => {
    if (messageWindow) messageWindow.hide();
});

ipcMain.on('force-quit', () => {
    isQuitting = true;
    app.quit();
});

ipcMain.on('submit-task', (event, data) => {
    if (socket && socket.connected) {
        socket.emit('student-submit', data);
    }
});

ipcMain.on('exam-started', () => { examActive = true; });
ipcMain.on('exam-ended',   () => { examActive = false; });

ipcMain.on('open-docs-window', () => openDocsWindow());

// Offline-first: renderer asks to persist task data
ipcMain.on('cache-task', (event, data) => {
    writeCache({ lastTask: data, cachedAt: Date.now() });
});

// Offline-first: renderer asks to clear cached task after submission
ipcMain.on('clear-task-cache', () => {
    writeCache({ lastTask: null, cachedAt: null });
});

ipcMain.handle('get-hostname', () => os.hostname());
ipcMain.handle('get-cache',    () => readCache());

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------
app.whenReady().then(() => {
    createMainWindow();
    createMessageWindow();
    createTray();
    startDiscovery();
});

// ---------------------------------------------------------------------------
// LAN discovery & socket
// ---------------------------------------------------------------------------
function startDiscovery() {
    const cache = readCache();
    // Offline-first: if we have a cached server URL try to reconnect right away
    if (cache.lastServerUrl) {
        connectToServer(cache.lastServerUrl);
    }

    bonjour.find({ type: 'http' }, (service) => {
        if (service.name.includes('EduTrack') && (!socket || !socket.connected)) {
            const serverUrl = `http://${service.referer.address}:${service.port}`;
            connectToServer(serverUrl);
        }
    });
}

function connectToServer(serverUrl) {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    socket = io(serverUrl, { reconnection: true, reconnectionDelay: RECONNECTION_DELAY_MS });

    socket.on('connect', () => {
        console.log('[AGENT] Connected to Server:', serverUrl);
        writeCache({ lastServerUrl: serverUrl });
        if (mainWindow) {
            mainWindow.webContents.send('server-found', { address: serverUrl });
        }
        exec('tasklist /fo csv /nh', (err, stdout) => {
            const processes = stdout
                ? stdout.split('\n').map(l => l.split(',')[0].replace(/"/g, '')).filter(n => n.length > 0)
                : [];
            socket.emit('agent-report', { hostname: os.hostname(), processes });
        });
        startMonitoring();
        runSoftwareAudit();
    });

    socket.on('disconnect', () => {
        if (mainWindow) mainWindow.webContents.send('server-disconnected', {});
    });

    socket.on('teacher-message', (data) => {
        if (data.targetId && data.targetId !== os.hostname()) return;
        if (data.type === 'lock' || data.type === 'black-screen') {
            if (mainWindow) mainWindow.webContents.send('lock-state', { locked: true, msg: data.msg, type: data.type });
        } else {
            if (messageWindow) {
                messageWindow.webContents.send('set-msg', data.msg);
                messageWindow.show();
            }
        }
    });

    socket.on('task-started', async (data) => {
        examActive = true;
        writeCache({ lastTask: data, cachedAt: Date.now() });
        if (mainWindow) {
            mainWindow.webContents.send('task-started', data);
            mainWindow.show();
            mainWindow.maximize();
            mainWindow.setAlwaysOnTop(true);
            setTimeout(() => mainWindow.setAlwaysOnTop(false), 5000);
        }
        if (data.type === 'offline') {
            const localTaskFile = path.join(app.getPath('desktop'), 'zadanie.xlsx');
            if (fs.existsSync(localTaskFile)) {
                shell.openPath(localTaskFile);
            }
        }
    });

    socket.on('task-ended', () => {
        examActive = false;
        writeCache({ lastTask: null });
    });
}

// ---------------------------------------------------------------------------
// Background monitoring
// ---------------------------------------------------------------------------
let monitoringStarted = false;

function startMonitoring() {
    if (monitoringStarted) return;
    monitoringStarted = true;

    setInterval(() => {
        if (!socket || !socket.connected) return;
        const isWin = os.platform() === 'win32';
        const windowCmd = isWin
            ? 'powershell "Add-Type -TypeDefinition \'using System; using System.Runtime.InteropServices; public class Win32 { [DllImport(\\\"user32.dll\\\")] public static extern IntPtr GetForegroundWindow(); [DllImport(\\\"user32.dll\\\")] public static extern int GetWindowThreadProcessId(IntPtr hWnd, out int lpdwProcessId); }\'; $hwnd = [Win32]::GetForegroundWindow(); $p = 0; [Win32]::GetWindowThreadProcessId($hwnd, [ref]$p); if($p -gt 0){ Get-Process -Id $p | Select-Object ProcessName, MainWindowTitle | ConvertTo-Json }else{@() | ConvertTo-Json}"'
            : 'ps -eo pid,comm';
        exec(windowCmd, (err, winStdout) => {
            let windowData = [];
            if (!err && winStdout) {
                try {
                    if (isWin) {
                        const parsed = JSON.parse(winStdout);
                        windowData = Array.isArray(parsed) ? parsed : [parsed];
                    }
                } catch (_) {}
            }
            const procCmd = isWin ? 'tasklist /fo csv /nh' : 'ps -eo comm';
            exec(procCmd, (err2, procStdout) => {
                let processes = [];
                if (!err2 && procStdout) {
                    if (isWin) {
                        processes = procStdout.split('\n').map(l => l.split(',')[0].replace(/"/g, '')).filter(n => n.length > 0);
                    } else {
                        processes = procStdout.split('\n').map(l => l.trim()).filter(n => n.length > 0);
                    }
                }
                const report = { hostname: os.hostname(), processes };
                if (isWin) {
                    report.windows = windowData.map(w => ({ app: w.ProcessName, title: w.MainWindowTitle || 'Active Window' }));
                }
                socket.emit('agent-report', report);
            });
        });
    }, 5000);

    setInterval(async () => {
        if (!socket || !socket.connected) return;
        try {
            const img = await screenshot({ format: 'jpg' });
            socket.emit('agent-screenshot', { hostname: os.hostname(), img: img.toString('base64') });
        } catch (e) { console.error('[AGENT] Screenshot error:', e.message); }
    }, 3000);
}

// ---------------------------------------------------------------------------
// Software audit
// ---------------------------------------------------------------------------
async function runSoftwareAudit() {
    const commonPaths = {
        'Microsoft Excel':     'C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE',
        'GIMP':                'C:\\Program Files\\GIMP 2\\bin\\gimp-2.10.exe',
        'VS Code':             path.join(os.homedir(), 'AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe'),
        'Cisco Packet Tracer': 'C:\\Program Files\\Cisco Packet Tracer 8.2.1\\bin\\PacketTracer.exe',
        'Oracle VirtualBox':   'C:\\Program Files\\Oracle\\VirtualBox\\VirtualBox.exe',
        'Python 3':            'C:\\Program Files\\Python312\\python.exe'
    };
    const auditResults = {};
    for (const [name, p] of Object.entries(commonPaths)) {
        auditResults[name] = fs.existsSync(p) ? 'INSTALLED' : 'NOT_FOUND';
    }
    console.log('[AUDIT] Local Tech Stack:', auditResults);
    if (socket && socket.connected) {
        socket.emit('software-audit-report', { hostname: os.hostname(), auditResults });
    }
}

app.on('will-quit', () => { bonjour.destroy(); });

