<?php
function formatDate(string $date, string $format = 'd/m/Y'): string {
    return date($format, strtotime($date));
}

function daysLeft(string $expiryDate): int {
    $today = strtotime(date('Y-m-d'));
    $expiry = strtotime($expiryDate);
    return (int)round(($expiry - $today) / 86400);
}

function isExpired(string $expiryDate): bool {
    return daysLeft($expiryDate) < 0;
}

function buildWhatsappLink(array $member, array $settings, string $gymName): string {
    $phone = preg_replace('/\D/', '', $member['phone_number']);
    if (strlen($phone) === 10) $phone = '91' . $phone;

    $today    = date('Y-m-d');
    $expiry   = $member['expiry_date'];
    $daysDiff = (int)round((strtotime($expiry) - strtotime($today)) / 86400);
    $due      = (float)$member['pending_due'];

    if ($due > 0) {
        $template = $settings['template_overdue'] ?? 'Hi {name}, your pending due is ₹{due}.';
    } elseif ($daysDiff > 0) {
        $template = $settings['template_expiring_soon'] ?? 'Hi {name}, your membership expires in {days} days.';
    } elseif ($daysDiff === 0) {
        $template = $settings['template_expires_today'] ?? 'Hi {name}, your membership expires today!';
    } else {
        $template = $settings['template_expired'] ?? 'Hi {name}, your membership expired {days} days ago.';
    }

    $message = str_replace(
        ['{name}', '{due}', '{days}', '{expiry_date}', '{gym_name}'],
        [
            $member['member_name'],
            '₹' . number_format($due, 0),
            abs($daysDiff),
            date('d/m/Y', strtotime($expiry)),
            $gymName
        ],
        $template
    );

    return 'https://wa.me/' . $phone . '?text=' . rawurlencode($message);
}
