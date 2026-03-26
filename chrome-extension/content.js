/**
 * Content Script: Monitors current page title and reports it.
 */
console.log('[EduTrack] Monitoring current tab...');

setInterval(() => {
    const title = document.title;
    const url = window.location.href;
    chrome.runtime.sendMessage({ type: 'tab-update', title, url });
}, 5000);
