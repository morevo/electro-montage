<?php

declare(strict_types=1);

/**
 * Идемпотентное создание схемы БД (замена `prisma db push`).
 * Использование: php bin/migrate.php
 */

use App\Console\Migrator;
use App\Database;
use App\Support\Config;

/** @var Config $config */
$config = require __DIR__ . '/bootstrap.php';

try {
    $pdo = Database::connect($config->databaseUrl());
} catch (Throwable $exception) {
    fwrite(STDERR, '❌ Не удалось подключиться к MySQL: ' . $exception->getMessage() . "\n");
    exit(1);
}

Migrator::run($pdo);

echo "✅ Схема БД в актуальном состоянии\n";
