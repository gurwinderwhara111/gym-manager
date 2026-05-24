<?php
class Response {
    public static function json(array $data, int $status = 200): void {
        header('Content-Type: application/json');
        http_response_code($status);
        echo json_encode($data);
        exit;
    }

    public static function success(array $data = [], string $message = 'Success'): void {
        self::json(['success' => true, 'message' => $message, ...$data]);
    }

    public static function error(string $message, int $status = 400): void {
        self::json(['success' => false, 'error' => $message], $status);
    }

    public static function redirect(string $url): void {
        header("Location: $url");
        if (!defined('TEST_MODE')) {
            exit;
        }
    }
}
