<?php
require_once __DIR__ . '/../layout/header.php';
?>
<div class="page-shell">
    <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <h1>Gym Settings</h1>
        <a href="/dashboard" class="btn">Back to Dashboard</a>
    </header>

    <form id="settings-form" style="display: grid; gap: 24px;">
        <?= CSRF::field() ?>
        
        <div class="card">
            <h3>Gym Information</h3>
            <div style="display: grid; gap: 15px;">
                <div>
                    <label>Gym Name</label>
                    <input type="text" name="gym_name" value="<?= htmlspecialchars($gym['gym_name']) ?>">
                </div>
                <div>
                    <label>Owner Name</label>
                    <input type="text" name="owner_name" value="<?= htmlspecialchars($gym['owner_name'] ?? '') ?>">
                </div>
                <div>
                    <label>Owner Phone</label>
                    <input type="tel" name="owner_phone" value="<?= htmlspecialchars($gym['owner_phone'] ?? '') ?>">
                </div>
                <div>
                    <label>Address</label>
                    <input type="text" name="gym_address" value="<?= htmlspecialchars($gym['gym_address'] ?? '') ?>">
                </div>
                <div>
                    <label>UPI ID</label>
                    <input type="text" name="upi_id" value="<?= htmlspecialchars($gym['upi_id'] ?? '') ?>">
                </div>
            </div>
        </div>

        <div class="card">
            <h3>Services & Pricing</h3>
            <div id="services-list" style="display: grid; gap: 10px; margin-bottom: 20px;">
                <!-- Loaded via JS -->
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 10px;">
                <input type="text" id="new-service-name" placeholder="Service Name">
                <input type="number" id="new-service-price" placeholder="Price">
                <button type="button" onclick="addService()" class="btn btn-primary" style="width: auto;">Add</button>
            </div>
        </div>

        <div class="card">
            <h3>WhatsApp Templates</h3>
            <div style="display: grid; gap: 15px;">
                <div>
                    <label>Overdue Template</label>
                    <textarea name="template_overdue" style="width:100%; padding:10px; border-radius:12px; border:1px solid #e5e7eb; height:80px;"><?= htmlspecialchars($settings['template_overdue'] ?? '') ?></textarea>
                    <small style="color:#6b7280;">Variables: {name}, {due}</small>
                </div>
                <div>
                    <label>Expiring Soon Template</label>
                    <textarea name="template_expiring_soon" style="width:100%; padding:10px; border-radius:12px; border:1px solid #e5e7eb; height:80px;"><?= htmlspecialchars($settings['template_expiring_soon'] ?? '') ?></textarea>
                    <small style="color:#6b7280;">Variables: {name}, {days}</small>
                </div>
                <div>
                    <label>Expired Today Template</label>
                    <textarea name="template_expires_today" style="width:100%; padding:10px; border-radius:12px; border:1px solid #e5e7eb; height:80px;"><?= htmlspecialchars($settings['template_expires_today'] ?? '') ?></textarea>
                    <small style="color:#6b7280;">Variables: {name}</small>
                </div>
                <div>
                    <label>Expired Template</label>
                    <textarea name="template_expired" style="width:100%; padding:10px; border-radius:12px; border:1px solid #e5e7eb; height:80px;"><?= htmlspecialchars($settings['template_expired'] ?? '') ?></textarea>
                    <small style="color:#6b7280;">Variables: {name}, {days}</small>
                </div>
                <div>
                    <label>Rejoin Template</label>
                    <textarea name="template_rejoin" style="width:100%; padding:10px; border-radius:12px; border:1px solid #e5e7eb; height:80px;"><?= htmlspecialchars($settings['template_rejoin'] ?? '') ?></textarea>
                    <small style="color:#6b7280;">Variables: {name}</small>
                </div>
            </div>
        </div>

        <div class="card">
            <h3>Advanced Settings</h3>
            <div>
                <label>Dead Client Threshold (Days)</label>
                <input type="number" name="dead_threshold_days" value="<?= $settings['dead_threshold_days'] ?? 60 ?>">
            </div>
        </div>

        <button type="submit" class="btn btn-primary">Save All Settings</button>
    </form>
</div>

<script src="/assets/js/app.js"></script>
<script>
    const services = <?= json_encode($services) ?>;
    
    function renderServices() {
        const list = document.getElementById('services-list');
        list.innerHTML = services.map(s => `
            <div style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 10px; align-items: center; background: #f9fafb; padding: 10px; border-radius: 12px; border: 1px solid #e5e7eb;">
                <input type="text" value="${s.name}" onchange="updateService(${s.id}, 'name', this.value)">
                <input type="number" value="${s.price}" onchange="updateService(${s.id}, 'price', this.value)">
                <button type="button" onclick="deleteService(${s.id})" class="btn btn-danger" style="padding: 8px 12px;">✕</button>
            </div>
        `).join('');
    }

    async function addService() {
        const name = document.getElementById('new-service-name').value;
        const price = document.getElementById('new-service-price').value;
        if (!name || !price) return;
        
        try {
            const res = await apiFetch('/api/services', {
                method: 'POST',
                body: JSON.stringify({ name, price })
            });
            services.push(res.service);
            renderServices();
            document.getElementById('new-service-name').value = '';
            document.getElementById('new-service-price').value = '';
            showToast('Service added');
        } catch (e) { showToast(e.message, 'error'); }
    }

    async function updateService(id, field, value) {
        try {
            const service = services.find(s => s.id === id);
            service[field] = value;
            await apiFetch('/api/services/edit', {
                method: 'POST',
                body: JSON.stringify({ id, ...service })
            });
            showToast('Service updated');
        } catch (e) { showToast(e.message, 'error'); }
    }

    async function deleteService(id) {
        if (!confirm('Delete this service?')) return;
        try {
            await apiFetch('/api/services/delete', {
                method: 'POST',
                body: JSON.stringify({ id })
            });
            const idx = services.findIndex(s => s.id === id);
            services.splice(idx, 1);
            renderServices();
            showToast('Service deleted');
        } catch (e) { showToast(e.message, 'error'); }
    }

    document.getElementById('settings-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        try {
            await apiFetch('/api/settings', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showToast('Settings saved!');
        } catch (e) { showToast(e.message, 'error'); }
    });

    renderServices();
</script>
<?php
require_once __DIR__ . '/../layout/footer.php';
?>
