/**
 * Background Service Worker: Handles communication with the EduTrack Central Server.
 */
console.log('[EduTrack Background] Initializing...');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'tab-update') {
        console.log(`[EduTrack Update] Tab changed: ${message.title} (${message.url})`);
        // In a real implementation, we would send this data to the EduTrack server via Socket.io-client or fetch.
    }
});
