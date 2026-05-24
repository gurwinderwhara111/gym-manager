<?php
class ServiceController {
    private ServiceModel $serviceModel;

    public function __construct() {
        $this->serviceModel = new ServiceModel();
    }

    public function list(): void {
        Auth::guard('owner');
        Response::success(['services' => $this->serviceModel->getActive(Auth::gymId())]);
    }

    public function add(): void {
        Auth::guard('owner');
        CSRF::assertValid();
        $data = Request::json() ?? $_POST;
        $name = Request::sanitize($data['name'] ?? '');
        $price = (float)($data['price'] ?? 0);

        if (!$name) Response::error('Name is required');

        $id = $this->serviceModel->add(['gym_id' => Auth::gymId(), 'name' => $name, 'price' => $price]);
        Response::success(['id' => $id, 'message' => 'Service added']);
    }

    public function edit(): void {
        Auth::guard('owner');
        CSRF::assertValid();
        $data = Request::json() ?? $_POST;
        $id = (int)$data['id'];
        $name = Request::sanitize($data['name'] ?? '');
        $price = (float)($data['price'] ?? 0);

        if ($this->serviceModel->edit($id, Auth::gymId(), ['name' => $name, 'price' => $price])) {
            Response::success(['message' => 'Service updated']);
        } else {
            Response::error('Update failed');
        }
    }

    public function delete(): void {
        Auth::guard('owner');
        CSRF::assertValid();
        $id = (int)Request::post('id');
        
        // Check if active members use this
        $db = Database::getInstance();
        $count = $db->fetch("SELECT COUNT(*) as c FROM members WHERE service_id = ? AND gym_id = ? AND status = 'active'", [$id, Auth::gymId()])['c'];
        if ($count > 0) {
            Response::error("Cannot delete - $count active members use this service");
        }

        if ($this->serviceModel->delete($id, Auth::gymId())) {
            Response::success(['message' => 'Service deleted']);
        } else {
            Response::error('Delete failed');
        }
    }
}
