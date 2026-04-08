/**
 * EduTrack Chrome Extension — Content Script
 *
 * Monitors the active page for suspicious activity patterns and reports
 * to the background service worker.
 */

// List of banned website domains (same as server-side banned list)
const BANNED_DOMAINS = [
    'chat.openai.com', 'chatgpt.com',
    'gemini.google.com', 'claude.ai', 'copilot.microsoft.com',
    'discord.com', 'discord.gg',
    'whatsapp.com', 'web.telegram.org',
    'youtube.com', 'facebook.com', 'instagram.com', 'tiktok.com',
    'brainly.pl', 'brainly.com', 'quizlet.com', 'chegg.com'
];

const currentDomain = location.hostname.replace('www.', '');
const isBanned = BANNED_DOMAINS.some(d => currentDomain.endsWith(d));

if (isBanned) {
    // Notify background
    chrome.runtime.sendMessage({ type: 'banned-site', domain: currentDomain, title: document.title });
    // Visual warning overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position:fixed;top:0;left:0;width:100%;height:100%;
        background:rgba(0,0,0,0.92);z-index:2147483647;
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        color:#f85149;font-family:sans-serif;text-align:center;
    `;
    overlay.innerHTML = `
        <div style="font-size:48px;margin-bottom:16px;">⛔</div>
        <h1 style="font-size:24px;margin:0 0 12px;">STRONA ZABLOKOWANA</h1>
        <p style="font-size:16px;color:#e6edf3;max-width:400px;">Nauczyciel zablokował dostęp do tej strony podczas egzaminu.</p>
        <p style="font-size:13px;color:#8b949e;margin-top:8px;">${document.domain}</p>
    `;
    document.documentElement.appendChild(overlay);
}
