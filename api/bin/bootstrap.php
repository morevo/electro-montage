<?php

declare(strict_types=1);

/**
 * Общий bootstrap CLI-скриптов: автозагрузка Composer + чтение .env.
 * Возвращает Config (по абсолютному пути каталога api/).
 */

use App\Support\Config;
use App\Support\Env;

$root = dirname(__DIR__);
$autoload = $root . '/vendor/autoload.php';

if (!is_file($autoload)) {
    fwrite(STDERR, "❌ Нет vendor/ — выполните: cd api && composer install\n");
    exit(1);
}

require $autoload;

Env::load($root . '/.env');

return Config::fromEnvironment($root);
