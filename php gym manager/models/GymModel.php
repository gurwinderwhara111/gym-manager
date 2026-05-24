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
        $allowed = ['gym_name', 'owner_name', 'owner_phone', 'gym_address', 'upi_id'];
        $filteredData = array_intersect_key($data, array_flip($allowed));

        $fields = [];
        $params = [];
        foreach ($filteredData as $key => $val) {
            $fields[] = "$key = ?";
            $params[] = $val;
        }
        $params[] = $id;
        $sql = "UPDATE gyms SET " . implode(', ', $fields) . " WHERE id = ?";
        return $this->db->execute($sql, $params) > 0;
    }
}
