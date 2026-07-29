<?php

// $allowedOrigins = [
//     "https://quote-forge-triples.vercel.app",
//     "https://quoteforge-phi.vercel.app",
//     "http://localhost:8080",
//     "http://172.27.80.1:8080",
// ];

// $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
// if (in_array($origin, $allowedOrigins)) {
//     header("Access-Control-Allow-Origin: $origin");
// }

// header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Cache-Control, Authorization");

// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
//     http_response_code(200);
//     exit();
// }


ini_set('log_errors', '1');


ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once 'utils.php';

handleCors();

// Request Routing
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Prefix check
$basePrefix = '/api';
if (strpos($requestUri, $basePrefix) !== 0) {
    // Not an API request
    http_response_code(404);
    echo "Not Found";
    exit;
}



// Remove prefix for internal routing
$path = substr($requestUri, strlen($basePrefix));

// --- Auth Middleware ---
requireAuth();

// --- Router ---

// Auth
if ($path === '/auth/login' && $method === 'POST') {
    require 'api/auth.php';
    exit;
}

// Clients
if (preg_match('#^/clients(/.*)?$#', $path)) {
    require 'api/clients.php';
    exit;
}

// Services
if (preg_match('#^/services(/.*)?$#', $path)) {
    require 'api/services.php';
    exit;
}

// Quotations
if (preg_match('#^/quotations(/.*)?$#', $path)) {
    require 'api/quotations.php';
    exit;
}

// Notifications
if (preg_match('#^/notifications(/.*)?$#', $path)) {
    require 'api/notifications.php';
    exit;
}

// Invoices
// Matches /invoices, /invoices/:id, /invoices/:id/items
if (preg_match('#^/invoices(/.*)?$#', $path)) {
    require 'api/invoices.php';
    exit;
}

// Invoice Items direct access (if needed)
if (preg_match('#^/invoice-items(/.*)?$#', $path)) {
    require 'api/invoices.php'; // Map to same handler for simplicity or separate
    exit;
}

// Receipts
if (preg_match('#^/receipts(/.*)?$#', $path)) {
    require 'api/receipts.php';
    exit;
}

// Razorpay Webhook
if ($path === '/webhooks/razorpay' && $method === 'POST') {
    require 'api/webhooks-razorpay.php';
    exit;
}

// Brand Kit
if (preg_match('#^/brand-kit(/.*)?$#', $path)) {
    require 'api/brand-kit.php';
    exit;
}

// Quotation Point Templates
if (preg_match('#^/templates(/.*)?$#', $path)) {
    require 'api/templates.php';
    exit;
}

// Backup / Restore / Nuke
if (preg_match('#^/backup(/.*)?$#', $path) || $path === '/nuke') {
    require 'api/backup.php';
    exit;
}

// Workflow / Phase 4
if (preg_match('#^/contracts(/.*)?$#', $path) || 
    preg_match('#^/workflow-invoices(/.*)?$#', $path) || 
    preg_match('#^/payment-receipts(/.*)?$#', $path)) {
    // Map these to a workflow handler if you want, or separate files.
    // For now, let's create a workflow.php or separate
    require 'api/workflow.php';
    exit;
}


if ($path === '/db-test') {

    global $pdo;

    try {

        $db = $pdo->query("SELECT DATABASE() AS db")->fetch();

        $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);

        jsonResponse([
            'database' => $db,
            'tables' => $tables
        ]);

    } catch (Throwable $e) {

        jsonResponse([
            'error' => $e->getMessage()
        ], 500);

    }

    exit;
}

if ($path === '/db-test') {

    require 'test-db.php';

    exit;

}

// Health Check
if ($path === '/health') {
    jsonResponse(['status' => 'ok', 'server' => 'php']);
    exit;
}

// 404
jsonResponse(['error' => 'Not Found', 'path' => $path], 404);
