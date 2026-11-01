<?php

declare(strict_types=1);

/**
 * Перенос портфолио из манифеста (идемпотентно).
 *
 * Использование:
 *   php bin/seed-portfolio.php [--source=/путь/к/assets]
 *
 * --source задаёт корень изображений по путям манифеста; по умолчанию файлы
 * берутся из UPLOAD_DIR (так работает деплой: картинки уже уехали rsync'ом).
 */

use App\Console\PortfolioSeeder;
use App\Database;
use App\Support\Config;

/** @var Config $config */
$config = require __DIR__ . '/bootstrap.php';

$sourceDir = null;
foreach ($argv ?? [] as $argument) {
    if (str_starts_with($argument, '--source=')) {
        $sourceDir = substr($argument, strlen('--source='));
    }
}

$pdo = Database::connect($config->databaseUrl());
$stats = PortfolioSeeder::run($pdo, $config, $sourceDir);

printf(
    "✅ портфолио: категорий +%d, фото +%d, файлов перенесено %d, пропущено %d\n",
    $stats['categories'],
    $stats['photos'],
    $stats['copied'],
    $stats['skipped'],
);
