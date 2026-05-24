<?php
class ServiceModel {
    private Database $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public function getActive(int $gymId): array {
        return $this->db->fetchAll("SELECT * FROM gym_services WHERE gym_id = ? AND is_active = 1", [$gymId]);
    }

    public function getById(int $id, int $gymId): ?array {
        return $this->db->fetch("SELECT * FROM gym_services WHERE id = ? AND gym_id = ?", [$id, $gymId]);
    }

    public function add(array $data): int {
        $this->db->execute(
            "INSERT INTO gym_services (gym_id, name, price) VALUES (?, ?, ?)",
            [$data['gym_id'], $data['name'], $data['price']]
        );
        return (int)$this->db->lastInsertId();
    }

    public function edit(int $id, int $gymId, array $data): bool {
        return $this->db->execute(
            "UPDATE gym_services SET name = ?, price = ? WHERE id = ? AND gym_id = ?",
            [$data['name'], $data['price'], $id, $gymId]
        ) > 0;
    }

    public function delete(int $id, int $gymId): bool {
        // Soft delete
        return $this->db->execute(
            "UPDATE gym_services SET is_active = 0 WHERE id = ? AND gym_id = ?",
            [$id, $gymId]
        ) > 0;
    }
}
