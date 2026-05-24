<?php
class GymModel {
    private Database $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public function getById(int $id): ?array {
        return $this->db->fetch("SELECT * FROM gyms WHERE id = ?", [$id]);
    }

    public function getByUserId(int $userId): ?array {
        return $this->db->fetch("SELECT * FROM gyms WHERE user_id = ?", [$userId]);
    }

    public function update(int $id, array $data): bool {
        $fields = [];
        $params = [];
        foreach ($data as $key => $val) {
            $fields[] = "$key = ?";
            $params[] = $val;
        }
        $params[] = $id;
        $sql = "UPDATE gyms SET " . implode(', ', $fields) . " WHERE id = ?";
        return $this->db->execute($sql, $params) > 0;
    }
}
