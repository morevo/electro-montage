<?php
/**
 * Реверс-прокси на локальный NestJS (127.0.0.1:3001).
 *
 * Нужен потому, что nginx на shared-хостинге отдаёт /api/* как статику,
 * а mod_proxy/apache-проксирование в панели выключено. Правила переписывания
 * живут в .htaccess: /api/* и /uploads/* → этот файл.
 *
 * Форвардятся метод, заголовки, тело (включая multipart-загрузки)
 * и ответ вместе со статусом и Set-Cookie.
 */

declare(strict_types=1);

const API_UPSTREAM = 'http://127.0.0.1:3001';

$uri = $_SERVER['REQUEST_URI'] ?? '/';
$target = API_UPSTREAM . $uri;

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Заголовки, которые нельзя передавать как есть.
$skipRequest = [
    'host', 'connection', 'content-length', 'accept-encoding',
    'x-forwarded-for', 'x-forwarded-proto', 'x-real-ip', 'keep-alive',
];

$headers = [];
// getallheaders() есть только под Apache mod_php; под FPM/CGI её может не быть,
// и тогда вызов роняет PHP с фатальной ошибкой (500). Собираем заголовки
// переносимо из $_SERVER.
$requestHeaders = (function (): array {
    if (function_exists('getallheaders')) {
        return getallheaders();
    }
    $out = [];
    foreach ($_SERVER as $name => $value) {
        if (str_starts_with($name, 'HTTP_')) {
            $out[str_replace('_', '-', substr($name, 5))] = $value;
        } elseif ($name === 'CONTENT_TYPE' || $name === 'CONTENT_LENGTH') {
            $out[str_replace('_', '-', $name)] = $value;
        }
    }
    return $out;
})();

foreach ($requestHeaders as $name => $value) {
    if (in_array(strtolower($name), $skipRequest, true)) {
        continue;
    }
    $headers[] = $name . ': ' . $value;
}

$headers[] = 'X-Forwarded-For: ' . ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
$headers[] = 'X-Forwarded-Proto: ' .
    ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http');

$body = file_get_contents('php://input');
$hasBody = $body !== '' && $body !== false;

$ch = curl_init($target);

curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST  => $method,
    CURLOPT_HTTPHEADER     => $headers,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_TIMEOUT        => 120,
    CURLOPT_HEADER         => false,
    CURLOPT_HEADERFUNCTION => static function ($curl, string $line): int {
        $length = strlen($line);
        $trimmed = rtrim($line, "\r\n");

        if ($trimmed === '') {
            return $length;
        }

        if (stripos($trimmed, 'HTTP/') === 0) {
            $parts = explode(' ', $trimmed, 3);
            $code = isset($parts[1]) ? (int) $parts[1] : 502;
            // 100 Continue и прочие промежуточные не отдаём наружу.
            if ($code >= 200) {
                if (!headers_sent()) {
                    http_response_code($code);
                }
            }
            return $length;
        }

        $name = strtolower(explode(':', $trimmed, 2)[0]);
        // Длину и кодировку пересчитывает сам PHP/веб-сервер.
        if (in_array($name, ['transfer-encoding', 'connection', 'content-length', 'content-encoding', 'keep-alive'], true)) {
            return $length;
        }

        if (!headers_sent()) {
            header($trimmed, false);
        }

        return $length;
    },
]);

if ($hasBody) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

curl_exec($ch);

if (curl_errno($ch)) {
    if (!headers_sent()) {
        http_response_code(502);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode([
        'statusCode' => 502,
        'message'    => 'API недоступен: ' . curl_error($ch),
    ], JSON_UNESCAPED_UNICODE);
}

curl_close($ch);
