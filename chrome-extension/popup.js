// popup.js — EduTrack Chrome Extension popup logic
chrome.storage.local.get(['edutrack_server_url', 'edutrack_student_id', 'edutrack_current_task'], (items) => {
    const serverUrl  = items.edutrack_server_url  || 'http://localhost:8080';
    const studentId  = items.edutrack_student_id  || '—';
    const task       = items.edutrack_current_task;

    document.getElementById('server-info').textContent = `Serwer: ${serverUrl} | Uczeń: ${studentId}`;

    // Connection status via badge text
    chrome.action.getBadgeText({}, (badge) => {
        const online = badge === 'ON';
        document.getElementById('conn-dot').classList.toggle('on', online);
        document.getElementById('conn-label').textContent = online ? 'Połączono' : 'Rozłączono';
    });

    if (task) {
        document.getElementById('no-task').style.display = 'none';
        document.getElementById('task-box').style.display = 'block';
        document.getElementById('task-title').textContent = task.title || '—';
        document.getElementById('task-desc').textContent  = task.description || '';
    }
});
