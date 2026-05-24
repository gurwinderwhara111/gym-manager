// Global CSRF token helper
function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.content || '';
}

// Universal fetch wrapper
async function apiFetch(url, options = {}) {
    // FIX: Prefix all URLs with /index.php to make the short server command work
    const routedUrl = url.startsWith('/') ? `/index.php${url}` : url;

    const headers = {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
        ...(options.headers || {})
    };
    
    const res = await fetch(routedUrl, { ...options, headers });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const error = new Error(errData.error || `HTTP ${res.status}`);
        error.status = res.status;
        throw error;
    }
    return res.json();
}

// Real connectivity check (doesn't trust navigator.onLine)
async function checkActualConnectivity() {
    if (!navigator.onLine) return false;
    try {
        // Fetch a tiny resource to verify actual internet access
        // We use a cache-busting query to ensure we aren't seeing a cached 200
        await fetch('/favicon.ico?t=' + Date.now(), { mode: 'no-cors', cache: 'no-store' });
        return true;
    } catch {
        return false;
    }
}

// Toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast toast-${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3500);
}

// Wrapper for adding member with offline support
async function submitAddMember(formData) {
    const isOnline = await checkActualConnectivity();

    if (!isOnline) {
        enqueueOffline(formData);
        showToast('📴 No internet. Saved offline.', 'warning');
        return { offline: true };
    }

    try {
        const res = await apiFetch('/api/members', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        return res;
    } catch (e) {
        // Only queue offline if it's a real network failure (TypeError), not a server error (404, 500)
        if (e instanceof TypeError || !e.status) {
            enqueueOffline(formData);
            showToast('📴 Connection lost. Saved offline.', 'warning');
            return { offline: true };
        }
        // For server errors, throw the error so the UI can display the message
        throw e;
    }
}
