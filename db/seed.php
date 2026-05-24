<?php
require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../core/Database.php';

$db = Database::getInstance();

// Owner user
$ownerPass = password_hash('test1234', PASSWORD_BCRYPT);
$db->execute(
    "INSERT OR IGNORE INTO users (email, password, role) VALUES (?, ?, 'owner')",
    ['owner@gymtest.com', $ownerPass]
);
$ownerId = $db->fetch("SELECT id FROM users WHERE email = ?", ['owner@gymtest.com'])['id'];

// Gym
$db->execute(
    "INSERT OR IGNORE INTO gyms (user_id, gym_name, owner_name, owner_phone, upi_id, trial_start_date)
     VALUES (?, 'Brar Fitness Club', 'Harpreet Brar', '9876543210', 'brar@upi', date('now'))",
    [$ownerId]
);
$gymId = $db->fetch("SELECT id FROM gyms WHERE user_id = ?", [$ownerId])['id'];

// Gym settings (defaults)
$db->execute(
    "INSERT OR IGNORE INTO gym_settings (gym_id) VALUES (?)",
    [$gymId]
);

// Default services
$services = [
    ['Weight Training', 1500],
    ['Cardio',           1000],
    ['Zumba',             800],
];
foreach ($services as [$name, $price]) {
    $db->execute(
        "INSERT OR IGNORE INTO gym_services (gym_id, name, price) VALUES (?, ?, ?)",
        [$gymId, $name, $price]
    );
}
$serviceId = $db->fetch("SELECT id FROM gym_services WHERE gym_id = ? AND name = 'Weight Training'", [$gymId])['id'];

// Test member user (for portal)
$memberPass = password_hash('member123', PASSWORD_BCRYPT);
$db->execute(
    "INSERT OR IGNORE INTO users (email, password, role) VALUES (?, ?, 'member')",
    ['member@gymtest.com', $memberPass]
);
$memberId = $db->fetch("SELECT id FROM users WHERE email = ?", ['member@gymtest.com'])['id'];

// Test member
$today    = date('Y-m-d');
$expiry   = date('Y-m-d', strtotime('+25 days'));
$db->execute(
    "INSERT OR IGNORE INTO members (gym_id, user_id, member_name, phone_number, member_email,
     service_id, service_name, monthly_fee, pending_due, start_date, expiry_date, joined_date, status)
     VALUES (?, ?, 'Gurpreet Singh', '9988776655', 'member@gymtest.com', ?, 'Weight Training', 1500, 200, ?, ?, ?, 'active')",
    [$gymId, $memberId, $serviceId, $today, $expiry, $today]
);

// A few more dummy members
$dummies = [
    ['Sukhdev Kumar',  '9876501234', 'Weight Training', 1500, 0,   '+5 days',  'active'],
    ['Manpreet Kaur',  '9876502345', 'Zumba',            800, 800, '-2 days',  'overdue'],
    ['Rajinder Singh', '9876503456', 'Cardio',           1000, 500, '-70 days', 'dead'],
    ['Amrit Gill',     '9876504567', 'Weight Training', 1500, 0,   '+28 days', 'active'],
];
foreach ($dummies as [$name, $phone, $svcName, $fee, $due, $offset, $status]) {
    $svc = $db->fetch("SELECT id FROM gym_services WHERE gym_id = ? AND name = ?", [$gymId, $svcName]);
    $exp = date('Y-m-d', strtotime($offset));
    $db->execute(
        "INSERT OR IGNORE INTO members (gym_id, member_name, phone_number, service_name, monthly_fee,
         pending_due, start_date, expiry_date, joined_date, status)
         VALUES (?, ?, ?, ?, ?, ?, date('now'), ?, date('now','-30 days'), ?)",
        [$gymId, $name, $phone, $svcName, $fee, $due, $exp, $status]
    );
}

echo "Seed complete.\n";
echo "Owner login:  owner@gymtest.com / test1234\n";
echo "Member login: member@gymtest.com / member123\n";
