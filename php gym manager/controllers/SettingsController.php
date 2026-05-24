<?php
class SettingsController {
    private SettingsModel $settingsModel;

    public function __construct() {
        $this->settingsModel = new SettingsModel();
    }

    public function get(): void {
        Auth::guard('owner');
        Response::success(['settings' => $this->settingsModel->get(Auth::gymId())]);
    }

    public function save(): void {
        Auth::guard('owner');
        CSRF::assertValid();
        $data = Request::json() ?? $_POST;
        
        $sanitized = [];
        foreach ($data as $k => $v) {
            $sanitized[$k] = Request::sanitize($v);
        }

        // Split gym details and settings
        $gymFields = array_intersect_key($sanitized, array_flip(['gym_name', 'owner_name', 'owner_phone', 'gym_address', 'upi_id']));
        $settingsFields = array_intersect_key($sanitized, array_flip(['template_overdue', 'template_expiring_soon', 'template_expires_today', 'template_expired', 'template_rejoin', 'dead_threshold_days']));

        if (!empty($gymFields)) {
            (new GymModel())->update(Auth::gymId(), $gymFields);
        }

        if ($this->settingsModel->save(Auth::gymId(), $settingsFields)) {
            Response::success(['message' => 'Settings saved']);
        } else {
            Response::error('Save failed');
        }
    }

    public function showPage(): void {
        Auth::guard('owner');
        $gymId = Auth::gymId();
        $db = Database::getInstance();
        $gym = $db->fetch("SELECT * FROM gyms WHERE id = ?", [$gymId]);
        $settings = $this->settingsModel->get($gymId);
        $services = (new ServiceModel())->getActive($gymId);
        
        require_once __DIR__ . '/../views/settings/index.php';
    }
}
