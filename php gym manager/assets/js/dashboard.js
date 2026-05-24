let currentTab = 'running';
let currentSearch = '';
let searchTimeout = null;

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function setQuickDate(option, inputId = 'add-member-start-date') {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const today = new Date();
    if (option === 'today') {
        input.value = today.toISOString().slice(0, 10);
    } else if (option === 'yesterday') {
        today.setDate(today.getDate() - 1);
        input.value = today.toISOString().slice(0, 10);
    } else {
        // 'custom' - just focus the input
        input.focus();
    }
}

async function loadMembers() {
    const listEl = document.getElementById('member-list');
    if (!listEl) return;
    
    listEl.innerHTML = '<div style="text-align:center; padding: 40px;">Loading members...</div>';

    try {
        const res = await apiFetch(`/api/members?tab=${currentTab}&search=${encodeURIComponent(currentSearch)}`);
        const members = res.members;

        if (members.length === 0) {
            listEl.innerHTML = '<div class="card" style="text-align:center; color:#6b7280;">No members found.</div>';
            return;
        }

        listEl.innerHTML = members.map(m => {
            const badgeClass = {
                'active': 'badge-active', 
                'rejoined': 'badge-rejoined', 
                'overdue': 'badge-overdue', 
                'dead': 'badge-dead'
            }[m.status] || 'badge-dead';

            return `
            <div class="card member-card" data-id="${m.id}" data-monthly-fee="${m.monthly_fee}">
                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:10px;">
                    <div>
                        <strong style="font-size:1.1rem;">${escapeHTML(m.member_name)}</strong>
                        <span class="service-tag" style="font-size:0.7rem; background:#f3f4f6; padding:2px 6px; border-radius:10px; color:#6b7280; margin-left:8px;">${escapeHTML(m.service_name)}</span>
                    </div>
                    <span class="status-badge ${badgeClass}">${escapeHTML(m.status).toUpperCase()}</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem;">
                    <div>
                        ${m.status === 'active' ? `Expires in ${calculateDaysLeft(m.expiry_date)} days` : (m.status === 'dead' ? 'Last active: ' + m.expiry_date : `Expired ${Math.abs(calculateDaysLeft(m.expiry_date))} days ago`)}
                        ${m.pending_due > 0 ? `<div class="udhaar-badge" style="color:#b91c1c; font-weight:700; margin-top:4px;">Udhaar: ₹${m.pending_due}</div>` : ''}
                    </div>
                    <div class="action-zone" style="display:flex; gap:8px;">
                        <a href="${m.whatsapp_link}" target="_blank" class="btn" style="background:#25D366; color:#fff; padding:6px 12px; text-decoration:none; border-radius:8px; font-size:0.75rem;">WhatsApp</a>
                        ${m.status !== 'dead' ? `<button data-action="renew" class="btn" style="background:#2563eb; color:#fff; padding:6px 12px; border-radius:8px; font-size:0.75rem;">Renew</button>` : ''}
                        ${m.pending_due > 0 ? `<button data-action="clear-due" class="btn" style="background:#f59e0b; color:#fff; padding:6px 12px; border-radius:8px; font-size:0.75rem;">Clear Due</button>` : ''}
                        ${m.status !== 'dead' ? `<button data-action="mark-dead" class="btn" style="background:#6b7280; color:#fff; padding:6px 12px; border-radius:8px; font-size:0.75rem;">Dead</button>` : ''}
                        ${m.status === 'dead' ? `<button data-action="rejoin" class="btn" style="background:#7c3aed; color:#fff; padding:6px 12px; border-radius:8px; font-size:0.75rem;">Rejoin</button>` : ''}
                    </div>
                </div>
            </div>`;
        }).join('');

    } catch (e) {
        showToast(e.message, 'error');
    }
}

function calculateDaysLeft(dateStr) {
    const diff = new Date(dateStr) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

async function handleMemberAction(action, id, memberData = null) {
    try {
        if (action === 'renew') {
            if (!confirm('Renew membership for 30 days?')) return;
            await apiFetch('/api/members/renew', { method: 'POST', body: JSON.stringify({ id }) });
            showToast('Member renewed!');
        } else if (action === 'clear-due') {
            openClearDueModal(memberData);
        } else if (action === 'mark-dead') {
            if (!confirm('Mark member as dead?')) return;
            await apiFetch('/api/members/mark-dead', { method: 'POST', body: JSON.stringify({ id }) });
            showToast('Marked as dead');
        } else if (action === 'rejoin') {
            openRejoinModal(memberData);
        }
        loadMembers();
    } catch (e) { showToast(e.message, 'error'); }
}

// --- Modal Handlers ---

function openAddMemberModal() {
    document.getElementById('add-member-modal').style.display = 'flex';
}

function closeAddMemberModal() {
    document.getElementById('add-member-modal').style.display = 'none';
}

function openClearDueModal(member) {
    const modal = document.getElementById('clear-due-modal');
    document.getElementById('clear-due-member-name').textContent = member.member_name;
    document.getElementById('clear-due-total').textContent = '₹' + member.pending_due;
    document.getElementById('clear-due-id').value = member.id;
    document.getElementById('clear-due-amount').value = member.pending_due;
    modal.style.display = 'flex';
}

function closeClearDueModal() {
    document.getElementById('clear-due-modal').style.display = 'none';
}

function openRejoinModal(member) {
    const modal = document.getElementById('rejoin-modal');
    document.getElementById('rejoin-member-name').textContent = member.member_name;
    document.getElementById('rejoin-id').value = member.id;
    document.getElementById('rejoin-service-name').value = member.service_name;
    document.getElementById('rejoin-monthly-fee').value = member.monthly_fee;
    modal.style.display = 'flex';
}

function closeRejoinModal() {
    document.getElementById('rejoin-modal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    loadMembers();

    // Event Delegation for member actions
    document.getElementById('member-list')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        
        const action = btn.dataset.action;
        const card = btn.closest('.member-card');
        const id = card.dataset.id;
        
        // Extract member data from the DOM to pass to modals
        // In a real app, we might fetch the member object, but here we can scrape the card
        const memberData = {
            id: id,
            member_name: card.querySelector('strong').textContent,
            pending_due: card.querySelector('.udhaar-badge')?.textContent.replace('Udhaar: ₹', '') || 0,
            service_name: card.querySelector('.service-tag').textContent,
            monthly_fee: card.dataset.monthlyFee || 1500 
        };

        
        handleMemberAction(action, id, memberData);
    });

    // Debounced Search
    document.getElementById('member-search')?.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(loadMembers, 300);
    });

    // Tab Switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTab = btn.dataset.tab;
            loadMembers();
        });
    });

    // Add Member Form
    document.getElementById('add-member-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const res = await submitAddMember(data);
            if (res.offline) {
                closeAddMemberModal();
            } else if (res.success) {
                showToast(res.message);
                closeAddMemberModal();
                loadMembers();
            } else if (res.duplicate && res.canRejoin) {
                showToast(`Member ${escapeHTML(res.name)} can rejoin. Please use Rejoin button.`, 'warning');
            } else {
                showToast(res.error || 'Unknown error', 'error');
            }
        } catch (e) { 
            showToast(e.message, 'error'); 
        }
    });

    // Clear Due Form
    document.getElementById('clear-due-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        try {
            await apiFetch('/api/members/clear-due', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showToast('Due cleared successfully!');
            closeClearDueModal();
            loadMembers();
        } catch (e) { showToast(e.message, 'error'); }
    });

    // Rejoin Form
    document.getElementById('rejoin-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        try {
            await apiFetch('/api/members/rejoin', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showToast('Member rejoined successfully!');
            closeRejoinModal();
            loadMembers();
        } catch (e) { showToast(e.message, 'error'); }
    });

    // Clear All button in Clear Due modal
    document.getElementById('btn-clear-all')?.addEventListener('click', () => {
        const total = document.getElementById('clear-due-total').textContent.replace('₹', '');
        document.getElementById('clear-due-amount').value = total;
    });

    // Service dropdown update in Rejoin modal
    document.getElementById('rejoin-service-id')?.addEventListener('change', async (e) => {
        const serviceId = e.target.value;
        try {
            const res = await apiFetch('/api/services', { method: 'GET' });
            const service = res.services.find(s => s.id == serviceId);
            if (service) {
                document.getElementById('rejoin-service-name').value = service.name;
                document.getElementById('rejoin-monthly-fee').value = service.price;
            }
        } catch (e) { console.error('Error updating service', e); }
    });
});
