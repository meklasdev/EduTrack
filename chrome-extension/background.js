/**
 * EduTrack Chrome Extension — Background Service Worker
 *
 * Connects to the EduTrack server via WebSocket (using socket.io-client CDN),
 * sends periodic activity reports, and relays task instructions to the popup.
 */

const STORAGE_KEY_SERVER = 'edutrack_server_url';
const STORAGE_KEY_STUDENT = 'edutrack_student_id';
const REPORT_INTERVAL_MINUTES = 0.5; // 30 seconds

let socket = null;
let serverUrl = '';
let studentId = '';

// ── Load config from storage ───────────────────────────────────────────────
async function loadConfig() {
    return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEY_SERVER, STORAGE_KEY_STUDENT], (items) => {
            serverUrl  = items[STORAGE_KEY_SERVER]  || 'http://localhost:8080';
            studentId  = items[STORAGE_KEY_STUDENT] || 'chromebook-student';
            resolve();
        });
    });
}

// ── Connect to EduTrack server ────────────────────────────────────────────
async function connect() {
    await loadConfig();
    if (!serverUrl) return;

    // Dynamically import socket.io-client from CDN (CSP-safe in service worker)
    // In production, bundle socket.io-client into the extension
    try {
        const { io } = await import('https://cdn.socket.io/4.7.2/socket.io.esm.min.js');
        socket = io(serverUrl, { transports: ['websocket'], reconnectionDelay: 3000 });

        socket.on('connect', () => {
            console.log('[EduTrack] Connected to', serverUrl);
            chrome.action.setBadgeText({ text: 'ON' });
            chrome.action.setBadgeBackgroundColor({ color: '#2e7d32' });
        });

        socket.on('disconnect', () => {
            chrome.action.setBadgeText({ text: 'OFF' });
            chrome.action.setBadgeBackgroundColor({ color: '#c62828' });
        });

        socket.on('task-started', (task) => {
            chrome.storage.local.set({ edutrack_current_task: task });
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: 'EduTrack — Nowe Zadanie',
                message: task.title || 'Nauczyciel uruchomił nowe zadanie egzaminacyjne.'
            });
        });

        socket.on('teacher-message', (data) => {
            if (data.type === 'black-screen' || data.type === 'lock') {
                chrome.tabs.query({}, (tabs) => {
                    tabs.forEach(tab => {
                        chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            func: () => { document.body.style.cssText = 'background:#000!important;overflow:hidden!important;'; }
                        }).catch(() => {});
                    });
                });
            }
        });

        socket.on('network-lockdown', (data) => {
            // Chrome extensions cannot apply iptables — inform teacher via badge
            chrome.action.setBadgeText({ text: data.action === 'apply' ? 'LCK' : 'ON' });
        });

    } catch (e) {
        console.warn('[EduTrack] Could not load socket.io:', e.message);
    }
}

// ── Send activity report ──────────────────────────────────────────────────
async function sendReport() {
    if (!socket || !socket.connected) return;

    const tabs = await chrome.tabs.query({ active: true });
    const activeTab = tabs[0];
    const windows = activeTab ? [{ title: activeTab.title || '', app: 'chrome' }] : [];

    socket.emit('agent-report', {
        hostname: studentId,
        windows,
        processes: ['chrome']
    });
}

// ── Setup periodic reporting ──────────────────────────────────────────────
chrome.alarms.create('edutrack-report', { periodInMinutes: REPORT_INTERVAL_MINUTES });
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'edutrack-report') sendReport();
});

// ── Initialize on service worker startup ─────────────────────────────────
connect();
