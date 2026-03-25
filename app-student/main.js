const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { Bonjour } = require('bonjour-service');
const { io } = require('socket.io-client');
const { exec } = require('child_process');
const os = require('os');
const screenshot = require('screenshot-desktop');
const path = require('path');

let socket;
let messageWindow;
let mainWindow;
const bonjour = new Bonjour();

// 🛡️ ANTI-CLOSING: Prevent app from quitting unexpectedly
let isQuitting = false;

app.on('before-quit', (e) => {
    if (!isQuitting) {
        e.preventDefault();
        console.log("[SECURITY] Blocked unexpected quit attempt.");
    }
});

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200, height: 800,
        title: "EduTrack Student Terminal",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'ui/index.html'));

    // Prevent accidental closing during exam
    mainWindow.on('close', (e) => {
        if (!isQuitting) {
            e.preventDefault();
            mainWindow.webContents.send('security-alert', { msg: "Zamykanie aplikacji podczas egzaminu jest zabronione!" });
        }
    });
}

function createMessageWindow() {
    messageWindow = new BrowserWindow({
        width: 500, height: 300,
        show: false, frame: false, alwaysOnTop: true, transparent: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    messageWindow.on('close', (e) => {
        if (!isQuitting) {
            e.preventDefault();
            messageWindow.hide();
        }
    });

    messageWindow.loadURL(`data:text/html,
        <body style="font-family:sans-serif; background:rgba(0,0,0,0.9); color:white; display:flex; flex-direction:column; align-items:center; justify-content:center; border:2px solid red; border-radius:15px; margin:0; padding:20px; text-align:center; overflow:hidden;">
            <h1 style="color:red; margin:0;">WIADOMOŚĆ OD NAUCZYCIELA</h1>
            <p id="msg" style="font-size:1.2rem;"></p>
            <button onclick="require('electron').ipcRenderer.send('hide-msg')" style="background:white; border:none; padding:10px 20px; border-radius:5px; cursor:pointer; font-weight:bold;">ZAMKNIJ</button>
            <script>
                const { ipcRenderer } = require('electron');
                ipcRenderer.on('set-msg', (e, m) => { document.getElementById('msg').innerText = m; });
            </script>
        </body>
    `);
}

ipcMain.on('hide-msg', () => {
    if (messageWindow) messageWindow.hide();
});

app.on('ready', () => {
    createMainWindow();
    createMessageWindow();
    startDiscovery();
});

function startDiscovery() {
    bonjour.find({ type: 'http' }, (service) => {
        if (service.name.includes('EduTrack') && !socket) {
            const serverUrl = `http://${service.referer.address}:${service.port}`;
            socket = io(serverUrl);
            socket.on('connect', () => {
                console.log("[AGENT] Connected to Server!");
                if (mainWindow) {
                    mainWindow.webContents.send('server-found', { address: serverUrl });
                }
                // 🚀 Send initial report immediately
                exec('tasklist /fo csv /nh', (err, stdout) => {
                    const processes = stdout.split('\n').map(line => line.split(',')[0].replace(/"/g, '')).filter(n => n.length > 0);
                    socket.emit('agent-report', { hostname: os.hostname(), processes });
                });
                startMonitoring();
                runSoftwareAudit();
            });
            socket.on('teacher-message', (data) => {
                if (data.type === 'lock') {
                    if (mainWindow) mainWindow.webContents.send('security-alert', { msg: data.msg });
                } else {
                    messageWindow.webContents.send('set-msg', data.msg);
                    messageWindow.show();
                }
            });
            socket.on('task-started', async (data) => {
                console.log(`[TASK] Auto-starting task: ${data.title}`);
                if (mainWindow) {
                    mainWindow.webContents.send('task-started', data);
                }
                if (data.type === 'offline') {
                    // Try to find a local task file in a generic way or skip if not found
                    const localTaskFile = path.join(app.getPath('desktop'), 'zadanie.xlsx');
                    if (require('fs').existsSync(localTaskFile)) {
                        shell.openPath(localTaskFile);
                    }
                }
            });
        }
    });
}

function startMonitoring() {
    // 1. Process & Window Monitoring
    setInterval(() => {
        if (!socket || !socket.connected) return;

        const cmd = os.platform() === 'win32'
            ? 'powershell "Get-Process | Where-Object {$_.MainWindowTitle} | Select-Object ProcessName, MainWindowTitle | ConvertTo-Json"'
            : 'ps -e'; // Simple fallback for non-windows

        exec(cmd, (err, stdout) => {
            if (err) return;

            let windowData = [];
            try {
                if (os.platform() === 'win32') {
                    const data = JSON.parse(stdout);
                    windowData = Array.isArray(data) ? data : [data];
                }
            } catch (e) {}

            exec('tasklist /fo csv /nh', (err2, stdout2) => {
                const processes = stdout2.split('\n').map(line => line.split(',')[0].replace(/"/g, '')).filter(n => n.length > 0);
                socket.emit('agent-report', {
                    hostname: os.hostname(),
                    processes,
                    windows: windowData.map(w => ({ app: w.ProcessName, title: w.MainWindowTitle }))
                });
            });
        });
    }, 5000);

    // 2. Screenshot Streaming
    setInterval(async () => {
        if (!socket.connected) return;
        try {
            const img = await screenshot({ format: 'jpg' });
            socket.emit('agent-screenshot', { hostname: os.hostname(), img: img.toString('base64') });
            console.log(`[AGENT] Sent screenshot to Server (${os.hostname()})`);
        } catch (e) { console.error("Screenshot error", e); }
    }, 3000); // Faster: Every 3 seconds
}

app.on('will-quit', () => { bonjour.destroy(); });

/**
 * 🔍 Software Audit: Check for required technical school apps (GIMP, Packet Tracer, etc.)
 */
async function runSoftwareAudit() {
    const fs = require('fs');
    const commonPaths = {
        'Microsoft Excel': 'C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE',
        'GIMP': 'C:\\Program Files\\GIMP 2\\bin\\gimp-2.10.exe',
        'VS Code': path.join(os.homedir(), 'AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe'),
        'Cisco Packet Tracer': 'C:\\Program Files\\Cisco Packet Tracer 8.2.1\\bin\\PacketTracer.exe',
        'Oracle VirtualBox': 'C:\\Program Files\\Oracle\\VirtualBox\\VirtualBox.exe',
        'Python 3': 'C:\\Program Files\\Python312\\python.exe'
    };

    const auditResults = {};
    for (const [name, p] of Object.entries(commonPaths)) {
        auditResults[name] = fs.existsSync(p) ? 'INSTALLED' : 'NOT_FOUND';
    }

    console.log("[AUDIT] Local Tech Stack Checked:", auditResults);
    if (socket && socket.connected) {
        socket.emit('software-audit-report', { hostname: os.hostname(), auditResults });
    }
}
