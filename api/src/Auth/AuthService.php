<?php

declare(strict_types=1);

namespace App\Auth;

use App\Http\HttpException;
use App\Http\Request;
use App\Http\Response;
use App\Support\Config;
use App\Support\Dates;
use App\Users\UserRepository;
use PDO;

/**
 * Логика авторизации перенесена 1-в-1 из backend/src/auth/auth.service.ts:
 * bcrypt, JWT в httpOnly cookie, ротация refresh-токенов с SHA-256 хешем в БД.
 */
final class AuthService
{
    public function __construct(
        private readonly PDO $pdo,
        private readonly UserRepository $users,
        private readonly TokenService $tokens,
        private readonly Response $response,
        private readonly Config $config,
    ) {
    }

    /** @param array<string, mixed> $data */
    public function login(array $data): array
    {
        $user = $this->users->findByLogin((string) $data['login']);

        // Одинаковый текст для «нет юзера» и «неверный пароль», чтобы по ответу
        // нельзя было перебирать логины.
        $invalidCredentials = 'Неверный логин или пароль';
        if ($user === null) {
            throw new HttpException(401, $invalidCredentials);
        }

        if (!self::verifyPassword((string) $data['password'], (string) $user['passwordHash'])) {
            throw new HttpException(401, $invalidCredentials);
        }

        return $this->generateTokensAndSetCookies($user);
    }

    public function logout(?string $refreshToken): array
    {
        if ($refreshToken !== null) {
            $statement = $this->pdo->prepare(
                'UPDATE refresh_tokens SET revokedAt = :now WHERE tokenHash = :hash AND revokedAt IS NULL',
            );
            $statement->execute([
                'now' => Dates::nowUtc(),
                'hash' => self::hashToken($refreshToken),
            ]);
        }

        $this->clearAuthCookies();

        return ['message' => 'Успешный выход'];
    }

    public function refresh(?string $refreshToken): array
    {
        if ($refreshToken === null) {
            throw new HttpException(401, 'Refresh token не предоставлен');
        }

        // Детерминированный хеш: bcrypt не подходит для поиска (у каждого хеша своя соль).
        $statement = $this->pdo->prepare('SELECT * FROM refresh_tokens WHERE tokenHash = :hash LIMIT 1');
        $statement->execute(['hash' => self::hashToken($refreshToken)]);
        $stored = $statement->fetch();

        if (!is_array($stored) || $stored['revokedAt'] !== null || (string) $stored['expiresAt'] < Dates::nowUtc()) {
            throw new HttpException(401, 'Refresh token недействителен или истёк');
        }

        // Ротация: старую запись удаляем, выдаём новую пару.
        $delete = $this->pdo->prepare('DELETE FROM refresh_tokens WHERE id = :id');
        $delete->execute(['id' => $stored['id']]);

        $user = $this->users->findRowById((string) $stored['userId']);
        if ($user === null) {
            throw new HttpException(401, 'Пользователь не найден');
        }

        return $this->generateTokensAndSetCookies($user);
    }

    public function getProfile(string $userId): array
    {
        $user = $this->users->findPublicById($userId);
        if ($user === null) {
            throw new HttpException(404, 'Пользователь не найден');
        }

        return $user;
    }

    /** @param array<string, mixed> $user */
    private function generateTokensAndSetCookies(array $user): array
    {
        $accessToken = $this->tokens->issueAccess($user);
        $refreshToken = $this->tokens->issueRefresh($user);
        $refreshTtlSeconds = $this->tokens->refreshTtlSeconds();

        // Чистим просроченные/отозванные токены этого пользователя.
        $cleanup = $this->pdo->prepare(
            'DELETE FROM refresh_tokens WHERE userId = :userId AND (expiresAt < :now OR revokedAt IS NOT NULL)',
        );
        $cleanup->execute(['userId' => $user['id'], 'now' => Dates::nowUtc()]);

        $insert = $this->pdo->prepare(
            'INSERT INTO refresh_tokens (id, tokenHash, userId, expiresAt, createdAt)
             VALUES (:id, :hash, :userId, :expiresAt, :createdAt)',
        );
        $insert->execute([
            'id' => \App\Support\Str::uuid4(),
            'hash' => self::hashToken($refreshToken),
            'userId' => $user['id'],
            'expiresAt' => Dates::fromUnixTimestamp(time() + $refreshTtlSeconds),
            'createdAt' => Dates::nowUtc(),
        ]);

        $this->setAuthCookies($accessToken, $refreshToken);

        return [
            'user' => [
                'id' => (string) $user['id'],
                'login' => (string) $user['login'],
                'name' => $user['name'] !== null ? (string) $user['name'] : null,
                'role' => (string) $user['role'],
            ],
        ];
    }

    private function setAuthCookies(string $accessToken, string $refreshToken): void
    {
        $accessOptions = $this->cookieOptions() + ['expires' => time() + $this->tokens->accessTtlSeconds()];
        $refreshOptions = $this->cookieOptions() + ['expires' => time() + $this->tokens->refreshTtlSeconds()];

        $this->response
            ->setCookie('access_token', $accessToken, $accessOptions)
            ->setCookie('refresh_token', $refreshToken, $refreshOptions);
    }

    private function clearAuthCookies(): void
    {
        $this->response
            ->clearCookie('access_token', $this->cookieOptions())
            ->clearCookie('refresh_token', $this->cookieOptions());
    }

    /** @return array<string, mixed> */
    private function cookieOptions(): array
    {
        return [
            'httponly' => true,
            'secure' => $this->config->isProduction(),
            'samesite' => 'Strict',
            'path' => '/',
        ];
    }

    private static function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }

    /**
     * bcryptjs из Node мог записать хеш с префиксом $2b$; PHP-реализация
     * bcrypt работает с $2y$ при том же алгоритме — нормализуем префикс,
     * иначе старые пароли перестали бы подходить.
     */
    private static function verifyPassword(string $password, string $hash): bool
    {
        if (str_starts_with($hash, '$2b$')) {
            $hash = '$2y$' . substr($hash, 4);
        }

        return password_verify($password, $hash);
    }
}
