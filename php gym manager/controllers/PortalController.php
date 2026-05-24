<?php
class PortalController {
    public function index(): void {
        Auth::guard();
        $user = Auth::user();

        if ($user['role'] === 'owner') {
            Response::redirect('/dashboard');
        }

        $db = Database::getInstance();
        $member = $db->fetch("SELECT * FROM members WHERE user_id = ? LIMIT 1", [$user['id']]);

        if (!$member) {
            require_once __DIR__ . '/../views/layout/header.php';
            echo '<div class="page-shell"><div class="card" style="text-align:center;"><h2>No Membership Found</h2><p>Please contact your gym owner to activate your portal access.</p></div></div>';
            require_once __DIR__ . '/../views/layout/footer.php';
            return;
        }

        // Calculate days left
        $today = strtotime(date('Y-m-d'));
        $expiry = strtotime($member['expiry_date']);
        $daysLeft = (int)round(($expiry - $today) / 86400);
        
        $statusColor = 'text-green-500';
        if ($daysLeft <= 0) $statusColor = 'text-red-500';
        elseif ($daysLeft <= 10) $statusColor = 'text-orange-500';

        require_once __DIR__ . '/../views/portal/index.php';
    }
}
