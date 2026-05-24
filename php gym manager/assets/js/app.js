// Global CSRF token helper
function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.content || '';
}

// Universal fetch wrapper
async function apiFetch(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
        ...(options.headers || {})
    };
    
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
    }
    return res.json();
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
    if (!navigator.onLine) {
        enqueueOffline(formData);
        showToast('📴 Saved offline. Will sync when connected.', 'warning');
        return { offline: true };
    }
    try {
        const res = await apiFetch('/api/members', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        return res;
    } catch (e) {
        enqueueOffline(formData);
        showToast('📴 Network error. Saved offline.', 'warning');
        return { offline: true };
    }
}
