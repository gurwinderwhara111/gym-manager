<?php
class GymController {
    public function showSetup(): void {
        Auth::guard('owner');
        require_once __DIR__ . '/../views/setup/create_gym.php';
    }

    public function createGym(): void {
        Auth::guard('owner');
        CSRF::assertValid();

        $gymName = Request::post('gym_name');
        $ownerName = Request::post('owner_name');
        $ownerPhone = Request::post('owner_phone');
        $gymAddress = Request::post('gym_address');
        $upiId = Request::post('upi_id');

        if (!$gymName) {
            Response::error('Gym name is required');
        }

        $db = Database::getInstance();
        $userId = Auth::user()['id'];

        $db->execute(
            "INSERT INTO gyms (user_id, gym_name, owner_name, owner_phone, gym_address, upi_id) VALUES (?, ?, ?, ?, ?, ?)",
            [$userId, $gymName, $ownerName, $ownerPhone, $gymAddress, $upiId]
        );

        $gymId = $db->lastInsertId();

        // Create default settings
        $db->execute("INSERT INTO gym_settings (gym_id) VALUES (?)", [$gymId]);

        // Seed default services
        $defaultServices = [
            ['Weight Training', 1500],
            ['Cardio', 1000],
            ['Zumba', 800],
        ];
        foreach ($defaultServices as [$name, $price]) {
            $db->execute(
                "INSERT INTO gym_services (gym_id, name, price) VALUES (?, ?, ?)",
                [$gymId, $name, $price]
            );
        }

        // Update session with gym info
        Auth::login(
            (int)$userId,
            'owner',
            (int)$gymId,
            $gymName
        );

        Response::redirect('/dashboard');
    }
}
