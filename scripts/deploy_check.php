<?php
require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../core/Database.php';

$errors = [];

echo "Running Pre-Deployment Check...\n";

// 1. Check .env exists
if (!file_exists(__DIR__ . '/../.env')) $errors[] = '.env file missing';

// 2. Check DB connects
try { 
    $db = getDB(); 
    echo "✅ DB connected\n"; 
} catch (Exception $e) { 
    $errors[] = 'DB connection failed: ' . $e->getMessage(); 
}

// 3. Check all tables exist
if (isset($db)) {
    $tables = ['users','gyms','members','payments','gym_services','gym_settings','member_history'];
    foreach ($tables as $t) {
        try { 
            $db->query("SELECT 1 FROM $t LIMIT 1"); 
            echo "✅ Table: $t\n"; 
        } catch (Exception $e) { 
            $errors[] = "Missing table: $t"; 
        }
    }
}

// 4. Check APP_SECRET is not default
if (($_ENV['APP_SECRET'] ?? '') === 'CHANGE_THIS') {
    $errors[] = 'APP_SECRET not changed from default';
}

if (count($errors) > 0) {
    echo "\n❌ DEPLOYMENT BLOCKED:\n";
    foreach ($errors as $e) echo "  - $e\n";
    exit(1);
}

echo "\n✅ All checks passed. Safe to deploy.\n";
