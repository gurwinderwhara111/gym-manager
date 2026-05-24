<?php
class ExportController {
    public function members(): void {
        Auth::guard('owner');
        $gymId = Auth::gymId();
        
        $db = Database::getInstance();
        $members = $db->fetchAll(
            "SELECT member_name, phone_number, member_email, service_name, monthly_fee, pending_due, start_date, expiry_date, joined_date, status, last_renewed_at 
             FROM members WHERE gym_id = ? ORDER BY member_name ASC", 
            [$gymId]
        );

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="members_' . date('Y-m-d') . '.csv"');

        $out = fopen('php://output', 'w');
        fprintf($out, chr(0xEF).chr(0xBB).chr(0xBF)); // UTF-8 BOM for Excel

        fputcsv($out, [
            'Name', 'Phone', 'Email', 'Service', 'Monthly Fee',
            'Pending Due', 'Start Date', 'Expiry Date', 'Joined Date',
            'Status', 'Last Renewed'
        ]);

        foreach ($members as $m) {
            fputcsv($out, $m);
        }
        fclose($out);
        exit;
    }

    public function payments(): void {
        Auth::guard('owner');
        $gymId = Auth::gymId();

        $db = Database::getInstance();
        $payments = $db->fetchAll(
            "SELECT p.payment_date, m.member_name, m.phone_number, m.service_name, p.amount_paid, p.note 
             FROM payments p 
             JOIN members m ON p.member_id = m.id 
             WHERE p.gym_id = ? 
             ORDER BY p.payment_date DESC", 
            [$gymId]
        );

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="payments_' . date('Y-m-d') . '.csv"');

        $out = fopen('php://output', 'w');
        fprintf($out, chr(0xEF).chr(0xBB).chr(0xBF)); // UTF-8 BOM for Excel

        fputcsv($out, ['Date', 'Member Name', 'Phone', 'Service', 'Amount Paid', 'Note']);

        foreach ($payments as $p) {
            fputcsv($out, $p);
        }
        fclose($out);
        exit;
    }
}
