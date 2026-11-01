<?php

declare(strict_types=1);

namespace App\Users;

use App\Support\Dates;
use App\Support\Str;
use PDO;

final class UserRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    /** @return array<string, mixed>|null полная строка (с passwordHash) */
    public function findByLogin(string $login): ?array
    {
        $statement = $this->pdo->prepare('SELECT * FROM users WHERE login = :login LIMIT 1');
        $statement->execute(['login' => $login]);
        $row = $statement->fetch();

        return is_array($row) ? $row : null;
    }

    /** @return array<string, mixed>|null */
    public function findRowById(string $id): ?array
    {
        $statement = $this->pdo->prepare('SELECT * FROM users WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
        $row = $statement->fetch();

        return is_array($row) ? $row : null;
    }

    /** @return array<string, mixed>|null публичное представление */
    public function findPublicById(string $id): ?array
    {
        $row = $this->findRowById($id);

        return $row === null ? null : self::toPublic($row);
    }

    /** @return list<array<string, mixed>> */
    public function findAll(): array
    {
        $statement = $this->pdo->query(
            'SELECT id, login, name, role, createdAt FROM users ORDER BY createdAt DESC',
        );

        return array_map(
            static fn (array $row): array => self::toPublic($row),
            $statement->fetchAll(),
        );
    }

    public function create(string $login, string $passwordHash, ?string $name): array
    {
        $id = Str::uuid4();
        $now = Dates::nowUtc();

        $statement = $this->pdo->prepare(
            'INSERT INTO users (id, login, passwordHash, name, role, createdAt, updatedAt)
             VALUES (:id, :login, :passwordHash, :name, \'ADMIN\', :createdAt, :updatedAt)',
        );
        $statement->execute([
            'id' => $id,
            'login' => $login,
            'passwordHash' => $passwordHash,
            'name' => $name,
            'createdAt' => $now,
            'updatedAt' => $now,
        ]);

        $created = $this->findPublicById($id);
        if ($created === null) {
            throw new \RuntimeException('Не удалось прочитать созданного пользователя');
        }

        return $created;
    }

    /** @param array<string, mixed> $fields */
    public function update(string $id, array $fields): void
    {
        $fields['updatedAt'] = Dates::nowUtc();

        $assignments = [];
        foreach (array_keys($fields) as $column) {
            $assignments[] = $column . ' = :' . $column;
        }

        $statement = $this->pdo->prepare(
            'UPDATE users SET ' . implode(', ', $assignments) . ' WHERE id = :id',
        );
        $statement->execute($fields + ['id' => $id]);
    }

    public function delete(string $id): void
    {
        $statement = $this->pdo->prepare('DELETE FROM users WHERE id = :id');
        $statement->execute(['id' => $id]);
    }

    public function count(): int
    {
        return (int) $this->pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    }

    /** @param array<string, mixed> $row */
    public static function toPublic(array $row): array
    {
        return [
            'id' => (string) $row['id'],
            'login' => (string) $row['login'],
            'name' => $row['name'] !== null ? (string) $row['name'] : null,
            'role' => (string) $row['role'],
            'createdAt' => Dates::toIso($row['createdAt'] !== null ? (string) $row['createdAt'] : null),
        ];
    }
}
