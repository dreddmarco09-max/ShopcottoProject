<?php
// ═══════════════════════════════════════════
//  SHOPCOTTO — Database Configuration
//  XAMPP MySQL Connection
// ═══════════════════════════════════════════

// Start session FIRST before anything else
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// ── Database credentials ──────────────────
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');           // XAMPP default: empty password
define('DB_NAME', 'shopcotto_db');
define('DB_PORT', 3306);         // XAMPP default port

// ── CORS Headers (allow frontend to call API) ──
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ── Connect to MySQL ──────────────────────
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);

// Check connection
if ($conn->connect_errno) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed: ' . $conn->connect_error,
        'code'    => $conn->connect_errno
    ]);
    exit();
}

// Set charset to UTF-8
if (!$conn->set_charset('utf8mb4')) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to set charset: ' . $conn->error
    ]);
    exit();
}

// ── Helper: safe JSON input ───────────────
function getJsonInput() {
    $raw = file_get_contents('php://input');
    if (empty($raw)) return [];
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) return [];
    return $data ?? [];
}

// ── Helper: sanitize string ───────────────
function clean($conn, $val) {
    return $conn->real_escape_string(trim((string)$val));
}

// ── Helper: send JSON response ────────────
function respond($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}
?>