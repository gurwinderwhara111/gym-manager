<?php
class SettingsModel {
    private Database $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public function get(int $gymId): ?array {
        return $this->db->fetch("SELECT * FROM gym_settings WHERE gym_id = ?", [$gymId]);
    }

    public function save(int $gymId, array $data): bool {
        // Whitelist allowed keys to prevent SQL injection via array keys
        $allowedKeys = [
            'template_overdue', 'template_expiring_soon', 'template_expires_today',
            'template_expired', 'template_rejoin', 'dead_threshold_days'
        ];
        $filteredData = array_intersect_key($data, array_flip($allowedKeys));

        // Insert or Update
        $existing = $this->get($gymId);
        if ($existing) {
            $fields = [];
            $params = [];
            foreach ($filteredData as $k => $v) {
                $fields[] = "$k = ?";
                $params[] = $v;
            }
            $params[] = $gymId;
            $sql = "UPDATE gym_settings SET " . implode(', ', $fields) . ", updated_at = datetime('now') WHERE gym_id = ?";
            return $this->db->execute($sql, $params) > 0;
        } else {
            $cols = implode(', ', array_keys($filteredData));
            $placeholders = implode(', ', array_fill(0, count($filteredData), '?'));
            $sql = "INSERT INTO gym_settings (gym_id, $cols) VALUES (?, $placeholders)";
            $params = array_merge([$gymId], array_values($filteredData));
            return $this->db->execute($sql, $params) > 0;
        }
    }
}
