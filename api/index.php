<?php

declare(strict_types=1);

/**
 * Единственная точка входа PHP-бэкенда.
 *
 * Apache переписывает /api/* сюда (см. .htaccess в корне сайта и в этом
 * каталоге), поэтому никакого постоянного процесса не нужно — PHP выполняется
 * по запросу через FastCGI, что полностью укладывается в правила shared-тарифа.
 */

use App\App;
use App\Http\Request;

// php -S (локальная разработка): статику (/uploads/...) отдаёт сам сервер,
// скрипт вызывается только для динамических маршрутов.
if (PHP_SAPI === 'cli-server') {
    $requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $candidate = __DIR__ . $requestPath;
    if ($requestPath !== '/' && is_file($candidate)) {
        return false;
    }
}

require __DIR__ . '/vendor/autoload.php';

$app = App::boot(__DIR__);
$app->handle(Request::fromGlobals());
