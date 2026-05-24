<?php
class MemberController {
    private MemberModel $memberModel;

    public function __construct() {
        $this->memberModel = new MemberModel();
    }

    public function list(): void {
        Auth::guard('owner');
        $gymId = Auth::gymId();
        $tab = Request::get('tab', 'all');
        $search = Request::get('search', '');

        $members = $this->memberModel->getAllByGym($gymId, $tab, $search);
        
        // Attach WhatsApp links
        $db = Database::getInstance();
        $settings = $db->fetch("SELECT * FROM gym_settings WHERE gym_id = ?", [$gymId]);
        $gym = $db->fetch("SELECT gym_name FROM gyms WHERE id = ?", [$gymId]);
        $gymName = $gym['gym_name'] ?? '';

        foreach ($members as &$m) {
            $m['whatsapp_link'] = buildWhatsappLink($m, $settings, $gymName);
        }

        Response::success(['members' => $members]);
    }

    public function add(): void {
        Auth::guard('owner');
        CSRF::assertValid();

        $data = Request::json() ?? $_POST;
        $gymId = Auth::gymId();

        $name = Request::sanitize($data['member_name'] ?? '');
        $phone = preg_replace('/\D/', '', $data['phone_number'] ?? '');
        $serviceId = (int)($data['service_id'] ?? 0);
        $fee = (float)($data['monthly_fee'] ?? 0);
        $paid = (float)($data['amount_paid'] ?? 0);
        $startDate = $data['start_date'] ?? date('Y-m-d');

        if (!$name || strlen($phone) !== 10) {
            Response::error('Valid name and 10-digit phone are required');
        }

        // Check duplicate
        $existing = $this->memberModel->findByPhone($phone, $gymId);
        if ($existing) {
            if ($existing['status'] === 'dead') {
                Response::success([
                    'duplicate' => true,
                    'canRejoin' => true,
                    'memberId' => $existing['id'],
                    'name' => $existing['member_name']
                ]);
            }
            Response::error('Member with this phone already exists');
        }

        // Fetch service name
        $db = Database::getInstance();
        $service = $db->fetch("SELECT name FROM gym_services WHERE id = ? AND gym_id = ?", [$serviceId, $gymId]);
        if (!$service) {
            Response::error('Invalid service selected');
        }

        $expiryDate = date('Y-m-d', strtotime($startDate . ' + 30 days'));
        $pendingDue = max(0, $fee - $paid);

        $memberId = $this->memberModel->add([
            'gym_id' => $gymId,
            'member_name' => $name,
            'phone_number' => $phone,
            'service_id' => $serviceId,
            'service_name' => $service['name'],
            'monthly_fee' => $fee,
            'pending_due' => $pendingDue,
            'start_date' => $startDate,
            'expiry_date' => $expiryDate,
            'status' => 'active'
        ]);

        // Log first payment
        if ($paid > 0) {
            $db->execute(
                "INSERT INTO payments (gym_id, member_id, amount_paid, payment_date, note) VALUES (?, ?, ?, date('now'), 'first_payment')",
                [$gymId, $memberId, $paid]
            );
        }

        // Log history
        $db->execute(
            "INSERT INTO member_history (gym_id, member_id, event_type, event_date) VALUES (?, ?, 'joined', date('now'))",
            [$gymId, $memberId]
        );

        Response::success(['memberId' => $memberId, 'message' => 'Member added successfully']);
    }

    public function edit(): void {
        Auth::guard('owner');
        CSRF::assertValid();

        $id = (int)Request::post('id');
        $gymId = Auth::gymId();
        $data = Request::json() ?? $_POST;
        
        unset($data['id']);
        $sanitizedData = [];
        foreach ($data as $k => $v) {
            $sanitizedData[$k] = Request::sanitize($v);
        }

        if ($this->memberModel->edit($id, $gymId, $sanitizedData)) {
            Response::success(['message' => 'Member updated']);
        } else {
            Response::error('Update failed');
        }
    }

    public function renew(): void {
        Auth::guard('owner');
        CSRF::assertValid();

        $id = (int)Request::post('id');
        $gymId = Auth::gymId();
        $months = (int)(Request::post('months') ?? 1);

        if ($this->memberModel->renew($id, $gymId, $months)) {
            $member = $this->memberModel->getById($id, $gymId);
            $db = Database::getInstance();
            $db->execute(
                "INSERT INTO payments (gym_id, member_id, amount_paid, payment_date, note) VALUES (?, ?, ?, date('now'), 'renewal')",
                [$gymId, $id, $member['monthly_fee']]
            );
            $db->execute(
                "INSERT INTO member_history (gym_id, member_id, event_type, event_date) VALUES (?, ?, 'renewed', date('now'))",
                [$gymId, $id]
            );
            Response::success(['message' => 'Member renewed']);
        } else {
            Response::error('Renewal failed');
        }
    }

    public function clearDue(): void {
        Auth::guard('owner');
        CSRF::assertValid();

        $id = (int)Request::post('id');
        $gymId = Auth::gymId();
        $amount = (float)Request::post('amount');

        if ($amount <= 0) {
            Response::error('Invalid amount');
        }

        $db = Database::getInstance();
        $member = $db->fetch("SELECT * FROM members WHERE id = ? AND gym_id = ?", [$id, $gymId]);
        if (!$member) Response::error('Member not found');

        $newDue = max(0, $member['pending_due'] - $amount);

        $db->execute(
            "UPDATE members SET pending_due = ?, updated_at = datetime('now') WHERE id = ? AND gym_id = ?",
            [$newDue, $id, $gymId]
        );

        $db->execute(
            "INSERT INTO payments (gym_id, member_id, amount_paid, payment_date, note) VALUES (?, ?, ?, date('now'), 'clear_due')",
            [$gymId, $id, $amount]
        );

        Response::success(['message' => 'Due cleared successfully']);
    }

    public function markDead(): void {
        Auth::guard('owner');
        CSRF::assertValid();

        $id = (int)Request::post('id');
        $gymId = Auth::gymId();

        if ($this->memberModel->markDead($id, $gymId)) {
            $db = Database::getInstance();
            $db->execute(
                "INSERT INTO member_history (gym_id, member_id, event_type, event_date) VALUES (?, ?, 'marked_dead', date('now'))",
                [$gymId, $id]
            );
            Response::success(['message' => 'Member marked as dead']);
        } else {
            Response::error('Operation failed');
        }
    }

    public function rejoin(): void {
        Auth::guard('owner');
        CSRF::assertValid();

        $id = (int)Request::post('id');
        $gymId = Auth::gymId();
        $data = Request::json() ?? $_POST;

        $startDate = $data['start_date'] ?? date('Y-m-d');
        $expiryDate = date('Y-m-d', strtotime($startDate . ' + 30 days'));
        
        $rejoinData = [
            'start_date' => $startDate,
            'expiry_date' => $expiryDate,
            'service_id' => (int)$data['service_id'],
            'service_name' => Request::sanitize($data['service_name']),
            'monthly_fee' => (float)$data['monthly_fee'],
        ];

        if ($this->memberModel->rejoin($id, $gymId, $rejoinData)) {
            $db = Database::getInstance();
            $db->execute(
                "INSERT INTO member_history (gym_id, member_id, event_type, event_date) VALUES (?, ?, 'rejoined', date('now'))",
                [$gymId, $id]
            );
            Response::success(['message' => 'Member rejoined']);
        } else {
            Response::error('Rejoin failed');
        }
    }

    public function checkDuplicate(): void {
        Auth::guard('owner');
        $phone = preg_replace('/\D/', '', Request::get('phone', ''));
        $gymId = Auth::gymId();

        $member = $this->memberModel->findByPhone($phone, $gymId);
        if ($member) {
            Response::success([
                'found' => true,
                'status' => $member['status'],
                'name' => $member['member_name'],
                'canRejoin' => ($member['status'] === 'dead')
            ]);
        }
        Response::success(['found' => false]);
    }
}
