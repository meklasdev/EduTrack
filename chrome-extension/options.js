// options.js — EduTrack Chrome Extension options page
chrome.storage.local.get(['edutrack_server_url', 'edutrack_student_id'], (items) => {
    document.getElementById('server-url').value  = items.edutrack_server_url  || '';
    document.getElementById('student-id').value  = items.edutrack_student_id  || '';
});

function saveSettings() {
    const serverUrl = document.getElementById('server-url').value.trim();
    const studentId = document.getElementById('student-id').value.trim();
    chrome.storage.local.set({ edutrack_server_url: serverUrl, edutrack_student_id: studentId }, () => {
        const msg = document.getElementById('saved-msg');
        msg.style.display = 'block';
        setTimeout(() => { msg.style.display = 'none'; }, 3000);
    });
}
