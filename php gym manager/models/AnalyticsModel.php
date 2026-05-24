<?php
class AnalyticsModel {
    private Database $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public function getStats(int $gymId): array {
        $memberModel = new MemberModel();
        $counts = $memberModel->countsByStatus($gymId);
        
        $paymentModel = new PaymentModel();
        $thisMonthCollection = $paymentModel->getMonthlyTotal($gymId);
        
        $driver = $_ENV['DB_DRIVER'] ?? 'sqlite';
        if ($driver === 'sqlite') {
            $joinsSql = "SELECT COUNT(*) as c FROM members WHERE gym_id = ? AND joined_date >= date('now', 'start of month')";
            $renewalsSql = "SELECT COUNT(*) as c FROM member_history WHERE gym_id = ? AND event_type = 'renewed' AND event_date >= date('now', 'start of month')";
        } else {
            $joinsSql = "SELECT COUNT(*) as c FROM members WHERE gym_id = ? AND joined_date >= DATE_FORMAT(NOW(), '%Y-%m-01')";
            $renewalsSql = "SELECT COUNT(*) as c FROM member_history WHERE gym_id = ? AND event_type = 'renewed' AND event_date >= DATE_FORMAT(NOW(), '%Y-%m-01')";
        }

        $newJoins = $this->db->fetch($joinsSql, [$gymId])['c'];
        $renewals = $this->db->fetch($renewalsSql, [$gymId])['c'];
        
        return [
            'total_active' => $counts['active'],
            'total_overdue' => $counts['overdue'],
            'total_dead' => $counts['dead'],
            'new_joins_this_month' => (int)$newJoins,
            'renewals_this_month' => (int)$renewals,
            'this_month_collection' => $thisMonthCollection,
        ];
    }

    public function getMonthlyCollections(int $gymId): array {
        $driver = $_ENV['DB_DRIVER'] ?? 'sqlite';
        
        if ($driver === 'sqlite') {
            $sql = "SELECT strftime('%Y-%m', payment_date) AS month, SUM(amount_paid) AS total 
                    FROM payments WHERE gym_id = ? AND payment_date >= date('now', '-6 months') 
                    GROUP BY month ORDER BY month ASC";
        } else {
            $sql = "SELECT DATE_FORMAT(payment_date, '%Y-%m') AS month, SUM(amount_paid) AS total 
                    FROM payments WHERE gym_id = ? AND payment_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) 
                    GROUP BY month ORDER BY month ASC";
        }
        
        return $this->db->fetchAll($sql, [$gymId]);
    }

    public function getMemberCountTrend(int $gymId): array {
        // Simplified trend for MVP: Count of members joined per month for last 6 months
        $driver = $_ENV['DB_DRIVER'] ?? 'sqlite';
        if ($driver === 'sqlite') {
            $sql = "SELECT strftime('%Y-%m', joined_date) AS month, COUNT(*) as count 
                    FROM members WHERE gym_id = ? AND joined_date >= date('now', '-6 months') 
                    GROUP BY month ORDER BY month ASC";
        } else {
            $sql = "SELECT DATE_FORMAT(joined_date, '%Y-%m') AS month, COUNT(*) as count 
                    FROM members WHERE gym_id = ? AND joined_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) 
                    GROUP BY month ORDER BY month ASC";
        }
        return $this->db->fetchAll($sql, [$gymId]);
    }

    public function getServiceBreakdown(int $gymId): array {
        $sql = "SELECT s.name as service, COUNT(m.id) as count 
                FROM gym_services s 
                JOIN members m ON s.id = m.service_id 
                WHERE s.gym_id = ? AND m.status = 'active' 
                GROUP BY s.name";
        return $this->db->fetchAll($sql, [$gymId]);
    }
}
