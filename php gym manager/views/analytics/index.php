<?php
require_once __DIR__ . '/../layout/header.php';
?>
<div class="page-shell">
    <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <h1>Gym Analytics</h1>
        <a href="/dashboard" class="btn">Back to Dashboard</a>
    </header>

    <div class="stat-cards" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
        <div class="card stat-card" style="text-align:center;">
            <div class="stat-label">Active Members</div>
            <div id="stat-active" class="stat-value">0</div>
        </div>
        <div class="card stat-card" style="text-align:center;">
            <div class="stat-label">Monthly Earnings</div>
            <div id="stat-earnings" class="stat-value">₹0</div>
        </div>
        <div class="card stat-card" style="text-align:center;">
            <div class="stat-label">New Joins</div>
            <div id="stat-joins" class="stat-value">0</div>
        </div>
        <div class="card stat-card" style="text-align:center;">
            <div class="stat-label">Renewals</div>
            <div id="stat-renewals" class="stat-value">0</div>
        </div>
    </div>

    <div class="card">
        <h3>Revenue Trend</h3>
        <canvas id="revenueChart"></canvas>
    </div>

    <div class="card">
        <h3>Member Growth</h3>
        <canvas id="growthChart"></canvas>
    </div>

    <div class="card">
        <h3>Service Distribution</h3>
        <canvas id="serviceChart"></canvas>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="/assets/js/app.js"></script>
<script src="/assets/js/analytics.js"></script>
<?php
require_once __DIR__ . '/../views/layout/footer.php';
?>
