const express = require('express');
const fileUpload = require('express-fileupload');
const http = require('http');
const { Server } = require('socket.io');
const { Bonjour } = require('bonjour-service');
const path = require('path');
const cors = require('cors');
const ExcelLogicChecker = require('./src/logic/excel-checker');

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: '*', maxHttpBufferSize: 1e7 } });
const bonjour = new Bonjour();
const fs = require('fs-extra');
const excelChecker = new ExcelLogicChecker();

const PORT = 8080;
const DB_PATH = path.join(__dirname, 'students_db.json');
const ADMIN_PASS = 'edutrack2025';

let currentTask = {
    title: "Egzamin: Arkusz Kalkulacyjny",
    description: "Zadanie 1: Oblicz sumę w A3.\nZadanie 2: Oblicz średnią w B5.",
    type: "none",
    startTime: Date.now()
};
let studentsStore = {};

// Load DB on start
if (fs.existsSync(DB_PATH)) studentsStore = fs.readJsonSync(DB_PATH);

const ExcelJS = require('exceljs');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(fileUpload());
app.use(express.static(path.join(__dirname, 'public')));

/** @guard Admin Password Check */
app.use('/admin', (req, res, next) => {
    const auth = req.query.pass || req.headers['x-admin-pass'];
    if (auth === ADMIN_PASS || req.hostname === 'localhost') return next();
    res.status(403).send(`
        <body style="background:#05070a; color:white; font-family:sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh;">
            <h1>403 Forbidden</h1>
            <p>Użyj hasła w URL: <code>/admin?pass=edutrack2025</code></p>
        </body>
    `);
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/api/current-task', (req, res) => res.json(currentTask));

app.post('/api/upload-template', async (req, res) => {
    if (!req.files || !req.files.template) return res.status(400).send('No template.');
    const templatePath = path.join(__dirname, 'test-data/template.xlsx');
    await req.files.template.mv(templatePath);
    res.send('Template updated.');
});

/**
 * 🛠️ Helper: Save DB
 */
function saveDB() { fs.writeJsonSync(DB_PATH, studentsStore, { spaces: 2 }); }

/**
 * 🛠️ Helper: Convert Luckysheet JSON to ExcelJS
 */
async function luckysheetToExcel(jsonStr) {
    const data = JSON.parse(jsonStr);
    const workbook = new ExcelJS.Workbook();
    data.forEach(sheet => {
        const worksheet = workbook.addWorksheet(sheet.name);
        if (sheet.celldata) {
            sheet.celldata.forEach(cell => {
                const excelCell = worksheet.getCell(cell.r + 1, cell.c + 1);
                if (cell.v && cell.v.f) excelCell.value = { formula: cell.v.f.substring(1), result: cell.v.v };
                else excelCell.value = cell.v ? (cell.v.v || cell.v) : '';

                if (cell.v && cell.v.bl) excelCell.font = { bold: true };
            });
        }
    });
    return workbook;
}

app.post('/api/check-excel', async (req, res) => {
    const studentPath = path.join(__dirname, 'test-data/temp_upload.xlsx');
    const hostname = req.body.hostname || "unknown";

    try {
        if (req.files && req.files.studentFile) {
            await req.files.studentFile.mv(studentPath);
        } else if (req.body.sheetJson) {
            const workbook = await luckysheetToExcel(req.body.sheetJson);
            await workbook.xlsx.writeFile(studentPath);
        } else return res.status(400).send({ error: 'No data.' });

        const report = await excelChecker.analyze(studentPath, path.join(__dirname, 'test-data/template.xlsx'));
        
        // Update Score in Persistence
        if (studentsStore[hostname]) {
            studentsStore[hostname].lastScore = `${report.totalScore}/${report.maxScore}`;
            saveDB();
        }

        res.send(report);
    } catch (err) { res.status(500).send({ error: err.message }); }
});

io.on('connection', (socket) => {
    socket.on('agent-report', (data) => {
        const hostname = data.hostname || "Unknown";
        if (!studentsStore[hostname]) {
            studentsStore[hostname] = {
                hostname,
                lastSeen: new Date(),
                processes: [],
                windows: [],
                browsingHistory: [],
                alerts: 0,
                lastScore: '0/0'
            };
        }
        studentsStore[hostname].processes = data.processes || [];
        studentsStore[hostname].windows = data.windows || [];
        studentsStore[hostname].lastSeen = new Date();

        /** @security AI & Communication Detection */
        const banned = [
            'discord', 'whatsapp', 'spotify', 'messenger', 'telegram', 'slack',
            'chatgpt', 'openai', 'claude', 'gemini', 'deepseek', 'ollama', 'copilot',
            'youtube', 'facebook', 'instagram', 'tiktok', 'reddit',
            'chrome', 'edge', 'firefox', 'opera'
        ];

        const activeBanned = (data.windows || []).filter(w => {
            const app = w.app.toLowerCase();
            const title = w.title.toLowerCase();
            return banned.some(b => app.includes(b) || title.includes(b));
        });

        if (activeBanned.length > 0) {
            studentsStore[hostname].alerts++;
            const msg = `WYKRYTO ZABRONIONĄ AKTYWNOŚĆ (AI/COMM): ${activeBanned[0].title}`;
            io.emit('teacher-alert', { id: hostname, msg, type: 'security' });
        }

        saveDB();
        io.emit('teacher-update', { id: hostname, ...data });
    });

    socket.on('agent-screenshot', (data) => {
        io.emit('teacher-screenshot', { id: data.hostname, img: data.img });
    });

    socket.on('software-audit-report', (data) => {
        io.emit('teacher-audit-report', { id: data.hostname, auditResults: data.auditResults });
    });

    socket.on('security-alert', (data) => {
        if (studentsStore[data.hostname]) {
            studentsStore[data.hostname].alerts++;
            saveDB();
        }
        io.emit('teacher-alert', { id: data.hostname, ...data });
    });

    socket.on('start-task', (data) => {
        currentTask = { ...data, startTime: Date.now() };
        io.emit('task-started', currentTask);
    });

    socket.on('teacher-send-msg', (data) => {
        io.emit('teacher-message', data);
    });
});

bonjour.publish({ name: 'EduTrack Central Server', type: 'http', port: PORT });
httpServer.listen(PORT, () => console.log(`[EduTrack] Server live on port ${PORT}`));
