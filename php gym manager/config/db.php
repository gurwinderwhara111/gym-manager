<?php
// AGENT: This file is the ONLY place that reads DB_DRIVER.
// NEVER reference SQLite or MySQL directly outside this file.

function getDB(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $driver = $_ENV['DB_DRIVER'] ?? 'sqlite';

    if ($driver === 'sqlite') {
        $path = $_ENV['DB_SQLITE_PATH'] ?? '__DIR__/db/gym.db';
        
        // If path contains __DIR__, resolve it relative to this config file
        if (str_contains($path, '__DIR__')) {
            $path = str_replace('__DIR__', __DIR__ . '/..', $path);
        }
        
        $pdo = new PDO('sqlite:' . $path);
        $pdo->exec('PRAGMA foreign_keys = ON;');
        $pdo->exec('PRAGMA journal_mode = WAL;');
    } elseif ($driver === 'mysql') {

        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            $_ENV['DB_HOST'],
            $_ENV['DB_PORT'] ?? 3306,
            $_ENV['DB_NAME']
        );
        $pdo = new PDO($dsn, $_ENV['DB_USER'], $_ENV['DB_PASS']);
    } else {
        throw new RuntimeException("Unknown DB_DRIVER: $driver");
    }

    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    return $pdo;
}
