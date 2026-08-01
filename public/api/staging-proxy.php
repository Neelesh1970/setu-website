<?php
/**
 * Same-origin reverse proxy for GoDaddy static hosting.
 *
 * Local Vite proxies /auth, /dashboard, etc. Production has no Node proxy, and
 * API CORS/CORP blocks direct browser calls from https://setuai.com.
 * .htaccess rewrites those prefixes here so the SPA keeps relative API bases.
 *
 * Default upstream: https://staging.setuai.com (all SETU microservices).
 * Override via api/config.php → staging_api_base, or GitHub secret STAGING_API_BASE.
 */
declare(strict_types=1);

const STAGING_DEFAULT = "https://staging.setuai.com";

/** Path prefixes mirrored from vite.config.js stagingProxy list */
const ALLOWED_PREFIXES = [
    "auth",
    "dashboard",
    "sos",
    "booktest",
    "abha",
    "drug",
    "telemedicine",
    "generic",
    "mental",
    "agri",
    "schemes",
    "fitness",
    "reports",
    "preventive-health",
    "pay",
    "amount-breakdown",
    "jobs",
    "notification",
    "userprofile",
    "healthcard",
    "phr",
    "matrujyoti",
    "matrimony",
    "temple",
    "language",
    "doctor",
    "vle",
    "assets/api",
];

$requestPath = isset($_GET["__path"]) ? (string) $_GET["__path"] : "";
$requestPath = ltrim(str_replace("\\", "/", $requestPath), "/");

if ($requestPath === "" || str_contains($requestPath, "..") || preg_match("#^[a-z]+://#i", $requestPath)) {
    http_response_code(400);
    header("Content-Type: application/json; charset=utf-8");
    echo json_encode(["success" => false, "message" => "Invalid proxy path."]);
    exit;
}

$allowed = false;
foreach (ALLOWED_PREFIXES as $prefix) {
    if ($requestPath === $prefix || str_starts_with($requestPath, $prefix . "/")) {
        $allowed = true;
        break;
    }
}

if (!$allowed) {
    http_response_code(403);
    header("Content-Type: application/json; charset=utf-8");
    echo json_encode(["success" => false, "message" => "Proxy path not allowed."]);
    exit;
}

$upstreamBase = STAGING_DEFAULT;
$configPath = __DIR__ . "/config.php";
if (is_file($configPath)) {
    $config = require $configPath;
    if (is_array($config) && !empty($config["staging_api_base"])) {
        $upstreamBase = rtrim((string) $config["staging_api_base"], "/");
    }
}

$query = $_GET;
unset($query["__path"]);
$queryString = http_build_query($query);
$upstreamUrl = $upstreamBase . "/" . $requestPath;
if ($queryString !== "") {
    $upstreamUrl .= "?" . $queryString;
}

$method = strtoupper((string) ($_SERVER["REQUEST_METHOD"] ?? "GET"));
$body = null;
if (!in_array($method, ["GET", "HEAD", "OPTIONS"], true)) {
    $body = file_get_contents("php://input");
}

$forwardHeaders = [];
$headerMap = [
    "HTTP_AUTHORIZATION" => "Authorization",
    "HTTP_ACCEPT" => "Accept",
    "HTTP_X_REFRESH_TOKEN" => "x-refresh-token",
    "HTTP_X_PROFILE_ID" => "x-profile-id",
    "HTTP_X_REQUESTED_WITH" => "X-Requested-With",
];

foreach ($headerMap as $serverKey => $headerName) {
    if (!empty($_SERVER[$serverKey])) {
        $forwardHeaders[] = $headerName . ": " . (string) $_SERVER[$serverKey];
    }
}

$contentType = (string) ($_SERVER["CONTENT_TYPE"] ?? $_SERVER["HTTP_CONTENT_TYPE"] ?? "");
if ($contentType !== "") {
    $forwardHeaders[] = "Content-Type: " . $contentType;
} elseif ($body !== null && $body !== "") {
    $forwardHeaders[] = "Content-Type: application/json";
}

$forwardHeaders[] = "Accept-Encoding: identity";
$forwardHeaders[] = "Connection: close";

if (!function_exists("curl_init")) {
    http_response_code(503);
    header("Content-Type: application/json; charset=utf-8");
    echo json_encode(["success" => false, "message" => "cURL is required for API proxy."]);
    exit;
}

$ch = curl_init($upstreamUrl);
curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => true,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_TIMEOUT => 60,
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_HTTPHEADER => $forwardHeaders,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
]);

if ($body !== null) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

$response = curl_exec($ch);
if ($response === false) {
    $err = curl_error($ch);
    curl_close($ch);
    http_response_code(502);
    header("Content-Type: application/json; charset=utf-8");
    echo json_encode([
        "success" => false,
        "message" => "Upstream API unreachable.",
        "detail" => $err,
    ]);
    exit;
}

$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

$rawHeaders = substr($response, 0, $headerSize);
$responseBody = substr($response, $headerSize);

http_response_code($status > 0 ? $status : 502);

$passHeaders = [
    "content-type",
    "authorization",
    "x-refresh-token",
    "x-profile-id",
    "cache-control",
    "etag",
];

foreach (explode("\r\n", $rawHeaders) as $line) {
    if ($line === "" || str_starts_with(strtolower($line), "http/")) {
        continue;
    }
    $pos = strpos($line, ":");
    if ($pos === false) {
        continue;
    }
    $name = strtolower(trim(substr($line, 0, $pos)));
    $value = trim(substr($line, $pos + 1));
    if (in_array($name, $passHeaders, true) && $value !== "") {
        header($name . ": " . $value, false);
    }
}

if ($responseBody !== false && $responseBody !== "") {
    echo $responseBody;
}
