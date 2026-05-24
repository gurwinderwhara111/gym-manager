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

        if ($this->settingsModel->save(Auth::gymId(), $sanitized)) {
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
