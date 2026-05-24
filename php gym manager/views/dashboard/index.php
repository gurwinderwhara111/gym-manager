<?php
require_once __DIR__ . '/../layout/header.php';
?>
<div class="page-shell">
    <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
            <h1 style="margin:0; font-size: 1.5rem;"><?= htmlspecialchars($gym['gym_name']) ?></h1>
            <p style="margin:0; font-size: 0.8rem; color: #6b7280;">Trial: <?= TRIAL_DAYS - ($daysUsed ?? 0) ?> days left</p>
        </div>
        <form action="/logout" method="POST">
            <?= CSRF::field() ?>
            <button type="submit" class="btn btn-danger" style="padding: 8px 16px;">Logout</button>
        </form>
    </header>

    <div class="cash-header card" style="background: #dcfce7; color: #166534; text-align: center; padding: 20px; border-radius: 16px; margin-bottom: 24px;">
        <p style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; margin: 0;">Monthly Collection</p>
        <h2 style="font-size: 2.5rem; margin: 10px 0;">₹<?= number_format($monthlyCollection, 0) ?></h2>
    </div>

    <div class="search-container" style="margin-bottom: 20px;">
        <input type="text" id="member-search" class="search-bar" placeholder="Search members by name or phone..." style="width: 100%; padding: 12px; border: 1px solid #e5e7eb; border-radius: 12px; font-size: 1rem;">
    </div>

    <div class="tab-group" style="display: flex; background: #f3f4f6; border-radius: 14px; padding: 4px; gap: 4px; margin-bottom: 24px;">
        <button class="btn tab-btn active" data-tab="running">Running <span class="tab-count"><?= $stats['active'] ?></span></button>
        <button class="btn tab-btn" data-tab="overdue">Overdue <span class="tab-count"><?= $stats['overdue'] ?></span></button>
        <button class="btn tab-btn" data-tab="all">All <span class="tab-count"><?= $stats['all'] ?></span></button>
        <button class="btn tab-btn" data-tab="dead">Dead <span class="tab-count"><?= $stats['dead'] ?></span></button>
    </div>

    <div id="member-list" style="min-height: 300px;">
        <!-- Loaded via JS -->
    </div>

    <button onclick="openAddMemberModal()" class="btn btn-primary" style="position: fixed; bottom: 24px; right: 24px; width: auto; border-radius: 99px; padding: 16px 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
        + Add Member
    </button>

    <!-- Add Member Modal -->
    <div id="add-member-modal" style="display:none; position: fixed; inset:0; background: rgba(0,0,0,0.5); z-index: 100; align-items: center; justify-content: center;">
        <div class="card" style="width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
            <h3>Add New Member</h3>
            <form id="add-member-form" style="display: grid; gap: 15px;">
                <?= CSRF::field() ?>
                <div>
                    <label>Full Name *</label>
                    <input type="text" name="member_name" required>
                </div>
                <div>
                    <label>Phone Number *</label>
                    <input type="tel" name="phone_number" required maxlength="10">
                </div>
                <div>
                    <label>Service</label>
                    <select name="service_id">
                        <?php foreach ($services as $s): ?>
                            <option value="<?= $s['id'] ?>"><?= htmlspecialchars($s['name']) ?> (₹<?= $s['price'] ?>)</option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>
                        <label>Monthly Fee</label>
                        <input type="number" name="monthly_fee" value="1500">
                    </div>
                    <div>
                        <label>Paid Today</label>
                        <input type="number" name="amount_paid" value="0">
                    </div>
                </div>
                <div>
                    <label>Start Date</label>
                    <div style="display: flex; gap: 5px; margin-bottom: 8px;">
                        <button type="button" onclick="setQuickDate('today')" class="btn" style="flex:1; padding: 5px; font-size: 0.7rem; background: #f3f4f6; color: #333;">Today</button>
                        <button type="button" onclick="setQuickDate('yesterday')" class="btn" style="flex:1; padding: 5px; font-size: 0.7rem; background: #f3f4f6; color: #333;">Yesterday</button>
                        <button type="button" onclick="setQuickDate('custom')" class="btn" style="flex:1; padding: 5px; font-size: 0.7rem; background: #e5e7eb; color: #333;">Custom</button>
                    </div>
                    <input type="date" name="start_date" id="add-member-start-date" value="<?= date('Y-m-d') ?>">
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" onclick="closeAddMemberModal()" class="btn">Cancel</button>
                    <button type="submit" class="btn btn-primary" style="width: auto;">Save Member</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Clear Due Modal -->
    <div id="clear-due-modal" style="display:none; position: fixed; inset:0; background: rgba(0,0,0,0.5); z-index: 100; align-items: center; justify-content: center;">
        <div class="card" style="width: 90%; max-width: 400px;">
            <h3>Clear Pending Due</h3>
            <p id="clear-due-member-name" style="font-weight: 700; margin-bottom: 5px;"></p>
            <div style="background: #fee2e2; color: #b91c1c; padding: 15px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
                <span style="font-size: 0.8rem; color: #b91c1c;">Total Pending</span><br>
                <strong id="clear-due-total" style="font-size: 1.8rem;">₹0</strong>
            </div>
            <form id="clear-due-form" style="display: grid; gap: 15px;">
                <?= CSRF::field() ?>
                <input type="hidden" name="id" id="clear-due-id">
                <div>
                    <label>Amount to Clear</label>
                    <input type="number" name="amount" id="clear-due-amount" required step="0.01">
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" onclick="closeClearDueModal()" class="btn">Cancel</button>
                    <button type="button" id="btn-clear-all" class="btn" style="background:#f59e0b; color:#fff;">Clear All</button>
                    <button type="submit" class="btn btn-primary" style="width: auto;">Update Ledger</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Rejoin Modal -->
    <div id="rejoin-modal" style="display:none; position: fixed; inset:0; background: rgba(0,0,0,0.5); z-index: 100; align-items: center; justify-content: center;">
        <div class="card" style="width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
            <h3>Member Rejoining</h3>
            <p id="rejoin-member-name" style="font-weight: 700; margin-bottom: 20px;"></p>
            <form id="rejoin-form" style="display: grid; gap: 15px;">
                <?= CSRF::field() ?>
                <input type="hidden" name="id" id="rejoin-id">
                <div>
                    <label>Service</label>
                    <select name="service_id" id="rejoin-service-id">
                        <?php foreach ($services as $s): ?>
                            <option value="<?= $s['id'] ?>"><?= htmlspecialchars($s['name']) ?> (₹<?= $s['price'] ?>)</option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div>
                    <label>Service Name (for record)</label>
                    <input type="text" name="service_name" id="rejoin-service-name" required>
                </div>
                <div>
                    <label>Monthly Fee</label>
                    <input type="number" name="monthly_fee" id="rejoin-monthly-fee" required>
                </div>
                <div>
                    <label>Start Date</label>
                    <div style="display: flex; gap: 5px; margin-bottom: 8px;">
                        <button type="button" onclick="setQuickDate('today', 'rejoin-start-date')" class="btn" style="flex:1; padding: 5px; font-size: 0.7rem; background: #f3f4f6; color: #333;">Today</button>
                        <button type="button" onclick="setQuickDate('yesterday', 'rejoin-start-date')" class="btn" style="flex:1; padding: 5px; font-size: 0.7rem; background: #f3f4f6; color: #333;">Yesterday</button>
                        <button type="button" onclick="setQuickDate('custom', 'rejoin-start-date')" class="btn" style="flex:1; padding: 5px; font-size: 0.7rem; background: #e5e7eb; color: #333;">Custom</button>
                    </div>
                    <input type="date" name="start_date" id="rejoin-start-date" value="<?= date('Y-m-d') ?>">
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" onclick="closeRejoinModal()" class="btn">Cancel</button>
                    <button type="submit" class="btn btn-primary" style="width: auto;">Confirm Rejoin</button>
                </div>
            </form>
        </div>
    </div>

                <div>
                    <label>Phone Number *</label>
                    <input type="tel" name="phone_number" required maxlength="10">
                </div>
                <div>
                    <label>Service</label>
                    <select name="service_id">
                        <?php foreach ($services as $s): ?>
                            <option value="<?= $s['id'] ?>"><?= htmlspecialchars($s['name']) ?> (₹<?= $s['price'] ?>)</option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>
                        <label>Monthly Fee</label>
                        <input type="number" name="monthly_fee" value="1500">
                    </div>
                    <div>
                        <label>Paid Today</label>
                        <input type="number" name="amount_paid" value="0">
                    </div>
                </div>
                    <div>
                        <label>Start Date</label>
                        <div style="display: flex; gap: 5px; margin-bottom: 8px;">
                            <button type="button" onclick="setQuickDate('today')" class="btn" style="flex:1; padding: 5px; font-size: 0.7rem; background: #f3f4f6; color: #333;">Today</button>
                            <button type="button" onclick="setQuickDate('yesterday')" class="btn" style="flex:1; padding: 5px; font-size: 0.7rem; background: #f3f4f6; color: #333;">Yesterday</button>
                            <button type="button" onclick="setQuickDate('custom')" class="btn" style="flex:1; padding: 5px; font-size: 0.7rem; background: #e5e7eb; color: #333;">Custom</button>
                        </div>
                        <input type="date" name="start_date" id="add-member-start-date" value="<?= date('Y-m-d') ?>">
                    </div>

                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" onclick="closeAddMemberModal()" class="btn">Cancel</button>
                    <button type="submit" class="btn btn-primary" style="width: auto;">Save Member</button>
                </div>
            </form>
        </div>
    </div>
</div>

<script src="/assets/js/app.js"></script>
<script src="/assets/js/offline.js"></script>
<script src="/assets/js/dashboard.js"></script>
<?php
require_once __DIR__ . '/../layout/footer.php';
?>
