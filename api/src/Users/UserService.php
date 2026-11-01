<?php

declare(strict_types=1);

namespace App\Users;

use App\Http\HttpException;

final class UserService
{
    private const BCRYPT_COST = 12;

    public function __construct(private readonly UserRepository $users)
    {
    }

    /** @param array<string, mixed> $data */
    public function create(array $data): array
    {
        $login = (string) $data['login'];

        if ($this->users->findByLogin($login) !== null) {
            throw new HttpException(409, 'Пользователь с таким логином уже существует');
        }

        $hash = password_hash((string) $data['password'], PASSWORD_BCRYPT, ['cost' => self::BCRYPT_COST]);

        return $this->users->create($login, $hash, isset($data['name']) ? (string) $data['name'] : null);
    }

    public function findById(string $id): array
    {
        $user = $this->users->findPublicById($id);
        if ($user === null) {
            throw new HttpException(404, 'Пользователь не найден');
        }

        return $user;
    }

    /** @return list<array<string, mixed>> */
    public function findAll(): array
    {
        return $this->users->findAll();
    }

    /** @param array<string, mixed> $data */
    public function update(string $id, array $data): array
    {
        $this->findById($id);

        $fields = [];

        if (array_key_exists('login', $data)) {
            $login = (string) $data['login'];
            $existing = $this->users->findByLogin($login);
            if ($existing !== null && (string) $existing['id'] !== $id) {
                throw new HttpException(409, 'Пользователь с таким логином уже существует');
            }
            $fields['login'] = $login;
        }

        if (array_key_exists('name', $data)) {
            $fields['name'] = $data['name'] !== null ? (string) $data['name'] : null;
        }

        if (array_key_exists('role', $data)) {
            $fields['role'] = (string) $data['role'];
        }

        if (array_key_exists('password', $data)) {
            $fields['passwordHash'] = password_hash(
                (string) $data['password'],
                PASSWORD_BCRYPT,
                ['cost' => self::BCRYPT_COST],
            );
        }

        if ($fields !== []) {
            $this->users->update($id, $fields);
        }

        return $this->findById($id);
    }

    public function delete(string $id): array
    {
        $this->findById($id);
        $this->users->delete($id);

        return ['message' => 'Пользователь удалён'];
    }
}
