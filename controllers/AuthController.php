<?php
class AuthController {
    public function showLogin(): void {
        require_once __DIR__ . '/../views/auth/login.php';
    }

    public function login(): void {
        CSRF::assertValid();
        $email = Request::post('email');
        $password = Request::post('password');

        if (!$email || !$password) {
            Response::error('Email and password are required');
        }

        $db = Database::getInstance();
        $user = $db->fetch("SELECT * FROM users WHERE email = ?", [$email]);

        if (!$user || !password_verify($password, $user['password'])) {
            Response::error('Invalid email or password');
        }

        // Get gym if it exists
        $gym = $db->fetch("SELECT * FROM gyms WHERE user_id = ?", [$user['id']]);

        Auth::login(
            (int)$user['id'],
            $user['role'],
            $gym ? (int)$gym['id'] : null,
            $gym ? $gym['gym_name'] : ''
        );

        Response::redirect('/dashboard');
    }

    public function logout(): void {
        CSRF::assertValid();
        Auth::logout();
        Response::redirect('/login');
    }

    public function showRegister(): void {
        require_once __DIR__ . '/../views/auth/register.php';
    }

    public function register(): void {
        CSRF::assertValid();
        $email = Request::post('email');
        $password = Request::post('password');

        if (!$email || !$password) {
            Response::error('Email and password are required');
        }

        $db = Database::getInstance();
        if ($db->fetch("SELECT 1 FROM users WHERE email = ?", [$email])) {
            Response::error('Email already registered');
        }

        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        $db->execute(
            "INSERT INTO users (email, password, role) VALUES (?, ?, 'owner')",
            [$email, $hashedPassword]
        );

        Response::redirect('/login');
    }
}
