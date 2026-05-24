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

async function updateOfflineBanner() {
    const queue = getOfflineQueue();
    const banner = document.getElementById('offline-banner');
    if (!banner) return;

    const isOnline = await checkActualConnectivity();
    
    if (!isOnline) {
        banner.textContent = '📴 You are currently offline. Changes will be saved locally.';
        banner.style.display = 'block';
        banner.style.background = '#fee2e2'; 
    } else if (queue.length > 0) {
        banner.textContent = `🟢 Online: ${queue.length} member(s) saved offline, syncing...`;
        banner.style.display = 'block';
        banner.style.background = '#dcfce7'; 
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
        } catch (e) {
            // If it's a 400 error (e.g. duplicate), discard it from the queue permanently
            if (e.status === 400) {
                console.warn('Discarding invalid offline record:', item, e.message);
                continue; 
            }
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

window.addEventListener('online', async () => {
    showToast('🟢 Connection restored. Syncing...');
    await flushOfflineQueue();
    await updateOfflineBanner();
});

document.addEventListener('DOMContentLoaded', async () => {
    await updateOfflineBanner();
    if (await checkActualConnectivity()) {
        await flushOfflineQueue();
    }
});
