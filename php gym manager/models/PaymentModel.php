<?php
class PaymentModel {
    private Database $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public function getMonthlyTotal(int $gymId): float {
        $currentMonth = date('Y-m');
        $sql = "SELECT SUM(amount_paid) as total FROM payments WHERE gym_id = ? AND payment_date LIKE ?";
        $res = $this->db->fetch($sql, [$gymId, "$currentMonth%"]);
        return (float)($res['total'] ?? 0);
    }
}
