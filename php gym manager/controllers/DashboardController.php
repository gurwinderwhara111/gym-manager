<?php
class DashboardController {
    public function index(): void {
        Auth::guard('owner');
        
        $userId = Auth::user()['id'];
        $db = Database::getInstance();
        
        // Check if gym exists
        $gym = $db->fetch("SELECT * FROM gyms WHERE user_id = ?", [$userId]);
        if (!$gym) {
            Response::redirect('/setup');
        }
        
        $gymId = (int)$gym['id'];
        
        // Run auto-dead update only on dashboard load
        (new MemberModel())->runAutoDeadUpdate($gymId);
        
        // Calculate trial days for the view

        $trialStart = $gym['trial_start_date'];
        $daysUsed = (int)( (strtotime(date('Y-m-d')) - strtotime($trialStart)) / 86400 );
        
        // Load Data
        $memberModel = new MemberModel();
        $paymentModel = new PaymentModel();
        
        $stats = $memberModel->countsByStatus($gymId);
        $monthlyCollection = $paymentModel->getMonthlyTotal($gymId);
        $services = $db->fetchAll("SELECT * FROM gym_services WHERE gym_id = ? AND is_active = 1", [$gymId]);
        $settings = $db->fetch("SELECT * FROM gym_settings WHERE gym_id = ?", [$gymId]);

        require_once __DIR__ . '/../views/dashboard/index.php';
    }

    public function showPaywall(): void {
        $userId = Auth::user()['id'] ?? 0;
        $db = Database::getInstance();
        $gym = $db->fetch("SELECT * FROM gyms WHERE user_id = ?", [$userId]);
        
        require_once __DIR__ . '/../views/paywall/index.php';
    }
}
