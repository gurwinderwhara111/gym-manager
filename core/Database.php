<?php
// AGENT: ALL database access goes through this class.
// NEVER use getDB() directly in controllers or models — use Database::getInstance().

class Database {
    private static ?Database $instance = null;
    private PDO $pdo;

    private function __construct() {
        $this->pdo = getDB();
    }

    public static function getInstance(): self {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    // Run a query with bound params, return statement
    public function query(string $sql, array $params = []): PDOStatement {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    // Fetch one row
    public function fetch(string $sql, array $params = []): ?array {
        $result = $this->query($sql, $params)->fetch();
        return $result ?: null;
    }

    // Fetch all rows
    public function fetchAll(string $sql, array $params = []): array {
        return $this->query($sql, $params)->fetchAll();
    }

    // Execute INSERT/UPDATE/DELETE, return affected rows
    public function execute(string $sql, array $params = []): int {
        return $this->query($sql, $params)->rowCount();
    }

    // Get last inserted ID
    public function lastInsertId(): string {
        return $this->pdo->lastInsertId();
    }

    // Transaction helpers
    public function beginTransaction(): void { $this->pdo->beginTransaction(); }
    public function commit(): void { $this->pdo->commit(); }
    public function rollBack(): void { $this->pdo->rollBack(); }
}
