<?php

declare(strict_types=1);

namespace App\Console;

use App\Support\Dates;
use App\Support\Env;
use App\Support\Str;
use PDO;

/**
 * Создание/обновление первого администратора — перенос create-admin.js.
 * На проде вызывается ОДИН раз (маркер .admin-seeded в deploy.yml), иначе
 * каждый деплой перезаписывал бы пароль, который сменили через админку.
 */
final class AdminSeeder
{
    public static function run(PDO $pdo, bool $onlyIfMissing = false): string
    {
        $login = trim((string) Env::get('SEED_ADMIN_LOGIN', ''));
        $password = (string) Env::get('SEED_ADMIN_PASSWORD', '');

        if ($login === '' || $password === '') {
            return '⚠️  SEED_ADMIN_LOGIN/SEED_ADMIN_PASSWORD не заданы — администратор не создан';
        }

        if (str_contains($login, '@')) {
            return '⚠️  SEED_ADMIN_LOGIN не должен быть e-mail — администратор не создан';
        }

        if (mb_strlen($password) < 16) {
            return '⚠️  SEED_ADMIN_PASSWORD короче 16 символов — администратор не создан';
        }

        $statement = $pdo->prepare('SELECT id, role FROM users WHERE login = :login LIMIT 1');
        $statement->execute(['login' => $login]);
        $existing = $statement->fetch();

        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

        if (is_array($existing)) {
            if ($onlyIfMissing) {
                return "ℹ️  Пользователь {$login} уже есть — пароль не меняю";
            }

            $update = $pdo->prepare('UPDATE users SET passwordHash = :hash, updatedAt = :now WHERE id = :id');
            $update->execute([
                'hash' => $hash,
                'now' => Dates::nowUtc(),
                'id' => $existing['id'],
            ]);

            return "✅ Администратор обновлён: {$login}";
        }

        $insert = $pdo->prepare(
            'INSERT INTO users (id, login, passwordHash, name, role, createdAt, updatedAt)
             VALUES (:id, :login, :hash, :name, \'SUPER_ADMIN\', :createdAt, :updatedAt)',
        );
        $now = Dates::nowUtc();
        $insert->execute([
            'id' => Str::uuid4(),
            'login' => $login,
            'hash' => $hash,
            'name' => 'Администратор',
            'createdAt' => $now,
            'updatedAt' => $now,
        ]);

        return "✅ Администратор создан: {$login} (пароль — из SEED_ADMIN_PASSWORD)";
    }
}
