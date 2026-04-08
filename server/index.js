const cluster = require('cluster');
const os      = require('os');

// ── Horizontal scaling: run one worker per CPU core when CLUSTER=true ──────
if (process.env.CLUSTER === 'true' && cluster.isPrimary) {
    const numWorkers = parseInt(process.env.WORKERS || os.cpus().length, 10);
    console.log(`[EduTrack] Primary process (PID ${process.pid}) — spawning ${numWorkers} workers.`);
    for (let i = 0; i < numWorkers; i++) cluster.fork();
    cluster.on('exit', (worker, code) => {
        console.warn(`[EduTrack] Worker ${worker.process.pid} exited (code ${code}) — restarting.`);
        cluster.fork();
    });
    // Primary process does not run the server
    return; // eslint-disable-line no-unreachable
}

const express = require('express');
const fileUpload = require('express-fileupload');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const session = require('express-session');
const { RedisStore } = require('connect-redis');
const { Bonjour } = require('bonjour-service');
const path = require('path');
const cors = require('cors');
const ExcelLogicChecker = require('./src/logic/excel-checker');
const gradingService  = require('./src/logic/grading-service');
const pluginLoader    = require('./src/logic/plugin-loader');
const backupService   = require('./src/logic/backup-service');
const networkLockdown = require('./src/logic/network-lockdown');
const ocrService      = require('./src/logic/ocr-service');
const ollamaClient    = require('./src/logic/ollama-client');
const logger          = require('./src/middleware/logger');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs-extra');
require('dotenv').config();

const app = express();

// ── TLS / HTTPS support ────────────────────────────────────────────────────
// Set TLS_CERT and TLS_KEY env vars to paths of PEM files to enable HTTPS.
// When not set the server falls back to plain HTTP (development default).
let httpServer;
if (process.env.TLS_CERT && process.env.TLS_KEY) {
    try {
        const tlsOptions = {
            cert: fs.readFileSync(process.env.TLS_CERT),
            key:  fs.readFileSync(process.env.TLS_KEY)
        };
        httpServer = https.createServer(tlsOptions, app);
        console.log('[EduTrack] TLS enabled — WebSocket connections are encrypted.');
    } catch (e) {
        console.error('[EduTrack] Failed to load TLS certificates, falling back to HTTP:', e.message);
        httpServer = http.createServer(app);
    }
} else {
    httpServer = http.createServer(app);
}

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
const excelChecker = new ExcelLogicChecker();
const prisma = new PrismaClient();
const PORT = parseInt(process.env.PORT || '8080', 10);
const isHeadless = process.argv.includes('--headless');

// In-memory store for collaborative grading reviews (persists for session lifetime)
// Key: hostname; Value: Array<{ teacherId, comment, grade, ts }>
const gradingReviews = {};

// In-memory store for exam template marketplace entries
const marketplaceTemplates = [];

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
app.use(logger.expressMiddleware);

// Simple in-memory rate limiter for authenticated mutation endpoints
const rateLimitMap = new Map();
function rateLimit(maxRequests, windowMs) {
    return (req, res, next) => {
        const key = req.headers['authorization'] || req.ip;
        const now = Date.now();
        const entry = rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs };
        if (now > entry.resetAt) {
            entry.count = 0;
            entry.resetAt = now + windowMs;
        }
        entry.count++;
        rateLimitMap.set(key, entry);
        if (entry.count > maxRequests) {
            return res.status(429).json({ error: 'Too many requests. Please try again later.' });
        }
        next();
    };
}
const teacherActionLimiter = rateLimit(60, 60 * 1000); // 60 requests per minute per token

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
        const { departmentId } = req.user;
        const students = await prisma.student.findMany({
            where: {
                OR: [
                    { departmentId: departmentId },
                    { departmentId: null } // Show unassigned students to everyone initially?
                                          // Or better: allow teachers to "adopt" them.
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

app.post('/api/students/:hostname/reset-alerts', authMiddleware, teacherActionLimiter, async (req, res) => {
    try {
        const student = await prisma.student.update({
            where: { hostname: req.params.hostname },
            data: { alerts: 0, lastMatchedApp: null }
        });
        const deptRoom = student.departmentId ? `dept-${student.departmentId}` : null;
        const event = { id: req.params.hostname, hostname: req.params.hostname, alerts: 0 };
        if (deptRoom) {
            io.to(deptRoom).emit('student-alerts-reset', event);
        } else {
            io.emit('student-alerts-reset', event);
        }
        res.json({ message: 'Alerts reset.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/students/:hostname/assign-department', authMiddleware, teacherActionLimiter, async (req, res) => {
    try {
        const { departmentId } = req.user;
        const student = await prisma.student.update({
            where: { hostname: req.params.hostname },
            data: { departmentId }
        });
        res.json({ message: `Student assigned to your department.`, student });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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
    const rawHostname = req.body.hostname || `anon_${Date.now()}`;
    const hostname = rawHostname.replace(/[^a-zA-Z0-9_-]/g, '_');
    const testDataDir = path.resolve(__dirname, 'test-data');
    // Resolve full paths and verify they stay within test-data/ to prevent path traversal
    const studentPath  = path.resolve(testDataDir, `submission_${hostname}.xlsx`);
    const plagPath     = path.resolve(testDataDir, `plag_${hostname}.xlsx`);
    const templatePath = path.resolve(testDataDir, 'template.xlsx');
    if (!studentPath.startsWith(testDataDir) || !plagPath.startsWith(testDataDir)) {
        return res.status(400).send({ error: 'Invalid hostname.' });
    }
    try {
        if (req.files && req.files.studentFile) {
            await req.files.studentFile.mv(studentPath);
        } else if (req.body.sheetJson) {
            const workbook = await luckysheetToExcel(req.body.sheetJson);
            await workbook.xlsx.writeFile(studentPath);
        } else return res.status(400).send({ error: 'No data.' });

        if (!fs.existsSync(templatePath)) {
            return res.status(503).send({ error: 'No grading template uploaded yet. Teacher must upload a template first.' });
        }

        const report = await excelChecker.analyze(studentPath, templatePath);

        // Save a permanent copy for plagiarism detection
        await fs.copy(studentPath, plagPath);

        const newScore = `${report.totalScore}/${report.maxScore}`;
        const updatedStudentScore = await prisma.student.update({
            where: { hostname: rawHostname },
            data: { lastScore: newScore }
        }).catch(() => {
            console.log(`[Database] Student ${rawHostname} not found for score update.`);
            return null;
        });

        // Notify teacher panel about the updated score in real-time
        if (updatedStudentScore) {
            const deptRoom = updatedStudentScore.departmentId ? `dept-${updatedStudentScore.departmentId}` : null;
            const scoreEvent = { id: rawHostname, hostname: rawHostname, lastScore: newScore };
            if (deptRoom) {
                io.to(deptRoom).emit('student-score-update', scoreEvent);
            } else {
                io.emit('student-score-update', scoreEvent);
            }
        }

        res.send(report);
    } catch (err) { res.status(500).send({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-FORMAT GRADING ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

const testDataDir = path.resolve(__dirname, 'test-data');

/** Helper: move uploaded file to test-data/, resolve path, guard traversal */
async function saveSubmission(file, hostname, ext) {
    // Validate extension to only allow safe file extensions
    if (!/^[a-zA-Z0-9]{1,10}$/.test(ext)) throw new Error('Invalid file extension.');
    const safe = hostname.replace(/[^a-zA-Z0-9_-]/g, '_');
    const dest = path.resolve(testDataDir, `submission_${safe}.${ext}`);
    if (!dest.startsWith(testDataDir)) throw new Error('Invalid hostname');
    await file.mv(dest);
    return dest;
}

// .docx grading
app.post('/api/check-docx', teacherActionLimiter, async (req, res) => {
    try {
        if (!req.files?.studentFile) return res.status(400).json({ error: 'No studentFile.' });
        const hostname = (req.body.hostname || `anon_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
        const studentPath  = await saveSubmission(req.files.studentFile, hostname, 'docx');
        const templatePath = path.resolve(testDataDir, 'template.docx');
        if (!fs.existsSync(templatePath)) return res.status(503).json({ error: 'No docx template uploaded yet.' });
        const report = await gradingService.analyzeDocx(studentPath, templatePath);
        res.json(report);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Teacher uploads .docx template
app.post('/api/upload-template-docx', authMiddleware, teacherActionLimiter, async (req, res) => {
    if (!req.files?.template) return res.status(400).send('No template.');
    await req.files.template.mv(path.join(testDataDir, 'template.docx'));
    res.json({ message: 'DOCX template updated.' });
});

// .pptx grading
app.post('/api/check-pptx', teacherActionLimiter, async (req, res) => {
    try {
        if (!req.files?.studentFile) return res.status(400).json({ error: 'No studentFile.' });
        const hostname = (req.body.hostname || `anon_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
        const studentPath  = await saveSubmission(req.files.studentFile, hostname, 'pptx');
        const templatePath = path.resolve(testDataDir, 'template.pptx');
        if (!fs.existsSync(templatePath)) return res.status(503).json({ error: 'No pptx template uploaded yet.' });
        const report = gradingService.analyzePptx(studentPath, templatePath);
        res.json(report);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/upload-template-pptx', authMiddleware, teacherActionLimiter, async (req, res) => {
    if (!req.files?.template) return res.status(400).send('No template.');
    await req.files.template.mv(path.join(testDataDir, 'template.pptx'));
    res.json({ message: 'PPTX template updated.' });
});

// .sql grading
app.post('/api/check-sql', teacherActionLimiter, async (req, res) => {
    try {
        if (!req.files?.studentFile) return res.status(400).json({ error: 'No studentFile.' });
        const hostname = (req.body.hostname || `anon_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
        const studentPath  = await saveSubmission(req.files.studentFile, hostname, 'sql');
        const templatePath = path.resolve(testDataDir, 'template.sql');
        if (!fs.existsSync(templatePath)) return res.status(503).json({ error: 'No sql template uploaded yet.' });
        const report = await gradingService.analyzeSQL(studentPath, templatePath);
        res.json(report);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/upload-template-sql', authMiddleware, teacherActionLimiter, async (req, res) => {
    if (!req.files?.template) return res.status(400).send('No template.');
    await req.files.template.mv(path.join(testDataDir, 'template.sql'));
    res.json({ message: 'SQL template updated.' });
});

// Packet Tracer (.pkt) grading
app.post('/api/check-pkt', teacherActionLimiter, async (req, res) => {
    try {
        if (!req.files?.studentFile) return res.status(400).json({ error: 'No studentFile.' });
        const hostname = (req.body.hostname || `anon_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
        const studentPath  = await saveSubmission(req.files.studentFile, hostname, 'pkt');
        const templatePath = path.resolve(testDataDir, 'template.pkt');
        if (!fs.existsSync(templatePath)) return res.status(503).json({ error: 'No pkt template uploaded yet.' });
        const report = gradingService.analyzePkt(studentPath, templatePath);
        res.json(report);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/upload-template-pkt', authMiddleware, teacherActionLimiter, async (req, res) => {
    if (!req.files?.template) return res.status(400).send('No template.');
    await req.files.template.mv(path.join(testDataDir, 'template.pkt'));
    res.json({ message: 'PKT template updated.' });
});

// SVG / XCF file grading
app.post('/api/check-graphics', teacherActionLimiter, async (req, res) => {
    try {
        if (!req.files?.studentFile) return res.status(400).json({ error: 'No studentFile.' });
        const fmt = (req.body.format || 'svg').toLowerCase();
        if (!['svg', 'xcf'].includes(fmt)) return res.status(400).json({ error: 'format must be svg or xcf.' });
        const hostname = (req.body.hostname || `anon_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
        const studentPath  = await saveSubmission(req.files.studentFile, hostname, fmt);
        const templatePath = path.resolve(testDataDir, `template.${fmt}`);
        if (!fs.existsSync(templatePath)) return res.status(503).json({ error: `No ${fmt} template uploaded yet.` });
        const report = gradingService.analyzeGraphicsFile(studentPath, templatePath, fmt);
        res.json(report);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// C++ / Python code grading (with optional AI style check via Ollama)
app.post('/api/check-code', teacherActionLimiter, async (req, res) => {
    try {
        if (!req.files?.studentFile) return res.status(400).json({ error: 'No studentFile.' });
        const lang = (req.body.language || 'python').toLowerCase();
        if (!['python', 'cpp', 'c'].includes(lang)) return res.status(400).json({ error: 'language must be python, cpp or c.' });
        const hostname = (req.body.hostname || `anon_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
        const ext = lang === 'python' ? 'py' : 'cpp';
        const studentPath = await saveSubmission(req.files.studentFile, hostname, ext);
        const opts = { input: req.body.input, expectedOutput: req.body.expectedOutput };

        let report;
        if (lang === 'python') {
            report = await gradingService.analyzePython(studentPath, opts);
        } else {
            report = await gradingService.analyzeCpp(studentPath, opts);
        }

        // Optional: AI style check (if Ollama is available and code is short enough)
        if (process.env.AI_GRADING === 'true') {
            const code = await fs.readFile(studentPath, 'utf8');
            const ai   = await ollamaClient.gradeCode(code, lang, req.body.taskDescription || '');
            report.aiGrade = ai;
        }

        res.json(report);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Wireshark (.pcap) capture analysis
app.post('/api/check-pcap', teacherActionLimiter, async (req, res) => {
    try {
        if (!req.files?.studentFile) return res.status(400).json({ error: 'No studentFile.' });
        const hostname = (req.body.hostname || `anon_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
        const studentPath  = await saveSubmission(req.files.studentFile, hostname, 'pcap');
        const templatePath = path.resolve(testDataDir, 'template.pcap');
        if (!fs.existsSync(templatePath)) return res.status(503).json({ error: 'No pcap template uploaded yet.' });
        const criteria = req.body.criteria ? JSON.parse(req.body.criteria) : {};
        const report = gradingService.analyzePcap(studentPath, templatePath, criteria);
        res.json(report);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// COLLABORATIVE GRADING
// ─────────────────────────────────────────────────────────────────────────────

// Get all reviews for a student
app.get('/api/review/:hostname', authMiddleware, (req, res) => {
    const reviews = gradingReviews[req.params.hostname] || [];
    res.json(reviews);
});

// Add a review comment (multiple teachers can review the same student)
app.post('/api/review/:hostname', authMiddleware, (req, res) => {
    const { comment, grade } = req.body;
    if (!comment) return res.status(400).json({ error: 'comment is required.' });
    const review = {
        teacherId:   req.user.id,
        teacherName: req.user.username,
        comment,
        grade: grade || null,
        ts: new Date().toISOString()
    };
    if (!gradingReviews[req.params.hostname]) gradingReviews[req.params.hostname] = [];
    gradingReviews[req.params.hostname].push(review);
    // Notify all teachers in the department
    io.to(`dept-${req.user.departmentId}`).emit('review-added', { hostname: req.params.hostname, review });
    res.status(201).json(review);
});

// Delete a specific review (only author can delete)
app.delete('/api/review/:hostname/:index', authMiddleware, (req, res) => {
    const reviews = gradingReviews[req.params.hostname];
    const idx = parseInt(req.params.index, 10);
    if (!reviews || !reviews[idx]) return res.status(404).json({ error: 'Review not found.' });
    if (reviews[idx].teacherId !== req.user.id) return res.status(403).json({ error: 'Cannot delete another teacher\'s review.' });
    reviews.splice(idx, 1);
    res.json({ message: 'Review deleted.' });
});

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS: PREDICTIVE FAILURE DETECTION & SUMMARISATION
// ─────────────────────────────────────────────────────────────────────────────

// Returns students who are at risk of failing (low score + high alerts)
app.get('/api/analytics/at-risk', authMiddleware, async (req, res) => {
    try {
        const students = await prisma.student.findMany({
            select: { hostname: true, lastScore: true, alerts: true, lastSeen: true }
        });

        const atRisk = students.filter(s => {
            const scoreMatch = s.lastScore ? s.lastScore.match(/(\d+(?:\.\d+)?)\/(\d+)/) : null;
            const pct = scoreMatch ? parseFloat(scoreMatch[1]) / parseFloat(scoreMatch[2]) : 0;
            return (pct < 0.5 && parseFloat(scoreMatch?.[2] || 0) > 0) || s.alerts >= 3;
        }).map(s => {
            const scoreMatch = s.lastScore ? s.lastScore.match(/(\d+(?:\.\d+)?)\/(\d+)/) : null;
            const pct = scoreMatch ? Math.round((parseFloat(scoreMatch[1]) / parseFloat(scoreMatch[2])) * 100) : 0;
            return {
                hostname:  s.hostname,
                lastScore: s.lastScore,
                scorePercent: pct,
                alerts:    s.alerts,
                lastSeen:  s.lastSeen,
                risk:      s.alerts >= 5 ? 'HIGH' : s.alerts >= 3 ? 'MEDIUM' : 'LOW'
            };
        }).sort((a, b) => b.alerts - a.alerts);

        // Emit real-time alert to teachers
        if (atRisk.length > 0) {
            io.emit('at-risk-update', { count: atRisk.length, students: atRisk.slice(0, 5) });
        }

        res.json({ atRisk, total: atRisk.length });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Automatic exam results summarisation
app.get('/api/analytics/summary', authMiddleware, async (req, res) => {
    try {
        const students = await prisma.student.findMany({
            select: { hostname: true, lastScore: true, alerts: true }
        });

        let totalScore = 0, maxPossible = 0, passed = 0, failed = 0;
        students.forEach(s => {
            const match = s.lastScore ? s.lastScore.match(/(\d+(?:\.\d+)?)\/(\d+)/) : null;
            if (match) {
                const got = parseFloat(match[1]);
                const max = parseFloat(match[2]);
                totalScore += got;
                maxPossible += max;
                if (got / max >= 0.5) passed++; else failed++;
            }
        });

        const avgPct = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;
        const totalAlerts = students.reduce((sum, s) => sum + s.alerts, 0);

        const summary = {
            totalStudents:    students.length,
            passed,
            failed,
            avgScorePercent:  avgPct,
            totalAlerts,
            generatedAt:      new Date().toISOString()
        };

        // Optional: AI narrative summary
        if (process.env.AI_GRADING === 'true') {
            summary.narrative = await ollamaClient.summariseResults(students);
        } else {
            const passRate = students.length > 0 ? Math.round((passed / students.length) * 100) : 0;
            summary.narrative = `Egzamin ukończyło ${students.length} uczniów. Zdawalność: ${passRate}%. Średni wynik: ${avgPct}%. Łącznie odnotowano ${totalAlerts} alertów bezpieczeństwa.`;
        }

        res.json(summary);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI-generated custom exam questions
app.post('/api/analytics/generate-exam', authMiddleware, async (req, res) => {
    try {
        const { weakTopics, examType } = req.body;
        if (!weakTopics || !examType) return res.status(400).json({ error: 'weakTopics and examType required.' });
        const questions = await ollamaClient.generateExamQuestions(weakTopics, examType);
        res.json({ questions, aiAvailable: !questions.startsWith('[AI') });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE MARKETPLACE
// ─────────────────────────────────────────────────────────────────────────────

// List available templates in the marketplace
app.get('/api/marketplace', authMiddleware, (req, res) => {
    res.json(marketplaceTemplates);
});

// Publish a template to the marketplace
app.post('/api/marketplace', authMiddleware, async (req, res) => {
    if (!req.files?.template) return res.status(400).json({ error: 'No template file.' });
    const { title, description, subject } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required.' });

    const id = `mkt_${Date.now()}`;
    const ext = path.extname(req.files.template.name) || '.xlsx';
    const destPath = path.join(testDataDir, `marketplace_${id}${ext}`);
    await req.files.template.mv(destPath);

    const entry = {
        id, title, description: description || '', subject: subject || 'General',
        format: ext.slice(1),
        author: req.user.username,
        uploadedAt: new Date().toISOString(),
        filename: path.basename(destPath)
    };
    marketplaceTemplates.push(entry);
    res.status(201).json(entry);
});

// Download a marketplace template
app.get('/api/marketplace/:id/download', authMiddleware, (req, res) => {
    const entry = marketplaceTemplates.find(t => t.id === req.params.id);
    if (!entry) return res.status(404).json({ error: 'Template not found.' });
    const filePath = path.join(testDataDir, entry.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Template file missing.' });
    res.download(filePath, entry.filename);
});

// Delete a marketplace template (author only)
app.delete('/api/marketplace/:id', authMiddleware, (req, res) => {
    const idx = marketplaceTemplates.findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Template not found.' });
    if (marketplaceTemplates[idx].author !== req.user.username) return res.status(403).json({ error: 'Only the author can delete this template.' });
    const [removed] = marketplaceTemplates.splice(idx, 1);
    fs.remove(path.join(testDataDir, removed.filename)).catch(() => {});
    res.json({ message: 'Template removed from marketplace.' });
});

// ─────────────────────────────────────────────────────────────────────────────
// OCR ENDPOINT
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/ocr-scan', authMiddleware, async (req, res) => {
    const { img } = req.body;
    if (!img) return res.status(400).json({ error: 'img (base64) required.' });
    try {
        const result = await ocrService.scanScreenshot(img);
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// AI STATUS
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/ai/status', authMiddleware, async (req, res) => {
    const available = await ollamaClient.isAvailable();
    res.json({ available, model: process.env.OLLAMA_MODEL || 'llama3', url: process.env.OLLAMA_URL || 'http://localhost:11434' });
});

// ─────────────────────────────────────────────────────────────────────────────
// PLUGIN SYSTEM & NETWORK LOCKDOWN (register here so they have access to io)
// ─────────────────────────────────────────────────────────────────────────────

// Load all plugins from the plugins/ directory
pluginLoader.loadAll(app, io, prisma);

// Register network lockdown routes
networkLockdown.registerRoutes(app, io, authMiddleware);

// Start automated database backup schedule
backupService.startSchedule();

io.on('connection', (socket) => {
    socket.on('teacher-auth', (token) => {
        try {
            const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'edutrack-jwt-secret-key-2025');
            socket.join(`dept-${decoded.departmentId}`);
            socket.data.teacherId = decoded.id;
            socket.data.departmentId = decoded.departmentId;
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

        // OCR scan for prohibited text (when OCR is enabled)
        if (process.env.OCR_ENABLED === 'true' && data.img) {
            ocrService.scanScreenshot(data.img).then(result => {
                if (result.hasViolation) {
                    const msg = `OCR wykrył zakazaną treść: ${result.violations.join(', ')}`;
                    logger.warn('ocr_violation', { hostname: data.hostname, violations: result.violations });
                    if (deptRoom) {
                        io.to(deptRoom).emit('teacher-alert', { id: data.hostname, msg, type: 'ocr' });
                    } else {
                        io.emit('teacher-alert', { id: data.hostname, msg, type: 'ocr' });
                    }
                }
            }).catch(() => {});
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
        if (!socket.data.teacherId) {
            console.log('[Socket] Unauthorized start-task attempt blocked');
            return;
        }
        currentTask = { ...data, startTime: Date.now() };
        io.emit('task-started', currentTask);
    });

    socket.on('teacher-send-msg', (data) => {
        if (!socket.data.teacherId) {
            console.log('[Socket] Unauthorized teacher-send-msg attempt blocked');
            return;
        }
        if (data.targetId) {
            io.to(data.targetId).emit('teacher-message', data);
        } else {
            io.emit('teacher-message', data);
        }
    });

    // USB-stick detection: student agent reports inserted removable drives
    socket.on('usb-detected', async (data) => {
        const { hostname, drives } = data;
        if (!hostname || !drives) return;
        const msg = `WYKRYTO NOŚNIK USB: ${drives.join(', ')}`;
        logger.warn('usb_detected', { hostname, drives });

        await prisma.student.update({
            where: { hostname },
            data: { alerts: { increment: 1 } }
        }).catch(() => {});

        const student = await prisma.student.findUnique({ where: { hostname } });
        const deptRoom = student?.departmentId ? `dept-${student.departmentId}` : null;
        const alertPayload = { id: hostname, msg, type: 'usb', drives };
        if (deptRoom) {
            io.to(deptRoom).emit('teacher-alert', alertPayload);
        } else {
            io.emit('teacher-alert', alertPayload);
        }
    });

    // Mouse behavior analysis: student agent reports suspicious mouse movement stats
    socket.on('mouse-behavior', async (data) => {
        const { hostname, speedVariance, directionChanges, isNervous } = data;
        if (!hostname) return;
        if (isNervous) {
            const msg = `WYKRYTO NERWOWY RUCH MYSZY (${directionChanges} zmiany kierunku, wariancja prędkości: ${Math.round(speedVariance)})`;
            logger.info('mouse_behavior_alert', { hostname, speedVariance, directionChanges });
            const student = await prisma.student.findUnique({ where: { hostname } });
            const deptRoom = student?.departmentId ? `dept-${student.departmentId}` : null;
            const alertPayload = { id: hostname, msg, type: 'mouse_behavior' };
            if (deptRoom) {
                io.to(deptRoom).emit('teacher-alert', alertPayload);
            } else {
                io.emit('teacher-alert', alertPayload);
            }
        }
    });

    // Network lockdown: student agent applies/removes local firewall rules and confirms
    socket.on('lockdown-status', (data) => {
        const { hostname, active } = data;
        logger.info('lockdown_status', { hostname, active });
    });
});

if (!isHeadless) {
    bonjour.publish({ name: 'EduTrack Central Server', type: 'http', port: PORT });
}
httpServer.listen(PORT, () => console.log(`[EduTrack] Server live on port ${PORT}${isHeadless ? ' (Headless)' : ''}`));
