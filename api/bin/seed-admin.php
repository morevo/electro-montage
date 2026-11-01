<?php

declare(strict_types=1);

/**
 * Создание/обновление администратора из SEED_ADMIN_LOGIN / SEED_ADMIN_PASSWORD.
 * На проде deploy.yml вызывает его один раз (маркер .admin-seeded).
 *
 * Использование: php bin/seed-admin.php [--only-if-missing]
 */

use App\Console\AdminSeeder;
use App\Database;
use App\Support\Config;

/** @var Config $config */
$config = require __DIR__ . '/bootstrap.php';

$onlyIfMissing = in_array('--only-if-missing', $argv ?? [], true);

$pdo = Database::connect($config->databaseUrl());
echo AdminSeeder::run($pdo, $onlyIfMissing) . "\n";
