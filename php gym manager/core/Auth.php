<?php
class Auth {
    public static function start(): void {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }

    public static function login(int $userId, string $role, ?int $gymId, string $gymName = ''): void {
        session_regenerate_id(true); // Prevent session fixation
        $_SESSION['user_id']  = $userId;
        $_SESSION['role']     = $role;
        $_SESSION['gym_id']   = $gymId;
        $_SESSION['gym_name'] = $gymName;
    }

    public static function logout(): void {
        session_unset();
        session_destroy();
    }

    public static function user(): ?array {
        return isset($_SESSION['user_id']) ? [
            'id'       => $_SESSION['user_id'],
            'role'     => $_SESSION['role'],
            'gym_id'   => $_SESSION['gym_id'],
            'gym_name' => $_SESSION['gym_name'],
        ] : null;
    }

    public static function guard(?string $role = null): void {
        self::start();
        if (!isset($_SESSION['user_id'])) {
            header('Location: /login');
            if (!defined('TEST_MODE')) exit;
        }
        if ($role && $_SESSION['role'] !== $role) {
            header('Location: /dashboard');
            if (!defined('TEST_MODE')) exit;
        }
    }

    public static function gymId(): int {
        return (int)($_SESSION['gym_id'] ?? 0);
    }

    public static function trialGuard(): void {
        $userId = self::user()['id'] ?? 0;
        if (!$userId) return;

        $db = Database::getInstance();
        $gym = $db->fetch("SELECT trial_start_date FROM gyms WHERE user_id = ?", [$userId]);
        
        if ($gym) {
            $start = strtotime($gym['trial_start_date']);
            $today = strtotime(date('Y-m-d'));
            $daysUsed = (int)(($today - $start) / 86400);
            
            if ($daysUsed >= TRIAL_DAYS) {
                // Only redirect if we are not already on the paywall or doing something essential
                $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
                if ($uri !== '/paywall' && !str_contains($uri, '/api/settings')) {
                    header('Location: /paywall');
                    exit;
                }
            }
        }
    }
}
