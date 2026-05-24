<?php
class HistoryModel {
    private Database $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public function log(int $gymId, int $memberId, string $eventType, string $details = ''): void {
        $this->db->execute(
            "INSERT INTO member_history (gym_id, member_id, event_type, event_date, details) VALUES (?, ?, ?, date('now'), ?)",
            [$gymId, $memberId, $eventType, $details]
        );
    }

    public function getByMember(int $memberId): array {
        return $this->db->fetchAll("SELECT * FROM member_history WHERE member_id = ? ORDER BY event_date DESC", [$memberId]);
    }
}
