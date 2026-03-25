const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { Bonjour } = require('bonjour-service');
const { io } = require('socket.io-client');
const { exec } = require('child_process');
const os = require('os');
const screenshot = require('screenshot-desktop');
const path = require('path');

let socket;
let messageWindow;
const bonjour = new Bonjour();

// 🛡️ ANTI-CLOSING: Prevent app from quitting unexpectedly
let isQuitting = false;

app.on('before-quit', (e) => {
    if (!isQuitting) {
        e.preventDefault();
        console.log("[SECURITY] Blocked unexpected quit attempt.");
    }
});

function createMessageWindow() {
    messageWindow = new BrowserWindow({
        width: 500, height: 300,
        show: false, frame: false, alwaysOnTop: true, transparent: true,
        webPreferences: { nodeIntegration: true, contextIsolation: false }
    });

    // 🛡️ Prevent destruction on close
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
                require('electron').ipcRenderer.on('set-msg', (e, m) => { document.getElementById('msg').innerText = m; });
            </script>
        </body>
    `);
}

ipcMain.on('hide-msg', () => {
    if (messageWindow) messageWindow.hide();
});

app.on('ready', () => {
    createMessageWindow();
    startDiscovery();
});

function startDiscovery() {
    bonjour.find({ type: 'http' }, (service) => {
        if (service.name.includes('EduTrack') && !socket) {
            socket = io(`http://${service.referer.address}:${service.port}`);
            socket.on('connect', () => {
                console.log("[AGENT] Connected to Server!");
                // 🚀 Send initial report immediately
                exec('tasklist /fo csv /nh', (err, stdout) => {
                    const processes = stdout.split('\n').map(line => line.split(',')[0].replace(/"/g, '')).filter(n => n.length > 0);
                    socket.emit('agent-report', { hostname: os.hostname(), processes });
                });
                startMonitoring();
                runSoftwareAudit();
            });
            socket.on('teacher-message', (data) => {
                messageWindow.webContents.send('set-msg', data.msg);
                messageWindow.show();
            });
            socket.on('task-started', async (data) => {
                console.log(`[TASK] Auto-starting task: ${data.title}`);
                if (data.type === 'offline') {
                    // Try to open a local sample file if it exists, or just trigger Excel
                    const testFile = 'C:\\Users\\Jakub Lis\\Desktop\\EduTrack\\server\\test-data\\student.xlsx';
                    shell.openPath(testFile);
                }
            });
        }
    });
}

function startMonitoring() {
    // 1. Process Monitoring
    setInterval(() => {
        exec('tasklist /fo csv /nh', (err, stdout) => {
            if (err || !socket.connected) return;
            const processes = stdout.split('\n').map(line => line.split(',')[0].replace(/"/g, '')).filter(n => n.length > 0);
            socket.emit('agent-report', { hostname: os.hostname(), processes });
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
