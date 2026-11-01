<?php

declare(strict_types=1);

namespace App\Console;

use PDO;

/**
 * Идемпотентная схема БД — замена `prisma db push`.
 * Типы колонок повторяют то, что Prisma создала на проде (String = VARCHAR(191),
 * DateTime = DATETIME(3) в UTC), поэтому существующая база не меняется.
 */
final class Migrator
{
    /** @return list<string> */
    public static function statements(): array
    {
        return [
            'CREATE TABLE IF NOT EXISTS `users` (
                `id` VARCHAR(191) NOT NULL,
                `login` VARCHAR(191) NOT NULL,
                `passwordHash` VARCHAR(191) NOT NULL,
                `name` VARCHAR(191) NULL,
                `role` ENUM(\'ADMIN\', \'SUPER_ADMIN\') NOT NULL DEFAULT \'ADMIN\',
                `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                PRIMARY KEY (`id`),
                UNIQUE KEY `users_login_key` (`login`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',

            'CREATE TABLE IF NOT EXISTS `categories` (
                `id` VARCHAR(191) NOT NULL,
                `name` VARCHAR(191) NOT NULL,
                `slug` VARCHAR(191) NOT NULL,
                `description` VARCHAR(191) NULL,
                `sortOrder` INT NOT NULL DEFAULT 0,
                `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                PRIMARY KEY (`id`),
                UNIQUE KEY `categories_name_key` (`name`),
                UNIQUE KEY `categories_slug_key` (`slug`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',

            'CREATE TABLE IF NOT EXISTS `photos` (
                `id` VARCHAR(191) NOT NULL,
                `title` VARCHAR(191) NOT NULL,
                `description` VARCHAR(191) NULL,
                `filename` VARCHAR(191) NOT NULL,
                `originalName` VARCHAR(191) NOT NULL,
                `mimeType` VARCHAR(191) NOT NULL,
                `size` INT NOT NULL,
                `width` INT NULL,
                `height` INT NULL,
                `sortOrder` INT NOT NULL DEFAULT 0,
                `categoryId` VARCHAR(191) NOT NULL,
                `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                PRIMARY KEY (`id`),
                KEY `photos_categoryId_fkey` (`categoryId`),
                CONSTRAINT `photos_categoryId_fkey` FOREIGN KEY (`categoryId`)
                    REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',

            'CREATE TABLE IF NOT EXISTS `refresh_tokens` (
                `id` VARCHAR(191) NOT NULL,
                `tokenHash` VARCHAR(191) NOT NULL,
                `userId` VARCHAR(191) NOT NULL,
                `expiresAt` DATETIME(3) NOT NULL,
                `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                `revokedAt` DATETIME(3) NULL,
                PRIMARY KEY (`id`),
                UNIQUE KEY `refresh_tokens_tokenHash_key` (`tokenHash`),
                KEY `refresh_tokens_userId_idx` (`userId`),
                CONSTRAINT `refresh_tokens_userId_fkey` FOREIGN KEY (`userId`)
                    REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        ];
    }

    public static function run(PDO $pdo): void
    {
        foreach (self::statements() as $statement) {
            $pdo->exec($statement);
        }
    }
}
