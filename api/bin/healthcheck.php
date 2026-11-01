<?php

declare(strict_types=1);

/**
 * Диагностика окружения на хостинге:
 *   php bin/healthcheck.php
 *
 * Проверяет то, из-за чего PHP-версия могла бы не работать: драйвер MySQL,
 * конвертер WebP, права на uploads и доступность базы. Секреты не печатает.
 */

use App\Database;
use App\Support\Config;

/** @var Config $config */
$config = require __DIR__ . '/bootstrap.php';

$problems = [];

echo "PHP: " . PHP_VERSION . " (" . PHP_SAPI . ")\n";

$requiredExtensions = ['pdo_mysql', 'mbstring', 'fileinfo', 'json', 'curl'];
foreach ($requiredExtensions as $extension) {
    $loaded = extension_loaded($extension);
    echo sprintf("  %-12s %s\n", $extension, $loaded ? 'ok' : 'НЕТ');
    if (!$loaded) {
        $problems[] = "не загружено расширение {$extension}";
    }
}

$hasImagick = extension_loaded('imagick');
$hasGd = extension_loaded('gd');
$hasWebp = $hasImagick || ($hasGd && function_exists('imagewebp'));
echo sprintf("  imagick      %s\n", $hasImagick ? 'ok' : 'нет');
echo sprintf("  gd           %s\n", $hasGd ? 'ok' : 'нет');
echo sprintf("  webp         %s\n", $hasWebp ? 'ok' : 'НЕТ');
if (!$hasWebp) {
    $problems[] = 'нет ни Imagick, ни GD с поддержкой WebP — загрузка фото не сработает';
}

echo "upload_max_filesize: " . ini_get('upload_max_filesize') . "\n";
echo "post_max_size:       " . ini_get('post_max_size') . "\n";

$uploadDir = $config->portfolioDir();
if (!is_dir($uploadDir) && !@mkdir($uploadDir, 0775, true) && !is_dir($uploadDir)) {
    $problems[] = "нет доступа на запись в {$uploadDir}";
    echo "uploads: НЕТ ДОСТУПА ({$uploadDir})\n";
} else {
    $writable = is_writable($uploadDir);
    echo "uploads: " . ($writable ? 'запись ok' : 'НЕТ ЗАПИСИ') . " ({$uploadDir})\n";
    if (!$writable) {
        $problems[] = "каталог {$uploadDir} не доступен на запись";
    }
}

try {
    $pdo = Database::connect($config->databaseUrl());
    $users = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    $photos = (int) $pdo->query('SELECT COUNT(*) FROM photos')->fetchColumn();
    echo "БД: ok (users={$users}, photos={$photos})\n";
} catch (Throwable $exception) {
    $problems[] = 'нет подключения к БД: ' . $exception->getMessage();
    echo "БД: ОШИБКА (" . $exception->getMessage() . ")\n";
}

if ($problems !== []) {
    echo "\n❌ Проблемы:\n";
    foreach ($problems as $problem) {
        echo "  - {$problem}\n";
    }
    exit(1);
}

echo "\n✅ Окружение готово\n";
