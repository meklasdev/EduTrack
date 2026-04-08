/**
 * Ollama LLM Client — Local AI integration for EduTrack.
 *
 * Connects to a locally running Ollama instance (https://ollama.com/) to
 * provide AI-powered features:
 *   - AI-driven grading for Python and C++ (style check, logic verification)
 *   - Predictive failure analysis summaries
 *   - AI-generated custom exam questions based on student weak spots
 *   - Automatic summarisation of exam results
 *
 * Environment variables:
 *   OLLAMA_URL    — base URL of the Ollama API (default: http://localhost:11434)
 *   OLLAMA_MODEL  — model to use (default: llama3)
 *
 * If Ollama is not running the functions gracefully return a fallback
 * "not available" message so the server continues to work without AI.
 */

const http = require('http');
const https = require('https');

const OLLAMA_URL   = process.env.OLLAMA_URL   || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

/**
 * Low-level helper: POST a JSON body and return the parsed response.
 * @param {string} endpoint
 * @param {Object} body
 * @returns {Promise<Object>}
 */
function ollamaPost(endpoint, body) {
    return new Promise((resolve, reject) => {
        const url    = new URL(endpoint, OLLAMA_URL);
        const data   = JSON.stringify(body);
        const lib    = url.protocol === 'https:' ? https : http;
        const req = lib.request({
            hostname: url.hostname,
            port:     url.port || (url.protocol === 'https:' ? 443 : 80),
            path:     url.pathname,
            method:   'POST',
            headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
        }, (res) => {
            let raw = '';
            res.on('data', c => { raw += c; });
            res.on('end', () => {
                try {
                    // Ollama streaming: each line is a JSON object
                    const lines  = raw.trim().split('\n');
                    const chunks = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
                    const text   = chunks.map(c => c.response || '').join('');
                    resolve({ text, raw: chunks });
                } catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.setTimeout(60000, () => { req.destroy(new Error('Ollama request timeout')); });
        req.write(data);
        req.end();
    });
}

/**
 * Check whether Ollama is reachable.
 * @returns {Promise<boolean>}
 */
async function isAvailable() {
    try {
        await ollamaPost('/api/tags', {});
        return true;
    } catch {
        return false;
    }
}

/**
 * Send a prompt to Ollama and get a text response.
 * @param {string} prompt
 * @returns {Promise<string>}
 */
async function prompt(userPrompt) {
    try {
        const result = await ollamaPost('/api/generate', {
            model:  OLLAMA_MODEL,
            prompt: userPrompt,
            stream: true
        });
        return result.text || '(brak odpowiedzi)';
    } catch (e) {
        return `[AI niedostępne: ${e.message}]`;
    }
}

/**
 * Grade Python or C++ code using the AI model.
 * Returns a structured assessment with style and logic comments.
 *
 * @param {string} code
 * @param {'python'|'cpp'} language
 * @param {string} taskDescription
 * @returns {Promise<{ grade: string, feedback: string, aiAvailable: boolean }>}
 */
async function gradeCode(code, language, taskDescription = '') {
    const langName = language === 'python' ? 'Python' : 'C++';
    const userPrompt = `You are a strict programming teacher grading a ${langName} assignment.
Task description: "${taskDescription}"

Student code:
\`\`\`${language}
${code.slice(0, 3000)}
\`\`\`

Evaluate:
1. Does it solve the task? (Yes/Partial/No)
2. Code style (1-5)
3. Logic correctness (1-5)
4. Specific feedback in Polish.

Respond in JSON: { "solves": "Yes|Partial|No", "style": 1-5, "logic": 1-5, "feedback": "..." }`;

    const response = await prompt(userPrompt);

    let parsed = { solves: 'unknown', style: 0, logic: 0, feedback: response };
    try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = { ...parsed, ...JSON.parse(jsonMatch[0]) };
    } catch (_) {}

    const grade = parsed.solves === 'Yes'     ? 'Zaliczone (5)'
                : parsed.solves === 'Partial' ? 'Częściowe (3)'
                : 'Niezaliczone (2)';

    return { grade, feedback: parsed.feedback, solves: parsed.solves, style: parsed.style, logic: parsed.logic, aiAvailable: true };
}

/**
 * Generate custom exam questions targeting a student's weak spots.
 *
 * @param {string[]} weakTopics — list of topics the student struggles with
 * @param {string} examType — e.g. "Excel", "SQL", "C++", "Networking"
 * @returns {Promise<string>}
 */
async function generateExamQuestions(weakTopics, examType) {
    const userPrompt = `You are a vocational IT exam creator (Polish school system).
Generate 3 exam questions in Polish for the subject "${examType}" targeting these weak spots: ${weakTopics.join(', ')}.
Format: numbered list, difficulty increasing.`;

    return prompt(userPrompt);
}

/**
 * Summarise overall exam results in natural language.
 *
 * @param {Object[]} students — array of { hostname, lastScore, alerts }
 * @returns {Promise<string>}
 */
async function summariseResults(students) {
    const lines = students.map(s => `- ${s.hostname}: wynik ${s.lastScore}, alerty ${s.alerts}`).join('\n');
    const userPrompt = `Jesteś nauczycielem. Proszę podsumuj wyniki egzaminu po polsku (3-4 zdania):\n${lines}`;
    return prompt(userPrompt);
}

module.exports = { isAvailable, prompt, gradeCode, generateExamQuestions, summariseResults };
