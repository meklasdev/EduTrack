/**
 * OCR Service — Detect prohibited text in student screenshots.
 *
 * Uses the `tesseract.js` package for in-process OCR if it is installed,
 * or falls back to calling the system `tesseract` CLI binary.
 *
 * Prohibited patterns (case-insensitive regular expressions) can be
 * configured via the BANNED_TEXT_PATTERNS environment variable
 * (comma-separated list of regex strings).
 *
 * Usage:
 *   const { scanScreenshot } = require('./ocr-service');
 *   const result = await scanScreenshot(base64JpegString);
 *   // result: { text, violations: string[], hasViolation: boolean }
 */

const path = require('path');
const fs   = require('fs-extra');
const os   = require('os');

// Default list of prohibited text patterns
const DEFAULT_BANNED_PATTERNS = [
    'chatgpt', 'gemini', 'claude', 'copilot', 'deepseek', 'ollama',
    'discord', 'whatsapp', 'telegram', 'messenger',
    'facebook', 'instagram', 'youtube', 'tiktok',
    'stack overflow', 'stackoverflow', 'w3schools',
    'chegg', 'brainly', 'quizlet'
];

function getBannedPatterns() {
    if (process.env.BANNED_TEXT_PATTERNS) {
        return process.env.BANNED_TEXT_PATTERNS.split(',').map(p => p.trim());
    }
    return DEFAULT_BANNED_PATTERNS;
}

/**
 * Attempt to use tesseract.js (if installed).
 * Returns null if the package is not available.
 */
async function tryTesseractJs(imageBuffer) {
    try {
        const Tesseract = require('tesseract.js');
        const { data: { text } } = await Tesseract.recognize(imageBuffer, 'pol+eng', { logger: () => {} });
        return text;
    } catch (_) {
        return null;
    }
}

/**
 * Attempt to use the system `tesseract` CLI.
 * Returns null if the binary is not found.
 */
async function tryTesseractCLI(imageBuffer) {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    const tmpImg = path.join(os.tmpdir(), `edutrack_ocr_${Date.now()}.jpg`);
    const tmpTxt = tmpImg.replace('.jpg', '');

    try {
        await fs.writeFile(tmpImg, imageBuffer);
        await execAsync(`tesseract "${tmpImg}" "${tmpTxt}" -l pol+eng`, { timeout: 30000 });
        const text = await fs.readFile(tmpTxt + '.txt', 'utf8');
        return text;
    } catch (_) {
        return null;
    } finally {
        fs.remove(tmpImg).catch(() => {});
        fs.remove(tmpTxt + '.txt').catch(() => {});
    }
}

/**
 * Scan a screenshot for prohibited text.
 *
 * @param {string} base64Image — JPEG image encoded as base64
 * @returns {Promise<{ text: string, violations: string[], hasViolation: boolean }>}
 */
async function scanScreenshot(base64Image) {
    const imageBuffer = Buffer.from(base64Image, 'base64');

    let text = await tryTesseractJs(imageBuffer);
    if (text === null) text = await tryTesseractCLI(imageBuffer);
    if (text === null) {
        return { text: '', violations: [], hasViolation: false, error: 'OCR engine not available. Install tesseract or tesseract.js.' };
    }

    const lower      = text.toLowerCase();
    const patterns   = getBannedPatterns();
    const violations = patterns.filter(p => lower.includes(p.toLowerCase()));

    return {
        text:         text.slice(0, 2000), // cap to avoid huge payloads
        violations,
        hasViolation: violations.length > 0
    };
}

module.exports = { scanScreenshot };
