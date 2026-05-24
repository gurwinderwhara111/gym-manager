<?php
require_once __DIR__ . '/../layout/header.php';
?>
<div class="page-shell" style="text-align:center; max-width: 400px;">
    <div class="card">
        <h1 style="margin-bottom: 8px;"><?= htmlspecialchars($gym_name ?? 'My Gym') ?></h1>
        <p style="color:#6b7280; margin-bottom: 30px;">Member Portal</p>

        <div class="portal-ring" style="display:flex; flex-direction:column; align-items:center; margin-bottom: 30px;">
            <div style="position:relative; width:150px; height:150px; border: 15px solid #e5e7eb; border-radius:50%; display:flex; align-items:center; justify-content:center;">
                <div style="text-align:center;">
                    <span style="font-size: 2.5rem; font-weight: 800; display:block;"><?= max(0, $daysLeft) ?></span>
                    <span style="font-size: 0.8rem; color:#6b7280; text-transform:uppercase;">Days Left</span>
                </div>
            </div>
        </div>

        <div style="text-align:left; display:grid; gap:12px; margin-bottom: 24px;">
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f3f4f6; padding-bottom:8px;">
                <span style="color:#6b7280;">Status</span>
                <strong style="color:<?= $statusColor ?>;"><?= strtoupper($member['status']) ?></strong>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f3f4f6; padding-bottom:8px;">
                <span style="color:#6b7280;">Service</span>
                <strong><?= htmlspecialchars($member['service_name']) ?></strong>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f3f4f6; padding-bottom:8px;">
                <span style="color:#6b7280;">Expiry Date</span>
                <strong><?= formatDate($member['expiry_date']) ?></strong>
            </div>
            <?php if ($member['pending_due'] > 0): ?>
            <div style="display:flex; justify-content:space-between; color:#dc2626; font-weight:700;">
                <span>Pending Due</span>
                <span>₹<?= number_format($member['pending_due'], 0) ?></span>
            </div>
            <?php endif; ?>
        </div>

        <form action="/logout" method="POST">
            <?= CSRF::field() ?>
            <button type="submit" class="btn btn-danger" style="width:100%;">Sign Out</button>
        </form>
    </div>
</div>
<?php
require_once __DIR__ . '/../layout/footer.php';
?>
