<?php
require_once __DIR__ . '/../layout/header.php';
?>
<div class="lockout-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,.8); display: flex; align-items: center; justify-content: center; z-index: 100;">
    <div class="lockout-card" style="background: #fff; border-radius: 24px; padding: 32px; max-width: 420px; width: 90%; text-align: center;">
        <h2 style="font-size: 2rem; margin-bottom: 16px;">Trial Expired</h2>
        <p style="color: #6b7280; margin-bottom: 24px;">Your 14-day free trial has ended. Please pay ₹499 to unlock your dashboard.</p>
        <div style="background: #f3f4f6; border: 1px dashed #d1d5d closest; padding: 20px; border-radius: 14px; margin-bottom: 24px;">
            <strong>UPI ID:</strong> <?= htmlspecialchars($gym['upi_id'] ?? 'Not set') ?>
        </div>
        <a href="upi://pay?pa=<?= htmlspecialchars($gym['upi_id'] ?? '') ?>&am=499&cu=INR" class="btn btn-primary" style="text-decoration: none; display: block; text-align: center;">
            Pay Now via UPI
        </a>
        <p style="font-size: 0.8rem; color: #9ca3af; margin-top: 16px;">After payment, contact support to activate your account.</p>
    </div>
</div>
<?php
require_once __DIR__ . '/../layout/footer.php';
?>
