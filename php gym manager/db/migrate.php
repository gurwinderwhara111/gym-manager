<?php
require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../core/Database.php';

$driver = $_ENV['DB_DRIVER'] ?? 'sqlite';
$schema = $driver === 'mysql'
    ? file_get_contents(__DIR__ . '/schema_mysql.sql')
    : file_get_contents(__DIR__ . '/schema.sql');

$db = getDB();

// Split on semicolons, run each statement
$statements = array_filter(array_map('trim', explode(';', $schema)));
foreach ($statements as $stmt) {
    if (!empty($stmt)) {
        try {
            $db->exec($stmt);
        } catch (Exception $e) {
            echo "\n❌ MIGRATION FAILED\n";
            echo "Statement: $stmt\n";
            echo "Error: " . $e->getMessage() . "\n";
            exit(1);
        }
    }
}

echo "Migration complete ({$driver}).\n";
