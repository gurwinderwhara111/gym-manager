<?php
define('TEST_MODE', true);
session_start();
require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../core/Database.php';
require_once __DIR__ . '/../core/Auth.php';
require_once __DIR__ . '/../core/CSRF.php';
require_once __DIR__ . '/../core/Request.php';
require_once __DIR__ . '/../core/Response.php';
require_once __DIR__ . '/../core/Helpers.php';

// Load all models and controllers
foreach (glob(__DIR__ . '/../models/*.php') as $model) require_once $model;
foreach (glob(__DIR__ . '/../controllers/*.php') as $ctrl) require_once $ctrl;

function simulateRequest($uri, $method, $postData = [], $sessionData = []) {
    $_SERVER['REQUEST_URI'] = $uri;
    $_SERVER['REQUEST_METHOD'] = $method;
    $_POST = $postData;
    
    foreach ($sessionData as $k => $v) {
        $_SESSION[$k] = $v;
    }

    ob_start();
    try {
        match(true) {
            $uri === '/login'  && $method === 'GET'  => (new AuthController)->showLogin(),
            $uri === '/login'  && $method === 'POST' => (new AuthController)->login(),
            $uri === '/logout' && $method === 'POST' => (new AuthController)->logout(),
            $uri === '/setup'  && $method === 'GET'  => (new GymController)->showSetup(),
            $uri === '/setup'  && $method === 'POST' => (new GymController)->createGym(),
            $uri === '/dashboard' => (new DashboardController)->index(),
            $uri === '/api/members'            && $method === 'GET'    => (new MemberController)->list(),
            $uri === '/api/members'            && $method === 'POST'   => (new MemberController)->add(),
            $uri === '/api/members/renew'      && $method === 'POST'   => (new MemberController)->renew(),
            $uri === '/api/members/clear-due'  && $method === 'POST'   => (new MemberController)->clearDue(),
            $uri === '/api/analytics'          && $method === 'GET'    => (new AnalyticsController)->getData(),
            $uri === '/api/settings'           && $method === 'GET'    => (new SettingsController)->get(),
            $uri === '/api/settings'           && $method === 'POST'   => (new SettingsController)->save(),
            $uri === '/export/members'         && $method === 'GET'    => (new ExportController)->members(),
            default => print "404 Not Found"
        };
    } catch (Exception $e) {
        echo "Exception: " . $e->getMessage();
    }
    return ob_get_clean();
}

// --- TEST SUITE ---
echo "Starting Integration Tests...\n";

// 1. Test Login
echo "Testing Login... ";
$_SESSION = [];
$csrf = CSRF::token();
$loginResponse = simulateRequest('/login', 'POST', [
    'email' => 'owner@gymtest.com',
    'password' => 'test1234',
    'csrf_token' => $csrf
], []);
if (isset($_SESSION['user_id']) && $_SESSION['user_id'] > 0) {
    echo "✅ SUCCESS\n";
} else {
    echo "❌ FAILED (Session not set)\n";
}

// 2. Test Dashboard Access
echo "Testing Dashboard Access... ";
$dashboardResponse = simulateRequest('/dashboard', 'GET', [], [
    'user_id' => 1,
    'role' => 'owner',
    'gym_id' => 1,
    'gym_name' => 'Brar Fitness Club'
]);
if (str_contains($dashboardResponse, 'Monthly Collection')) {
    echo "✅ SUCCESS\n";
} else {
    echo "❌ FAILED (Dashboard not rendered)\n";
}

// 3. Test API: Members List
echo "Testing Member List API... ";
$membersResponse = simulateRequest('/api/members', 'GET', [], [
    'user_id' => 1,
    'role' => 'owner',
    'gym_id' => 1
]);
$data = json_decode($membersResponse, true);
if (isset($data['success']) && $data['success'] === true && isset($data['members'])) {
    echo "✅ SUCCESS (Count: " . count($data['members']) . ")\n";
} else {
    echo "❌ FAILED: " . $membersResponse . "\n";
}

// 4. Test API: Add Member
echo "Testing Add Member API... ";
$addResponse = simulateRequest('/api/members', 'POST', [
    'member_name' => 'Test User ' . time(),
    'phone_number' => '123456789' . rand(0,9),
    'service_id' => 1,
    'service_name' => 'Weight Training',
    'monthly_fee' => 1000,
    'amount_paid' => 1000,
    'start_date' => date('Y-m-d'),
    'csrf_token' => CSRF::token()
], [
    'user_id' => 1,
    'role' => 'owner',
    'gym_id' => 1
]);
$data = json_decode($addResponse, true);
if (isset($data['success']) && $data['success'] === true) {
    echo "✅ SUCCESS\n";
} else {
    echo "❌ FAILED: " . $addResponse . "\n";
}

// 5. Test API: Renew Member
echo "Testing Renew Member API... ";
$memberId = 1; 
$renewResponse = simulateRequest('/api/members/renew', 'POST', [
    'id' => $memberId,
    'months' => 1,
    'csrf_token' => CSRF::token()
], [
    'user_id' => 1,
    'role' => 'owner',
    'gym_id' => 1
]);
$data = json_decode($renewResponse, true);
if (isset($data['success']) && $data['success'] === true) {
    echo "✅ SUCCESS\n";
} else {
    echo "❌ FAILED: " . $renewResponse . "\n";
}

// 6. Test API: Analytics
echo "Testing Analytics API... ";
$analyticsResponse = simulateRequest('/api/analytics', 'GET', [], [
    'user_id' => 1,
    'role' => 'owner',
    'gym_id' => 1
]);
$data = json_decode($analyticsResponse, true);
if (isset($data['success']) && $data['success'] === true && isset($data['stats'])) {
    echo "✅ SUCCESS\n";
} else {
    echo "❌ FAILED: " . $analyticsResponse . "\n";
}

echo "\nTests completed.\n";
