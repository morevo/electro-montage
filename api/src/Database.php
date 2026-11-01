<?php

declare(strict_types=1);

namespace App;

use PDO;
use RuntimeException;

/**
 * PDO-подключение по той же DATABASE_URL, что была у Prisma
 * (mysql://ПОЛЬЗОВАТЕЛЬ:ПАРОЛЬ@ХОСТ:ПОРТ/БАЗА).
 */
final class Database
{
    public static function connect(string $databaseUrl): PDO
    {
        $parts = parse_url($databaseUrl);
        if ($parts === false || !isset($parts['host'])) {
            throw new RuntimeException('Некорректная DATABASE_URL (ожидается mysql://user:pass@host:3306/db)');
        }

        $database = ltrim($parts['path'] ?? '', '/');
        if ($database === '') {
            throw new RuntimeException('В DATABASE_URL не указано имя базы');
        }

        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
            $parts['host'],
            (int) ($parts['port'] ?? 3306),
            $database,
        );

        $pdo = new PDO(
            $dsn,
            isset($parts['user']) ? rawurldecode($parts['user']) : '',
            isset($parts['pass']) ? rawurldecode($parts['pass']) : '',
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_STRINGIFY_FETCHES => false,
            ],
        );

        // Prisma писал даты в UTC — держим ту же договорённость.
        $pdo->exec("SET time_zone = '+00:00'");

        return $pdo;
    }
}
