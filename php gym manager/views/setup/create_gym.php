<?php
require_once __DIR__ . '/../layout/header.php';
?>
<div class="page-shell">
    <div class="card" style="max-width: 500px; margin: 40px auto;">
        <h2>Setup Your Gym</h2>
        <p>Complete these details to start tracking your members</p>
        <form action="/setup" method="POST" style="margin-top: 20px;">
            <?= CSRF::field() ?>
            <div style="margin-bottom: 15px;">
                <label>Gym Name *</label>
                <input type="text" name="gym_name" required placeholder="e.g. Brar Fitness Club">
            </div>
            <div class="form-row">
                <div style="margin-bottom: 15px;">
                    <label>Owner Name</label>
                    <input type="text" name="owner_name" placeholder="Your Name">
                </div>
                <div style="margin-bottom: 15px;">
                    <label>Phone Number</label>
                    <input type="tel" name="owner_phone" placeholder="9876543210">
                </div>
            </div>
            <div style="margin-bottom: 15px;">
                <label>Gym Address</label>
                <input type="text" name="gym_address" placeholder="Street, City, State">
            </div>
            <div style="margin-bottom: 20px;">
                <label>UPI ID (for payments)</label>
                <input type="text" name="upi_id" placeholder="yourname@upi">
            </div>
            <button type="submit" class="btn btn-primary">Create Gym & Start</button>
        </form>
    </div>
</div>
<?php
require_once __DIR__ . '/../layout/footer.php';
?>
