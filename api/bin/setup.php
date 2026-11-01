<?php

declare(strict_types=1);

/**
 * Локальный bootstrap базы одной командой: схема + админ (если ещё нет) +
 * демо-портфолио (если в базе нет фото). Вызывается из `npm run dev`.
 *
 * Использование: php bin/setup.php
 */

use App\Console\AdminSeeder;
use App\Console\Migrator;
use App\Console\PortfolioSeeder;
use App\Database;
use App\Support\Config;

/** @var Config $config */
$config = require __DIR__ . '/bootstrap.php';

try {
    $pdo = Database::connect($config->databaseUrl());
} catch (Throwable $exception) {
    fwrite(STDERR, "❌ Не удалось подключиться к MySQL ({$config->databaseUrl()}):\n");
    fwrite(STDERR, '   ' . $exception->getMessage() . "\n");
    fwrite(STDERR, "   Проверьте, что служба MySQL80 запущена и база создана (см. LOCAL_DEV.md).\n");
    exit(1);
}

Migrator::run($pdo);

$users = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
echo AdminSeeder::run($pdo, $users > 0) . "\n";

$photos = (int) $pdo->query('SELECT COUNT(*) FROM photos')->fetchColumn();
if ($photos === 0) {
    $assets = dirname($config->basePath()) . '/frontend/src/assets';
    $stats = PortfolioSeeder::run($pdo, $config, is_dir($assets) ? $assets : null);
    if ($stats['photos'] > 0 || $stats['copied'] > 0) {
        printf(
            "✅ Демо-портфолио: категорий +%d, фото +%d\n",
            $stats['categories'],
            $stats['photos'],
        );
    }
}

echo "✅ База готова\n";
