const express = require('express');
const fileUpload = require('express-fileupload');
const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const session = require('express-session');
const { RedisStore } = require('connect-redis');
const { Bonjour } = require('bonjour-service');
const path = require('path');
const cors = require('cors');
const ExcelLogicChecker = require('./src/logic/excel-checker');
const { PrismaClient } = require('@prisma/client');
const PluginLoader = require('./src/plugins/loader');
require('dotenv').config();

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: { origin: '*', maxHttpBufferSize: 1e7 },
    compression: true
});

// Redis setup for Socket.io and Sessions
const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
const subClient = redisClient.duplicate();

Promise.all([redisClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(redisClient, subClient));
    console.log('[EduTrack] Redis Adapter for Socket.io connected.');
}).catch(err => {
    console.error('[EduTrack] Redis connection error:', err);
});

const bonjour = new Bonjour();
const fs = require('fs-extra');
const excelChecker = new ExcelLogicChecker();
const prisma = new PrismaClient();
const PORT = 8080;
const ADMIN_PASS = 'edutrack2025';
const isHeadless = process.argv.includes('--headless');

if (isHeadless) console.log('[EduTrack] Starting in HEADLESS mode.');

// Authentication
const authRoutes = require('./src/routes/auth');
const authMiddleware = require('./src/middleware/auth');

let currentTask = {
    title: "Egzamin: Arkusz Kalkulacyjny",
    description: "Zadanie 1: Oblicz sumę w A3.\nZadanie 2: Oblicz średnią w B5.",
    type: "none",
    startTime: Date.now()
};

/** @guard Migration Step */
const migrateData = require('./src/migrate');
migrateData().then(() => console.log('[EduTrack] Data migration check finished.'));

const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(fileUpload());

// Session setup with Redis
app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET || 'edutrack-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
}));

app.use(express.static(path.join(__dirname, 'public')));

/** @guard Admin Password Check (DEPRECATED - Use Login) */
app.use('/admin', (req, res, next) => {
    // We now use JWT in the frontend, so we don't strictly protect the .html file here
    // unless we want to do server-side session checks.
    // For now, let the frontend handle the redirect if the token is missing.
    next();
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));

app.use('/api/auth', authRoutes);

app.get('/api/current-task', (req, res) => res.json(currentTask));

app.get('/api/marketplace/templates', authMiddleware, async (req, res) => {
    const featured = [
        { id: 't1', name: 'Zadanie: Arkusz Budżetowy v1.0', author: 'EduTrack Pro Team', stars: 4.8 },
        { id: 't2', name: 'Egzamin INF.02: Sieci LAN', author: 'Jan Kowalski (ZST)', stars: 4.2 },
        { id: 't3', name: 'Programowanie: C++ Struktury', author: 'ZSP Nr 5', stars: 4.5 }
    ];
    res.json(featured);
});

app.post('/api/marketplace/download', authMiddleware, async (req, res) => {
    const { templateId } = req.body;
    console.log(`[Marketplace] Teacher ${req.user.username} downloaded template ${templateId}`);
    res.json({ message: "Szablon zainstalowany pomyślnie i jest gotowy do użycia." });
});

app.get('/api/leaderboard', async (req, res) => {
    try {
        const students = await prisma.student.findMany({
            select: { hostname: true, lastScore: true, alerts: true }
        });

        const leaderboard = students.map(s => {
            const scoreMatch = s.lastScore ? s.lastScore.match(/(\d+)\/(\d+)/) : null;
            const points = scoreMatch ? parseFloat(scoreMatch[1]) : 0;
            const penalty = s.alerts * 0.5;
            return {
                hostname: s.hostname,
                points: Math.max(0, points - penalty),
                rawScore: s.lastScore || '0/0',
                alerts: s.alerts
            };
        }).sort((a, b) => b.points - a.points);

        res.json(leaderboard);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

app.get('/api/students', authMiddleware, async (req, res) => {
    try {
        const { departmentId, organizationId } = req.user;
        const students = await prisma.student.findMany({
            where: {
                OR: [
                    { departmentId: departmentId },
                    {
                        AND: [
                            { departmentId: null },
                            organizationId ? { department: { organizationId: organizationId } } : {}
                        ]
                    }
                ]
            },
            include: { processes: true, windows: true }
        });
        res.json(students);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

app.post('/api/upload-template', authMiddleware, async (req, res) => {
    if (!req.files || !req.files.template) return res.status(400).send('No template.');
    const templatePath = path.join(__dirname, 'test-data/template.xlsx');
    await req.files.template.mv(templatePath);
    res.send('Template updated.');
});

app.get('/api/report/:hostname/pdf', authMiddleware, async (req, res) => {
    try {
        const student = await prisma.student.findUnique({
            where: { hostname: req.params.hostname },
            include: { windows: true, processes: true }
        });
        if (!student) return res.status(404).send('Student not found');

        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=report_${student.hostname}.pdf`);
        doc.pipe(res);

        doc.fontSize(20).text(`CHEAT EVIDENCE REPORT: ${student.hostname}`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated at: ${new Date().toLocaleString()}`);
        doc.text(`Last Seen: ${student.lastSeen.toLocaleString()}`);
        doc.text(`Total Alerts: ${student.alerts}`);
        doc.text(`Final Score: ${student.lastScore || 'N/A'}`);
        doc.moveDown();

        doc.fontSize(16).text('Active Windows Evidence:');
        student.windows.forEach(w => {
            doc.fontSize(10).text(`- ${w.title} (App: ${w.app || 'N/A'})`);
        });

        doc.end();
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

app.get('/api/certificate/:hostname', authMiddleware, async (req, res) => {
    try {
        const student = await prisma.student.findUnique({ where: { hostname: req.params.hostname } });
        if (!student) return res.status(404).send('Student not found');

        const scoreMatch = student.lastScore ? student.lastScore.match(/(\d+)\/(\d+)/) : null;
        if (!scoreMatch || parseInt(scoreMatch[1]) < (parseInt(scoreMatch[2]) * 0.5)) {
            return res.status(400).send('Student did not pass.');
        }

        const doc = new PDFDocument({ layout: 'landscape' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=cert_${student.hostname}.pdf`);
        doc.pipe(res);

        doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke();
        doc.fontSize(40).text('CERTIFICATE OF ACHIEVEMENT', { align: 'center' }).moveDown();
        doc.fontSize(20).text('This is to certify that', { align: 'center' }).moveDown();
        doc.fontSize(30).text(student.hostname, { align: 'center', underline: true }).moveDown();
        doc.fontSize(20).text(`Has successfully passed the exam with score: ${student.lastScore}`, { align: 'center' }).moveDown();
        doc.fontSize(15).text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' });

        doc.end();
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

app.get('/api/report/:hostname', authMiddleware, async (req, res) => {
    try {
        const student = await prisma.student.findUnique({
            where: { hostname: req.params.hostname },
            include: { windows: true, processes: true }
        });
        if (!student) return res.status(404).send('Student not found');

        const report = {
            title: `CHEAT EVIDENCE REPORT: ${student.hostname}`,
            generatedAt: new Date().toISOString(),
            student: {
                hostname: student.hostname,
                lastSeen: student.lastSeen,
                alerts: student.alerts,
                lastScore: student.lastScore
            },
            evidence: {
                activeWindows: student.windows.map(w => ({ title: w.title, app: w.app })),
                alertsCount: student.alerts
            }
        };

        res.json(report);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

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

app.post('/api/detect-plagiarism', authMiddleware, async (req, res) => {
    try {
        const { studentA, studentB } = req.body;
        const fileA = path.join(__dirname, `test-data/plag_${studentA}.xlsx`);
        const fileB = path.join(__dirname, `test-data/plag_${studentB}.xlsx`);

        if (!fs.existsSync(fileA) || !fs.existsSync(fileB)) {
            return res.status(404).send({ error: "One or both student files not found for plagiarism check." });
        }

        const report = await excelChecker.detectPlagiarism(fileA, fileB);
        res.json(report);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

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

        await prisma.student.update({
            where: { hostname: hostname },
            data: { lastScore: `${report.totalScore}/${report.maxScore}` }
        }).catch(() => console.log(`[Database] Student ${hostname} not found for score update.`));

        res.send(report);
    } catch (err) { res.status(500).send({ error: err.message }); }
});

io.on('connection', (socket) => {
    socket.on('teacher-auth', (token) => {
        try {
            const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'edutrack-jwt-secret-key-2025');
            socket.join(`dept-${decoded.departmentId}`);
            if (decoded.organizationId) socket.join(`org-${decoded.organizationId}`);
            console.log(`[Socket] Teacher ${decoded.username} joined dept-${decoded.departmentId}`);
        } catch (err) {
            console.log('[Socket] Teacher auth failed');
        }
    });

    socket.on('agent-report', async (data) => {
        const hostname = data.hostname || "Unknown";
        socket.join(hostname);

        /** @security AI & Communication Detection */
        const banned = [
            'discord', 'whatsapp', 'spotify', 'messenger', 'telegram', 'slack',
            'chatgpt', 'openai', 'claude', 'gemini', 'deepseek', 'ollama', 'copilot',
            'youtube', 'facebook', 'instagram', 'tiktok', 'reddit',
            'chrome', 'edge', 'firefox', 'opera'
        ];
        const activeBanned = (data.windows || []).filter(w => {
            if (!w.app) return false;
            const app = w.app.toLowerCase();
            const title = (w.title || '').toLowerCase();
            return banned.some(b => app.includes(b) || title.includes(b));
        });

        let alertIncrement = 0;
        let lastMatchedApp = null;

        // Fetch current student state
        const student = await prisma.student.findUnique({ where: { hostname: hostname } });

        if (activeBanned.length > 0) {
            const currentApp = activeBanned[0].app;
            if (!student || student.lastMatchedApp !== currentApp) {
                alertIncrement = 1;
                lastMatchedApp = currentApp;
                const msg = `WYKRYTO ZABRONIONĄ AKTYWNOŚĆ (AI/COMM): ${activeBanned[0].title}`;
                io.emit('teacher-alert', { id: hostname, msg, type: 'security' });
            } else {
                lastMatchedApp = student.lastMatchedApp;
            }
        }

        // Check for high alert threshold
        if (student && student.alerts >= 10 && student.lastMatchedApp !== 'BLACK_SCREEN') {
            io.to(hostname).emit('teacher-message', {
                targetId: hostname,
                msg: "SYSTEM ZABLOKOWANY - PRZEKROCZONO LIMIT ALERTÓW",
                type: 'black-screen'
            });
            await prisma.student.update({
                where: { hostname: hostname },
                data: { lastMatchedApp: 'BLACK_SCREEN' }
            });
        }

        // Upsert student with updated stats
        const updatedStudent = await prisma.student.upsert({
            where: { hostname: hostname },
            update: {
                lastSeen: new Date(),
                alerts: { increment: alertIncrement },
                lastMatchedApp: lastMatchedApp,
                processes: {
                    deleteMany: {},
                    create: (data.processes || []).map(p => ({ name: typeof p === 'string' ? p : (p.name || 'unknown') }))
                },
                windows: {
                    deleteMany: {},
                    create: (data.windows || []).map(w => ({ title: w.title || 'Untitled', app: w.app || null }))
                }
            },
            create: {
                id: hostname,
                hostname: hostname,
                lastSeen: new Date(),
                alerts: alertIncrement,
                lastMatchedApp: lastMatchedApp,
                processes: {
                    create: (data.processes || []).map(p => ({ name: typeof p === 'string' ? p : (p.name || 'unknown') }))
                },
                windows: {
                    create: (data.windows || []).map(w => ({ title: w.title || 'Untitled', app: w.app || null }))
                }
            },
            include: { processes: true, windows: true }
        });

        const deptRoom = updatedStudent.departmentId ? `dept-${updatedStudent.departmentId}` : null;
        if (deptRoom) {
            io.to(deptRoom).emit('teacher-update', { id: hostname, ...data, alerts: updatedStudent.alerts });
        } else {
            // If student has no department, maybe broadcast to a general room or all?
            // For now, let's broadcast to all teachers for "adoption"
            io.emit('teacher-update', { id: hostname, ...data, alerts: updatedStudent.alerts });
        }
    });

    socket.on('agent-screenshot', async (data) => {
        const student = await prisma.student.findUnique({ where: { hostname: data.hostname } });
        const deptRoom = student?.departmentId ? `dept-${student.departmentId}` : null;
        if (deptRoom) {
            io.to(deptRoom).emit('teacher-screenshot', { id: data.hostname, img: data.img });
        } else {
            io.emit('teacher-screenshot', { id: data.hostname, img: data.img });
        }
    });

    socket.on('software-audit-report', async (data) => {
        const student = await prisma.student.findUnique({ where: { hostname: data.hostname } });
        const deptRoom = student?.departmentId ? `dept-${student.departmentId}` : null;
        if (deptRoom) {
            io.to(deptRoom).emit('teacher-audit-report', { id: data.hostname, auditResults: data.auditResults });
        } else {
            io.emit('teacher-audit-report', { id: data.hostname, auditResults: data.auditResults });
        }
    });

    socket.on('security-alert', async (data) => {
        await prisma.student.update({
            where: { hostname: data.hostname },
            data: { alerts: { increment: 1 } }
        }).catch(() => {});

        const student = await prisma.student.findUnique({ where: { hostname: data.hostname } });
        const deptRoom = student?.departmentId ? `dept-${student.departmentId}` : null;
        if (deptRoom) {
            io.to(deptRoom).emit('teacher-alert', { id: data.hostname, ...data });
        } else {
            io.emit('teacher-alert', { id: data.hostname, ...data });
        }
    });

    socket.on('start-task', (data) => {
        currentTask = { ...data, startTime: Date.now() };
        io.emit('task-started', currentTask);
    });

    socket.on('teacher-send-msg', (data) => {
        if (data.targetId) {
            io.to(data.targetId).emit('teacher-message', data);
        } else {
            io.emit('teacher-message', data);
        }
    });
});

if (!isHeadless) {
    bonjour.publish({ name: 'EduTrack Central Server', type: 'http', port: PORT });
}
// Load Plugins
const pluginLoader = new PluginLoader(app, io, prisma);
pluginLoader.loadPlugins(path.join(__dirname, 'plugins')).then(() => {
    console.log('[EduTrack] All plugins loaded.');
});

httpServer.listen(PORT, () => console.log(`[EduTrack] Server live on port ${PORT}${isHeadless ? ' (Headless)' : ''}`));
