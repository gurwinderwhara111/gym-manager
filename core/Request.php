<?php
class Request {
    public static function get(string $key, $default = null) {
        return self::sanitize($_GET[$key] ?? $default);
    }

    public static function post(string $key, $default = null) {
        return self::sanitize($_POST[$key] ?? $default);
    }

    public static function sanitize($value) {
        if (is_array($value)) {
            return array_map([self::class, 'sanitize'], $value);
        }
        if (is_string($value)) {
            return htmlspecialchars(trim($value), ENT_QUOTES, 'UTF-8');
        }
        return $value;
    }

    public static function json() {
        return json_decode(file_get_contents('php://input'), true);
    }
}
