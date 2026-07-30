<?php

require_once 'config.php';

function handleCors() {

    $allowedOrigins = [
        "https://quoteforge-triples.vercel.app",
        "http://localhost:8080",
        "http://172.27.80.1:8080",
    ];

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if (in_array($origin, $allowedOrigins, true)) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
        header("Vary: Origin");
    }

    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, Cache-Control");
    header("Access-Control-Max-Age: 86400");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

// --- JSON Response Helper ---
function jsonResponse($data, $status = 200) {
    header('Content-Type: application/json');
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function getJsonInput() {
    $input = json_decode(file_get_contents('php://input'), true);
    return $input ?: [];
}

// --- Authentication ---
// Secret should be loaded from env
$JWT_SECRET = getenv('JWT_SECRET') ?: 'super-secret-key-change-in-prod';
// $ADMIN_PASSWORD = getenv('ADMIN_PASSWORD') ?: 'admin';
// Hardcoded for now — replace with env var later for production
$ADMIN_PASSWORD = 'admin123';

function generateToken($role = 'admin') {
    global $JWT_SECRET;
    $payload = json_encode(['role' => $role, 'ts' => time()]);
    $b64 = base64_encode($payload);
    $signature = hash_hmac('sha256', $payload, $JWT_SECRET);
    return "$b64.$signature";
}

function verifyToken($token) {
    global $JWT_SECRET;
    $parts = explode('.', $token);
    if (count($parts) !== 2) return false;
    
    list($b64, $hash) = $parts;
    $payload = base64_decode($b64);
    if (!$payload) return false;

    // Verify signature
    $checkHash = hash_hmac('sha256', $payload, $JWT_SECRET);
    
    return hash_equals($hash, $checkHash);
}

// function requireAuth() {
//     // Public Routes (whitelist)
    
//     $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
//     $method = $_SERVER['REQUEST_METHOD'];

//     // Strip /api prefix if strictly matching against it, or just partial match
//     // Our router sends us here implies we are handling a request.
    
//     // Explicit public routes
//     if (strpos($path, '/auth/login') !== false) return;
//     if (strpos($path, '/health') !== false) return;
    
//     // Brand Kit GET is public
//     if (strpos($path, '/brand-kit') !== false && $method === 'GET') return;

//     // Public Quotations (GET /api/quotations/:uuid)
//     // UUID regex: 8-4-4-4-12 hex digits
//     // The path might be /api/quotations/some-uuid
//     if ($method === 'GET' && preg_match('#\/api\/quotations\/[\w\-]+$#', $path)) {
//        return;
//     }

//     // Check Header
//     $headers = getallheaders();
//     $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    
//     if (empty($authHeader) || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
//         jsonResponse(['error' => 'Unauthorized'], 401);
//     }

//     $token = $matches[1];
//     if (!verifyToken($token)) {
//         jsonResponse(['error' => 'Invalid token'], 403);
//     }
// }


function requireAuth() {
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $method = $_SERVER['REQUEST_METHOD'];

    // Public routes — no login required
    if (strpos($path, '/auth/login') !== false) return;
    if (strpos($path, '/health') !== false) return;

    // Brand Kit GET is public (needed for public invoice/quotation views)
    if (strpos($path, '/brand-kit') !== false && $method === 'GET') return;

    // Public quotation share links (view + client accept/decline)
    if (preg_match('#/api/quotations/[\w\-]+$#', $path) && ($method === 'GET' || $method === 'PUT')) return;

    // Public invoice share links (view only)
    if (preg_match('#/api/invoices/[\w\-]+$#', $path) && $method === 'GET') return;
    if (preg_match('#/api/invoices/[\w\-]+/items$#', $path) && $method === 'GET') return;

    // Public receipt share links (view only)
    if (preg_match('#/api/receipts/[\w\-]+$#', $path) && $method === 'GET') return;

    if (preg_match('#/api/invoices/[\w\-]+/razorpay-order$#', $path) && $method === 'POST') return;
    if ($path === '/api/webhooks/razorpay' && $method === 'POST') return;

    if (preg_match('#/api/invoices/[\w\-]+/payment-intent$#', $path) && $method === 'POST') return;

    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if (empty($authHeader) || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }

    $token = $matches[1];
    if (!verifyToken($token)) {
        jsonResponse(['error' => 'Invalid token'], 403);
    }
}

// Polyfill for getallheaders if running on FPM/Nginx where it might be missing
if (!function_exists('getallheaders')) {
    function getallheaders() {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            }
        }
        return $headers;
    }
}
