<?php
// AGENT: This is the ONLY entry point. All URLs route through here.
// Add new routes in the match() block. Never create separate entry PHP files.

require_once __DIR__ . '/config/app.php';
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/core/Database.php';
require_once __DIR__ . '/core/Auth.php';
require_once __DIR__ . '/core/CSRF.php';
require_once __DIR__ . '/core/Request.php';
require_once __DIR__ . '/core/Response.php';
require_once __DIR__ . '/core/Helpers.php';

// Load all models
foreach (glob(__DIR__ . '/models/*.php') as $model) require_once $model;
// Load all controllers
foreach (glob(__DIR__ . '/controllers/*.php') as $ctrl) require_once $ctrl;

Auth::start();

$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// FIX: Remove /index.php from the URI so the router still works with the short command
$uri = str_replace('/index.php', '', $uri);
if ($uri === '') $uri = '/';

match(true) {

    // Auth routes
    $uri === '/login'  && $method === 'GET'  => (new AuthController)->showLogin(),
    $uri === '/login'  && $method === 'POST' => (new AuthController)->login(),
    $uri === '/logout' && $method === 'POST' => (new AuthController)->logout(),
    $uri === '/register' && $method === 'GET'  => (new AuthController)->showRegister(),
    $uri === '/register' && $method === 'POST' => (new AuthController)->register(),

    // Setup
    $uri === '/setup'  && $method === 'GET'  => (new GymController)->showSetup(),
    $uri === '/setup'  && $method === 'POST' => (new GymController)->createGym(),

    // Dashboard
    $uri === '/'        => (new DashboardController)->index(),
    $uri === '/dashboard' => (new DashboardController)->index(),

    // Members (API)
    $uri === '/api/members'            && $method === 'GET'    => (new MemberController)->list(),
    $uri === '/api/members'            && $method === 'POST'   => (new MemberController)->add(),
    $uri === '/api/members/edit'       && $method === 'POST'   => (new MemberController)->edit(),
    $uri === '/api/members/renew'      && $method === 'POST'   => (new MemberController)->renew(),
    $uri === '/api/members/clear-due'     && $method === 'POST'   => (new MemberController)->clearDue(),
    $uri === '/api/members/mark-dead'  && $method === 'POST'   => (new MemberController)->markDead(),
    $uri === '/api/members/rejoin'     && $method === 'POST'   => (new MemberController)->rejoin(),
    $uri === '/api/members/check-duplicate' && $method === 'GET' => (new MemberController)->checkDuplicate(),

    // Services (API)
    $uri === '/api/services'           && $method === 'GET'    => (new ServiceController)->list(),
    $uri === '/api/services'           && $method === 'POST'   => (new ServiceController)->add(),
    $uri === '/api/services/edit'      && $method === 'POST'   => (new ServiceController)->edit(),
    $uri === '/api/services/delete'    && $method === 'POST'   => (new ServiceController)->delete(),

    // Settings (API)
    $uri === '/api/settings'           && $method === 'GET'    => (new SettingsController)->get(),
    $uri === '/api/settings'           && $method === 'POST'   => (new SettingsController)->save(),

    // Analytics (API)
    $uri === '/api/analytics'          && $method === 'GET'    => (new AnalyticsController)->getData(),

    // Export
    $uri === '/export/members'         && $method === 'GET'    => (new ExportController)->members(),
    $uri === '/export/payments'        && $method === 'GET'    => (new ExportController)->payments(),

    // Settings page
    $uri === '/settings'               && $method === 'GET'    => (new SettingsController)->showPage(),

    // Analytics page
    $uri === '/analytics'              && $method === 'GET'    => (new AnalyticsController)->showPage(),

    // Member portal
    $uri === '/portal'                 && $method === 'GET'    => (new PortalController)->index(),
    $uri === '/paywall'                && $method === 'GET'    => (new DashboardController)->showPaywall(),

    default => (function() {
        http_response_code(404);
        echo '404 Not Found';
    })()
};
