<?php
// AGENT: Load .env FIRST before anything else. Use this file as the bootstrap.

$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) continue;
        [$key, $val] = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($val);
    }
}

define('APP_NAME',   $_ENV['APP_NAME']   ?? 'Gym Manager');
define('APP_ENV',    $_ENV['APP_ENV']    ?? 'development');
define('APP_SECRET', $_ENV['APP_SECRET'] ?? 'changeme');
define('TRIAL_DAYS', (int)($_ENV['TRIAL_DAYS'] ?? 14));
