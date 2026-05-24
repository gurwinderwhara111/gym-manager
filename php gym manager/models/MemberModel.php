<?php
class MemberModel {
    private Database $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public function getAllByGym(int $gymId, string $status = 'all', string $search = ''): array {
        // Run auto-dead logic first
        $this->runAutoDeadUpdate($gymId);

        $sql = "SELECT * FROM members WHERE gym_id = ?";
        $params = [$gymId];

        if ($status !== 'all') {
            if ($status === 'running') {
                $sql .= " AND status = 'active' AND expiry_date >= date('now')";
            } elseif ($status === 'overdue') {
                $sql .= " AND (status IN ('active','overdue') AND (expiry_date < date('now') OR pending_due > 0))";
            } elseif ($status === 'dead') {
                $sql .= " AND status = 'dead'";
            } else {
                $sql .= " AND status = ?";
                $params[] = $status;
            }
        }

        if (!empty($search)) {
            $sql .= " AND (member_name LIKE ? OR phone_number LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }

        $sql .= " ORDER BY CASE WHEN status = 'active' THEN 1 WHEN status = 'overdue' THEN 2 ELSE 3 END, expiry_date ASC";

        return $this->db->fetchAll($sql, $params);
    }

    public function getById(int $id, int $gymId): ?array {
        return $this->db->fetch("SELECT * FROM members WHERE id = ? AND gym_id = ?", [$id, $gymId]);
    }

    public function findByPhone(string $phone, int $gymId): ?array {
        return $this->db->fetch("SELECT * FROM members WHERE phone_number = ? AND gym_id = ?", [$phone, $gymId]);
    }

    public function add(array $data): int {
        $sql = "INSERT INTO members (gym_id, member_name, phone_number, member_email, service_id, service_name, monthly_fee, pending_due, start_date, expiry_date, joined_date, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $this->db->execute($sql, [
            $data['gym_id'],
            $data['member_name'],
            $data['phone_number'],
            $data['member_email'] ?? null,
            $data['service_id'] ?? null,
            $data['service_name'],
            $data['monthly_fee'],
            $data['pending_due'],
            $data['start_date'],
            $data['expiry_date'],
            $data['joined_date'] ?? date('Y-m-d'),
            $data['status'] ?? 'active'
        ]);

        return (int)$this->db->lastInsertId();
    }

    public function edit(int $id, int $gymId, array $data): bool {
        $allowedFields = [
            'member_name', 'phone_number', 'member_email', 
            'service_id', 'service_name', 'monthly_fee', 
            'pending_due', 'notes'
        ];
        
        $fields = [];
        $params = [];
        foreach ($data as $key => $val) {
            if (in_array($key, $allowedFields)) {
                $fields[] = "$key = ?";
                $params[] = $val;
            }
        }
        
        if (empty($fields)) return false;

        $params[] = $id;
        $params[] = $gymId;

        $sql = "UPDATE members SET " . implode(', ', $fields) . ", updated_at = datetime('now') WHERE id = ? AND gym_id = ?";
        return $this->db->execute($sql, $params) > 0;
    }

    public function renew(int $id, int $gymId, int $months = 1): bool {
        $member = $this->getById($id, $gymId);
        if (!$member) return false;

        $currentExpiry = strtotime($member['expiry_date']);
        $today = strtotime(date('Y-m-d'));
        $baseDate = max($today, $currentExpiry);
        $newExpiry = date('Y-m-d', strtotime("+$months months", $baseDate));

        return $this->db->execute(
            "UPDATE members SET expiry_date = ?, status = 'active', last_renewed_at = date('now'), updated_at = datetime('now') WHERE id = ? AND gym_id = ?",
            [$newExpiry, $id, $gymId]
        ) > 0;
    }

    public function markDead(int $id, int $gymId): bool {
        return $this->db->execute(
            "UPDATE members SET status = 'dead', updated_at = datetime('now') WHERE id = ? AND gym_id = ?",
            [$id, $gymId]
        ) > 0;
    }

    public function rejoin(int $id, int $gymId, array $data): bool {
        $sql = "UPDATE members SET 
                status = 'rejoined', 
                start_date = ?, 
                expiry_date = ?, 
                service_id = ?, 
                service_name = ?, 
                monthly_fee = ?, 
                pending_due = 0, 
                last_renewed_at = date('now'), 
                updated_at = datetime('now') 
                WHERE id = ? AND gym_id = ?";
        
        return $this->db->execute($sql, [
            $data['start_date'],
            $data['expiry_date'],
            $data['service_id'],
            $data['service_name'],
            $data['monthly_fee'],
            $id,
            $gymId
        ]) > 0;
    }

    public function countsByStatus(int $gymId): array {
        $results = $this->db->fetchAll("SELECT status, COUNT(*) as count FROM members WHERE gym_id = ? GROUP BY status", [$gymId]);
        $counts = ['active' => 0, 'overdue' => 0, 'dead' => 0, 'all' => 0];
        foreach ($results as $row) {
            $counts[$row['status']] = (int)$row['count'];
            $counts['all'] += (int)$row['count'];
        }
        return $counts;
    }

    public function runAutoDeadUpdate(int $gymId): void {
        $settings = $this->db->fetch("SELECT dead_threshold_days FROM gym_settings WHERE gym_id = ?", [$gymId]);
        $threshold = $settings['dead_threshold_days'] ?? 60;
        $deadCutoff = date('Y-m-d', strtotime("-{$threshold} days"));

        // 1. Active -> Overdue if expired
        $this->db->execute(
            "UPDATE members SET status = 'overdue', updated_at = datetime('now') WHERE gym_id = ? AND status = 'active' AND expiry_date < date('now')",
            [$gymId]
        );

        // 2. Active/Overdue -> Dead if past threshold
        $this->db->execute(
            "UPDATE members SET status = 'dead', updated_at = datetime('now') WHERE gym_id = ? AND status IN ('active','overdue') AND expiry_date < ?",
            [$gymId, $deadCutoff]
        );
    }
}
