<?php
class AnalyticsController {
    private AnalyticsModel $analyticsModel;

    public function __construct() {
        $this->analyticsModel = new AnalyticsModel();
    }

    public function getData(): void {
        Auth::guard('owner');
        $gymId = Auth::gymId();

        Response::success([
            'stats' => $this->analyticsModel->getStats($gymId),
            'monthly_collections' => $this->analyticsModel->getMonthlyCollections($gymId),
            'member_count_trend' => $this->analyticsModel->getMemberCountTrend($gymId),
            'service_breakdown' => $this->analyticsModel->getServiceBreakdown($gymId),
        ]);
    }

    public function showPage(): void {
        Auth::guard('owner');
        require_once __DIR__ . '/../views/analytics/index.php';
    }
}
