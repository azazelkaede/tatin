<?php
declare(strict_types=1);

function api_init(): void
{
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');

    $allowedOrigin = rtrim(trim(getenv('STARK_ALLOWED_ORIGIN') ?: ''), '/');
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($allowedOrigin !== '' && $origin !== '') {
        if (!hash_equals($allowedOrigin, $origin)) {
            respond(403, ['status' => 'error', 'message' => 'This website is not allowed to use the API.']);
        }
        header('Access-Control-Allow-Origin: ' . $allowedOrigin);
        header('Access-Control-Allow-Credentials: true');
        header('Vary: Origin');
    }

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        if ($allowedOrigin === '' || $origin === '' || !hash_equals($allowedOrigin, $origin)) {
            respond(403, ['status' => 'error', 'message' => 'This website is not allowed to use the API.']);
        }
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');
        header('Access-Control-Max-Age: 600');
        http_response_code(204);
        exit;
    }

    ini_set('session.use_strict_mode', '1');
    $secureCookie = filter_var(getenv('STARK_COOKIE_SECURE') ?: 'false', FILTER_VALIDATE_BOOLEAN)
        || (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    $sameSite = getenv('STARK_COOKIE_SAMESITE') ?: 'Lax';
    if (!in_array($sameSite, ['Lax', 'Strict', 'None'], true)) {
        $sameSite = 'Lax';
    }
    session_set_cookie_params([
        'httponly' => true,
        'secure' => $secureCookie,
        'samesite' => $sameSite,
        'path' => '/',
    ]);
    session_start();
}

function json_input(): array
{
    $data = json_decode(file_get_contents('php://input') ?: '', true);
    if (!is_array($data)) {
        respond(400, ['status' => 'error', 'message' => 'Invalid JSON request body.']);
    }
    return $data;
}

function respond(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $databaseUrl = trim(getenv('DATABASE_URL') ?: '');
    if ($databaseUrl !== '') {
        $parts = parse_url($databaseUrl);
        if (!is_array($parts) || empty($parts['host']) || empty($parts['path'])) {
            throw new RuntimeException('DATABASE_URL is not a valid PostgreSQL connection URL.');
        }
        $host = $parts['host'];
        $port = (string)($parts['port'] ?? 5432);
        $name = ltrim($parts['path'], '/');
        $user = rawurldecode((string)($parts['user'] ?? ''));
        $password = rawurldecode((string)($parts['pass'] ?? ''));
        $dsn = "pgsql:host={$host};port={$port};dbname={$name};sslmode=require";
    } else {
        // Retain the XAMPP/MySQL fallback for local development.
        $host = getenv('STARK_DB_HOST') ?: '127.0.0.1';
        $port = getenv('STARK_DB_PORT') ?: '3306';
        $name = getenv('STARK_DB_NAME') ?: 'enrollment_system';
        $user = getenv('STARK_DB_USER') ?: 'root';
        $password = getenv('STARK_DB_PASSWORD') ?: '';
        $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";
    }

    $pdo = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function handle_api_error(Throwable $error): never
{
    error_log($error->__toString());
    respond(500, ['status' => 'error', 'message' => 'Server or database error. Check the PHP error log.']);
}
