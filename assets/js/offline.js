const OFFLINE_KEY = 'gym_offline_queue';

function isOnline() { return navigator.onLine; }

function enqueueOffline(memberData) {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]');
    queue.push({ ...memberData, queued_at: new Date().toISOString() });
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(queue));
    updateOfflineBanner();
}

function getOfflineQueue() {
    return JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]');
}

function clearOfflineQueue() {
    localStorage.removeItem(OFFLINE_KEY);
    updateOfflineBanner();
}

function updateOfflineBanner() {
    const queue = getOfflineQueue();
    const banner = document.getElementById('offline-banner');
    if (!banner) return;
    if (queue.length > 0) {
        banner.textContent = `📴 ${queue.length} member(s) saved offline, will sync when connected.`;
        banner.style.display = 'block';
    } else {
        banner.style.display = 'none';
    }
}

async function flushOfflineQueue() {
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    const failed = [];
    for (const item of queue) {
        try {
            const res = await apiFetch('/api/members', {
                method: 'POST',
                body: JSON.stringify(item)
            });
            if (!res.success) failed.push(item);
        } catch {
            failed.push(item);
        }
    }

    if (failed.length > 0) {
        localStorage.setItem(OFFLINE_KEY, JSON.stringify(failed));
    } else {
        clearOfflineQueue();
    }

    updateOfflineBanner();
    if (failed.length < queue.length) {
        showToast('✅ Offline members synced.');
        if (typeof loadMembers === 'function') loadMembers();
    }
}

window.addEventListener('online', () => {
    showToast('🟢 Connection restored. Syncing...');
    flushOfflineQueue();
});

document.addEventListener('DOMContentLoaded', () => {
    updateOfflineBanner();
    if (isOnline()) flushOfflineQueue();
});
