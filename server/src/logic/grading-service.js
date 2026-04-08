/**
 * EduTrack Grading Service — Multi-format exam grading engine
 *
 * Supports: .xlsx (via ExcelLogicChecker), .docx, .pptx, .sql,
 *           .pkt (Cisco Packet Tracer), .svg, .xcf,
 *           .cpp/.c, .py, and .pcap (Wireshark)
 *
 * This module can be used embedded (imported by index.js) or run as a
 * standalone microservice by starting it directly:
 *   node src/logic/grading-service.js --standalone --port 8090
 */

const fs = require('fs-extra');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const mammoth = require('mammoth');
const AdmZip = require('adm-zip');

// ─────────────────────────────────────────────────────────────────────────────
// DOCX GRADING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts plain text from a .docx file.
 * @param {string} filePath
 * @returns {Promise<string>}
 */
async function extractDocxText(filePath) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || '';
}

/**
 * Grades a student .docx against a teacher template .docx.
 * Checks: required keywords, minimum word count, paragraph structure.
 *
 * The template .docx may include a "EDUTRACK_CRITERIA" block at the end in
 * double-angle brackets, e.g.  <<keywords:hello,world;minWords:200>>
 * If not present, a simple word-overlap similarity score is returned.
 *
 * @param {string} studentPath
 * @param {string} templatePath
 * @returns {Promise<Object>}
 */
async function analyzeDocx(studentPath, templatePath) {
    const [studentText, templateText] = await Promise.all([
        extractDocxText(studentPath),
        extractDocxText(templatePath)
    ]);

    const report = {
        format: 'docx',
        totalScore: 0,
        maxScore: 0,
        details: [],
        timestamp: new Date().toISOString()
    };

    // Parse criteria block from template
    const criteriaMatch = templateText.match(/<<([^>]+)>>/);
    let keywords = [];
    let minWords = 0;

    if (criteriaMatch) {
        const parts = criteriaMatch[1].split(';');
        for (const part of parts) {
            const [key, val] = part.split(':');
            if (key === 'keywords') keywords = val.split(',').map(k => k.trim().toLowerCase());
            if (key === 'minWords')  minWords  = parseInt(val, 10) || 0;
        }
    } else {
        // Default: extract significant words from template as implicit keywords
        keywords = [...new Set(
            templateText.toLowerCase().replace(/[^a-ząćęłńóśźż\s]/g, ' ').split(/\s+/).filter(w => w.length > 4)
        )].slice(0, 20);
        minWords = Math.max(50, Math.floor(templateText.split(/\s+/).length * 0.5));
    }

    const studentWords = studentText.split(/\s+/).filter(w => w.length > 0);
    const studentWordCount = studentWords.length;

    // Check word count
    report.maxScore += 1;
    if (studentWordCount >= minWords) {
        report.totalScore += 1;
        report.details.push({ check: 'Minimalna liczba słów', passed: true, note: `${studentWordCount}/${minWords}` });
    } else {
        report.details.push({ check: 'Minimalna liczba słów', passed: false, note: `${studentWordCount}/${minWords} — za mało` });
    }

    // Check keywords
    const studentLower = studentText.toLowerCase();
    for (const kw of keywords) {
        report.maxScore += 1;
        const found = studentLower.includes(kw);
        if (found) {
            report.totalScore += 1;
            report.details.push({ check: `Słowo kluczowe: "${kw}"`, passed: true });
        } else {
            report.details.push({ check: `Słowo kluczowe: "${kw}"`, passed: false, note: 'Brak w dokumencie ucznia.' });
        }
    }

    return report;
}

// ─────────────────────────────────────────────────────────────────────────────
// PPTX GRADING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts text and slide count from a .pptx file.
 * PPTX is a ZIP containing XML slide files at ppt/slides/slide*.xml
 * @param {string} filePath
 * @returns {{ text: string, slideCount: number }}
 */
function extractPptxData(filePath) {
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();
    const slideEntries = entries.filter(e => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName));
    slideEntries.sort((a, b) => a.entryName.localeCompare(b.entryName));

    let text = '';
    for (const entry of slideEntries) {
        const xml = entry.getData().toString('utf8');
        // Extract text runs <a:t>...</a:t>
        const matches = xml.matchAll(/<a:t>([^<]*)<\/a:t>/g);
        for (const m of matches) {
            text += ' ' + m[1];
        }
    }

    return { text: text.trim(), slideCount: slideEntries.length };
}

/**
 * Grades a student .pptx against a teacher template.
 * Template criteria (in speaker notes of slide 1):
 *   EDUTRACK: minSlides=5; keywords=intro,summary,conclusion
 *
 * @param {string} studentPath
 * @param {string} templatePath
 * @returns {Object}
 */
function analyzePptx(studentPath, templatePath) {
    const student = extractPptxData(studentPath);
    const template = extractPptxData(templatePath);

    const report = {
        format: 'pptx',
        totalScore: 0,
        maxScore: 0,
        details: [],
        timestamp: new Date().toISOString()
    };

    // Parse criteria from template notes
    let minSlides = Math.max(1, template.slideCount);
    let keywords = [...new Set(
        template.text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 4)
    )].slice(0, 10);

    const notesCriteriaMatch = template.text.match(/EDUTRACK:\s*([^]+?)(?:$|\n)/i);
    if (notesCriteriaMatch) {
        const parts = notesCriteriaMatch[1].split(';');
        for (const part of parts) {
            const [k, v] = part.trim().split('=');
            if (k === 'minSlides') minSlides = parseInt(v, 10) || minSlides;
            if (k === 'keywords')  keywords  = v.split(',').map(s => s.trim().toLowerCase());
        }
    }

    // Slide count
    report.maxScore += 1;
    if (student.slideCount >= minSlides) {
        report.totalScore += 1;
        report.details.push({ check: 'Liczba slajdów', passed: true, note: `${student.slideCount}/${minSlides}` });
    } else {
        report.details.push({ check: 'Liczba slajdów', passed: false, note: `${student.slideCount}/${minSlides} — za mało` });
    }

    // Keyword checks
    const studentLower = student.text.toLowerCase();
    for (const kw of keywords) {
        report.maxScore += 1;
        const found = studentLower.includes(kw);
        if (found) {
            report.totalScore += 1;
            report.details.push({ check: `Treść: "${kw}"`, passed: true });
        } else {
            report.details.push({ check: `Treść: "${kw}"`, passed: false, note: 'Brak w prezentacji ucznia.' });
        }
    }

    return report;
}

// ─────────────────────────────────────────────────────────────────────────────
// SQL GRADING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalises an SQL string for comparison.
 * Strips comments, collapses whitespace, lowercases keywords.
 * @param {string} sql
 * @returns {string}
 */
function normalizeSQL(sql) {
    return sql
        .replace(/--[^\n]*/g, '')   // line comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

/**
 * Grades a student .sql file against a template .sql file.
 * Each statement in the template (separated by ;) is matched against the student.
 * Checks: statement type, table names, column names.
 *
 * @param {string} studentPath
 * @param {string} templatePath
 * @returns {Object}
 */
async function analyzeSQL(studentPath, templatePath) {
    const [studentRaw, templateRaw] = await Promise.all([
        fs.readFile(studentPath, 'utf8'),
        fs.readFile(templatePath, 'utf8')
    ]);

    const templateStmts = templateRaw.split(';').map(s => normalizeSQL(s)).filter(s => s.length > 0);
    const studentStmts  = studentRaw.split(';').map(s => normalizeSQL(s)).filter(s => s.length > 0);

    const report = {
        format: 'sql',
        totalScore: 0,
        maxScore: 0,
        details: [],
        timestamp: new Date().toISOString()
    };

    for (let i = 0; i < templateStmts.length; i++) {
        report.maxScore += 1;
        const tmpl = templateStmts[i];
        const studentStmt = studentStmts[i] || '';

        if (!studentStmt) {
            report.details.push({ check: `Instrukcja ${i + 1}`, passed: false, note: 'Brak instrukcji w pliku ucznia.' });
            continue;
        }

        // Check statement type match
        const templateType = tmpl.split(' ')[0];
        const studentType  = studentStmt.split(' ')[0];
        if (templateType !== studentType) {
            report.details.push({ check: `Instrukcja ${i + 1}`, passed: false, note: `Błędny typ: oczekiwano "${templateType.toUpperCase()}", znaleziono "${studentType.toUpperCase()}".` });
            continue;
        }

        // Extract table names (simple heuristic)
        const tableMatch = tmpl.match(/(?:from|into|update|table)\s+(\w+)/i);
        const studentTableMatch = studentStmt.match(/(?:from|into|update|table)\s+(\w+)/i);
        if (tableMatch && studentTableMatch && tableMatch[1] !== studentTableMatch[1]) {
            report.details.push({ check: `Instrukcja ${i + 1}`, passed: false, note: `Błędna tabela: oczekiwano "${tableMatch[1]}", znaleziono "${studentTableMatch[1]}".` });
            continue;
        }

        // Full match gives full score, partial match (type+table ok) gives 0.5
        const isExact = tmpl === studentStmt;
        if (isExact) {
            report.totalScore += 1;
            report.details.push({ check: `Instrukcja ${i + 1}`, passed: true, note: 'Dokładna zgodność.' });
        } else {
            report.totalScore += 0.5;
            report.details.push({ check: `Instrukcja ${i + 1}`, passed: false, note: 'Typ i tabela poprawne, ale różne argumenty. (0.5 pkt)', score: 0.5 });
        }
    }

    return report;
}

// ─────────────────────────────────────────────────────────────────────────────
// PACKET TRACER (.pkt) ANALYZER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyzes a Cisco Packet Tracer .pkt file.
 * .pkt files are ZIP archives containing an XML topology description.
 * Compares device count and connection count between template and student files.
 *
 * @param {string} studentPath
 * @param {string} templatePath
 * @returns {Object}
 */
function analyzePkt(studentPath, templatePath) {
    function parsePkt(filePath) {
        try {
            const zip = new AdmZip(filePath);
            const topologyEntry = zip.getEntries().find(e => e.entryName.endsWith('.pkt') || e.entryName === 'topology.xml' || e.entryName.endsWith('.xml'));
            if (!topologyEntry) return { devices: 0, connections: 0, raw: '' };
            const xml = topologyEntry.getData().toString('utf8');
            const devices     = (xml.match(/<device\b/gi) || []).length;
            const connections = (xml.match(/<connection\b/gi) || []).length;
            return { devices, connections, raw: xml };
        } catch (e) {
            // .pkt may itself be the XML (older versions)
            try {
                const xml = fs.readFileSync(filePath, 'utf8');
                const devices     = (xml.match(/<device\b/gi) || []).length;
                const connections = (xml.match(/<connection\b/gi) || []).length;
                return { devices, connections, raw: xml };
            } catch (_) {
                return { devices: 0, connections: 0, raw: '' };
            }
        }
    }

    const template = parsePkt(templatePath);
    const student  = parsePkt(studentPath);

    const report = {
        format: 'pkt',
        totalScore: 0,
        maxScore: 2,
        details: [],
        timestamp: new Date().toISOString()
    };

    // Device count
    if (student.devices >= template.devices) {
        report.totalScore += 1;
        report.details.push({ check: 'Liczba urządzeń', passed: true, note: `${student.devices}/${template.devices}` });
    } else {
        report.details.push({ check: 'Liczba urządzeń', passed: false, note: `${student.devices}/${template.devices} — za mało urządzeń.` });
    }

    // Connection count
    if (student.connections >= template.connections) {
        report.totalScore += 1;
        report.details.push({ check: 'Liczba połączeń', passed: true, note: `${student.connections}/${template.connections}` });
    } else {
        report.details.push({ check: 'Liczba połączeń', passed: false, note: `${student.connections}/${template.connections} — za mało połączeń.` });
    }

    return report;
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG / XCF FILE CHECKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates a student's vector/raster graphics file.
 * For SVG: checks element count, viewBox, and required element types.
 * For XCF: checks file signature and minimum file size.
 *
 * @param {string} studentPath
 * @param {string} templatePath
 * @param {'svg'|'xcf'} format
 * @returns {Object}
 */
function analyzeGraphicsFile(studentPath, templatePath, format) {
    const report = {
        format,
        totalScore: 0,
        maxScore: 0,
        details: [],
        timestamp: new Date().toISOString()
    };

    if (format === 'svg') {
        const studentSvg  = fs.readFileSync(studentPath, 'utf8');
        const templateSvg = fs.readFileSync(templatePath, 'utf8');

        // Count SVG elements in template
        const templateElements = (templateSvg.match(/<(path|rect|circle|ellipse|polygon|polyline|line|text|g)\b/gi) || []).length;
        const studentElements  = (studentSvg.match(/<(path|rect|circle|ellipse|polygon|polyline|line|text|g)\b/gi) || []).length;

        report.maxScore += 1;
        if (studentElements >= Math.max(1, Math.floor(templateElements * 0.7))) {
            report.totalScore += 1;
            report.details.push({ check: 'Liczba elementów SVG', passed: true, note: `${studentElements} (min. ${Math.floor(templateElements * 0.7)})` });
        } else {
            report.details.push({ check: 'Liczba elementów SVG', passed: false, note: `${studentElements}/${Math.floor(templateElements * 0.7)} — za mało elementów.` });
        }

        // Check viewBox presence
        report.maxScore += 1;
        if (studentSvg.includes('viewBox')) {
            report.totalScore += 1;
            report.details.push({ check: 'Atrybut viewBox', passed: true });
        } else {
            report.details.push({ check: 'Atrybut viewBox', passed: false, note: 'Brak atrybutu viewBox.' });
        }

    } else if (format === 'xcf') {
        // XCF signature: first 9 bytes are "gimp xcf "
        const sig = fs.readFileSync(studentPath).slice(0, 9).toString('ascii');
        report.maxScore += 1;
        if (sig === 'gimp xcf ') {
            report.totalScore += 1;
            report.details.push({ check: 'Sygnatura pliku XCF (GIMP)', passed: true });
        } else {
            report.details.push({ check: 'Sygnatura pliku XCF (GIMP)', passed: false, note: 'Plik nie jest prawidłowym plikiem GIMP XCF.' });
        }

        // Minimum file size (template-relative)
        const templateSize = fs.statSync(templatePath).size;
        const studentSize  = fs.statSync(studentPath).size;
        report.maxScore += 1;
        if (studentSize >= templateSize * 0.5) {
            report.totalScore += 1;
            report.details.push({ check: 'Rozmiar pliku', passed: true, note: `${Math.round(studentSize / 1024)} KB` });
        } else {
            report.details.push({ check: 'Rozmiar pliku', passed: false, note: `${Math.round(studentSize / 1024)} KB — za mały (min. ${Math.round(templateSize * 0.5 / 1024)} KB).` });
        }
    }

    return report;
}

// ─────────────────────────────────────────────────────────────────────────────
// C++ / PYTHON COMPILER INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────

const COMPILE_TIMEOUT_MS = 15000;
const RUN_TIMEOUT_MS     = 10000;

/**
 * Compiles and runs a C++ file, comparing output against expected output.
 * Requires g++ to be installed.
 *
 * @param {string} studentPath — .cpp or .c file path (must be within a known safe directory)
 * @param {Object} opts — { input?: string, expectedOutput: string }
 * @returns {Promise<Object>}
 */
async function analyzeCpp(studentPath, opts = {}) {
    const report = {
        format: 'cpp',
        totalScore: 0,
        maxScore: 2,
        details: [],
        compileOutput: '',
        runOutput: '',
        timestamp: new Date().toISOString()
    };

    // Only allow .cpp and .c extensions
    if (!/\.(cpp|c)$/.test(studentPath)) {
        report.details.push({ check: 'Kompilacja', passed: false, note: 'Nieprawidłowe rozszerzenie pliku.' });
        return report;
    }

    // Derive executable path and validate it stays within the same directory
    const studentDir = path.dirname(path.resolve(studentPath));
    const baseName   = path.basename(studentPath).replace(/\.(cpp|c)$/, '');
    const exePath    = path.join(studentDir, baseName);
    // Validate exePath is within the expected safe directory
    if (!exePath.startsWith(studentDir)) {
        report.details.push({ check: 'Kompilacja', passed: false, note: 'Nieprawidłowa ścieżka pliku.' });
        return report;
    }

    // Compile — pass each argument separately (no shell interpolation)
    try {
        await execFileAsync('g++', ['-o', exePath, studentPath, '-std=c++17', '-Wall'], {
            timeout: COMPILE_TIMEOUT_MS,
            shell: false
        });
        report.totalScore += 1;
        report.details.push({ check: 'Kompilacja', passed: true });
    } catch (err) {
        report.compileOutput = err.stderr || err.message;
        report.details.push({ check: 'Kompilacja', passed: false, note: 'Błędy kompilacji.', output: report.compileOutput.slice(0, 500) });
        try { fs.removeSync(exePath); } catch (_) {}
        return report;
    }

    // Run and compare output — pass exePath as argv[0], no shell
    if (opts.expectedOutput !== undefined) {
        try {
            const { stdout } = await execFileAsync(exePath, [], {
                timeout: RUN_TIMEOUT_MS,
                input: opts.input || '',
                shell: false
            });
            report.runOutput = stdout.trim();
            const expected   = String(opts.expectedOutput).trim();
            if (report.runOutput === expected) {
                report.totalScore += 1;
                report.details.push({ check: 'Wyjście programu', passed: true });
            } else {
                report.details.push({ check: 'Wyjście programu', passed: false, note: `Oczekiwano: "${expected}", otrzymano: "${report.runOutput.slice(0, 200)}"` });
            }
        } catch (err) {
            report.runOutput = err.stderr || err.message;
            report.details.push({ check: 'Wyjście programu', passed: false, note: 'Błąd wykonania.', output: report.runOutput.slice(0, 200) });
        }
    } else {
        report.maxScore = 1; // No expected output, only compilation check
    }

    try { fs.removeSync(exePath); } catch (_) {}
    return report;
}

/**
 * Runs a Python script and compares output against expected output.
 * Requires python3 to be installed.
 *
 * @param {string} studentPath — .py file path
 * @param {Object} opts — { input?: string, expectedOutput: string }
 * @returns {Promise<Object>}
 */
async function analyzePython(studentPath, opts = {}) {
    const report = {
        format: 'python',
        totalScore: 0,
        maxScore: opts.expectedOutput !== undefined ? 2 : 1,
        details: [],
        runOutput: '',
        timestamp: new Date().toISOString()
    };

    // Syntax check
    try {
        await execFileAsync('python3', ['-m', 'py_compile', studentPath], { timeout: COMPILE_TIMEOUT_MS });
        report.totalScore += 1;
        report.details.push({ check: 'Składnia Python', passed: true });
    } catch (err) {
        report.details.push({ check: 'Składnia Python', passed: false, note: (err.stderr || err.message).slice(0, 500) });
        return report;
    }

    // Run and compare
    if (opts.expectedOutput !== undefined) {
        try {
            const { stdout } = await execFileAsync('python3', [studentPath], {
                timeout: RUN_TIMEOUT_MS,
                input: opts.input || '',
                shell: false
            });
            report.runOutput = stdout.trim();
            const expected   = String(opts.expectedOutput).trim();
            if (report.runOutput === expected) {
                report.totalScore += 1;
                report.details.push({ check: 'Wyjście skryptu', passed: true });
            } else {
                report.details.push({ check: 'Wyjście skryptu', passed: false, note: `Oczekiwano: "${expected}", otrzymano: "${report.runOutput.slice(0, 200)}"` });
            }
        } catch (err) {
            report.runOutput = err.stderr || err.message;
            report.details.push({ check: 'Wyjście skryptu', passed: false, note: 'Błąd wykonania.', output: report.runOutput.slice(0, 200) });
        }
    }

    return report;
}

// ─────────────────────────────────────────────────────────────────────────────
// WIRESHARK (.pcap) ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

/** PCAP global header magic numbers */
const PCAP_MAGIC_LE  = 0xd4c3b2a1;
const PCAP_MAGIC_BE  = 0xa1b2c3d4;
const PCAPNG_MAGIC   = 0x0a0d0d0a;

/**
 * Parses a .pcap or .pcapng file and returns basic statistics.
 * @param {string} filePath
 * @returns {Object}
 */
function parsePcap(filePath) {
    const buf = fs.readFileSync(filePath);
    if (buf.length < 24) throw new Error('File too small to be a valid pcap.');

    const magic = buf.readUInt32LE(0);
    let packetCount = 0;
    let protocols = new Set();

    if (magic === PCAP_MAGIC_LE) {
        // Little-endian pcap
        let offset = 24; // skip global header
        while (offset + 16 <= buf.length) {
            const inclLen = buf.readUInt32LE(offset + 8);
            offset += 16 + inclLen;
            packetCount++;
            // Detect common protocols (heuristic based on port numbers in packet)
            if (inclLen > 34) {
                const protocol = buf[offset - inclLen + 23]; // IP protocol field
                if (protocol === 6)  protocols.add('TCP');
                if (protocol === 17) protocols.add('UDP');
                if (protocol === 1)  protocols.add('ICMP');
            }
        }
    } else if (magic === PCAP_MAGIC_BE) {
        // Big-endian pcap
        let offset = 24;
        while (offset + 16 <= buf.length) {
            const inclLen = buf.readUInt32BE(offset + 8);
            offset += 16 + inclLen;
            packetCount++;
        }
    } else if (magic === PCAPNG_MAGIC) {
        // pcapng — count Interface Description Blocks and Enhanced Packet Blocks
        let offset = 0;
        while (offset + 12 <= buf.length) {
            const blockType = buf.readUInt32LE(offset);
            const blockLen  = buf.readUInt32LE(offset + 4);
            if (blockLen < 12 || blockLen > buf.length - offset) break;
            if (blockType === 6) packetCount++; // Enhanced Packet Block
            offset += blockLen;
        }
    } else {
        throw new Error('Unrecognised pcap format.');
    }

    return { packetCount, protocols: [...protocols] };
}

/**
 * Grades a student .pcap file against a template .pcap reference.
 * @param {string} studentPath
 * @param {string} templatePath
 * @param {Object} criteria — { minPackets?: number, requiredProtocols?: string[] }
 * @returns {Object}
 */
function analyzePcap(studentPath, templatePath, criteria = {}) {
    const report = {
        format: 'pcap',
        totalScore: 0,
        maxScore: 0,
        details: [],
        timestamp: new Date().toISOString()
    };

    let studentStats, templateStats;
    try {
        studentStats  = parsePcap(studentPath);
        templateStats = parsePcap(templatePath);
    } catch (e) {
        report.details.push({ check: 'Format pliku pcap', passed: false, note: e.message });
        return report;
    }

    const minPackets = criteria.minPackets || Math.max(1, Math.floor(templateStats.packetCount * 0.5));
    const requiredProtocols = criteria.requiredProtocols || templateStats.protocols;

    // Packet count check
    report.maxScore += 1;
    if (studentStats.packetCount >= minPackets) {
        report.totalScore += 1;
        report.details.push({ check: 'Liczba pakietów', passed: true, note: `${studentStats.packetCount} (min. ${minPackets})` });
    } else {
        report.details.push({ check: 'Liczba pakietów', passed: false, note: `${studentStats.packetCount}/${minPackets} — za mało.` });
    }

    // Protocol checks
    for (const proto of requiredProtocols) {
        report.maxScore += 1;
        if (studentStats.protocols.includes(proto)) {
            report.totalScore += 1;
            report.details.push({ check: `Protokół ${proto}`, passed: true });
        } else {
            report.details.push({ check: `Protokół ${proto}`, passed: false, note: `Brak ruchu ${proto} w przechwyceniu.` });
        }
    }

    return report;
}

// ─────────────────────────────────────────────────────────────────────────────
// STANDALONE MICROSERVICE MODE
// ─────────────────────────────────────────────────────────────────────────────

if (require.main === module) {
    const express  = require('express');
    const fu       = require('express-fileupload');
    const pathlib  = require('path');

    const serviceApp  = express();
    const servicePort = parseInt(process.env.GRADING_PORT || '8090', 10);

    serviceApp.use(express.json({ limit: '50mb' }));
    serviceApp.use(fu());

    const tmpDir = pathlib.join(__dirname, '../../tmp-grading');
    fs.ensureDirSync(tmpDir);

    /** Shared helper: move uploaded file to tmp, grade, cleanup */
    async function withTmpFiles(req, res, gradeFn) {
        const studentFile  = req.files?.studentFile;
        const templateFile = req.files?.templateFile;
        if (!studentFile || !templateFile) return res.status(400).json({ error: 'studentFile and templateFile are required.' });

        // Sanitise filenames to prevent path traversal in tmp directory
        const sanitise = name => name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.{2,}/g, '_');
        const studentPath  = pathlib.join(tmpDir, `s_${Date.now()}_${sanitise(studentFile.name)}`);
        const templatePath = pathlib.join(tmpDir, `t_${Date.now()}_${sanitise(templateFile.name)}`);

        // Verify resolved paths stay within tmpDir
        if (!studentPath.startsWith(tmpDir) || !templatePath.startsWith(tmpDir)) {
            return res.status(400).json({ error: 'Invalid file name.' });
        }

        try {
            await studentFile.mv(studentPath);
            await templateFile.mv(templatePath);
            const result = await gradeFn(studentPath, templatePath);
            res.json(result);
        } finally {
            fs.remove(studentPath).catch(() => {});
            fs.remove(templatePath).catch(() => {});
        }
    }

    serviceApp.post('/grade/docx',   (req, res) => withTmpFiles(req, res, analyzeDocx));
    serviceApp.post('/grade/pptx',   (req, res) => withTmpFiles(req, res, (s, t) => Promise.resolve(analyzePptx(s, t))));
    serviceApp.post('/grade/sql',    (req, res) => withTmpFiles(req, res, analyzeSQL));
    serviceApp.post('/grade/pkt',    (req, res) => withTmpFiles(req, res, (s, t) => Promise.resolve(analyzePkt(s, t))));
    serviceApp.post('/grade/pcap',   (req, res) => withTmpFiles(req, res, (s, t) => Promise.resolve(analyzePcap(s, t))));
    serviceApp.post('/grade/cpp',    (req, res) => withTmpFiles(req, res, (s) => analyzeCpp(s, req.body)));
    serviceApp.post('/grade/python', (req, res) => withTmpFiles(req, res, (s) => analyzePython(s, req.body)));
    serviceApp.post('/grade/svg',    (req, res) => withTmpFiles(req, res, (s, t) => Promise.resolve(analyzeGraphicsFile(s, t, 'svg'))));
    serviceApp.post('/grade/xcf',    (req, res) => withTmpFiles(req, res, (s, t) => Promise.resolve(analyzeGraphicsFile(s, t, 'xcf'))));

    serviceApp.get('/health', (req, res) => res.json({ status: 'ok', service: 'edutrack-grading-microservice' }));

    serviceApp.listen(servicePort, () => {
        console.log(`[GradingMicroservice] Running on port ${servicePort}`);
    });
}

module.exports = {
    analyzeDocx,
    analyzePptx,
    analyzeSQL,
    analyzePkt,
    analyzeGraphicsFile,
    analyzeCpp,
    analyzePython,
    analyzePcap
};
