<?php

declare(strict_types=1);

namespace App\Auth;

use App\Http\HttpException;
use App\Http\Request;
use App\Users\UserRepository;

/**
 * Аналог JwtAuthGuard + RolesGuard: пользователь из access_token
 * (cookie или Bearer) и проверка роли на роуте.
 */
final class Guard
{
    public function __construct(
        private readonly TokenService $tokens,
        private readonly UserRepository $users,
    ) {
    }

    /** @return array<string, mixed> публичные поля пользователя */
    public function user(Request $request): array
    {
        $token = $request->cookie('access_token') ?? $request->bearerToken();
        if ($token === null) {
            throw new HttpException(401, 'Требуется авторизация');
        }

        $payload = $this->tokens->decodeAccess($token);
        $userId = isset($payload['sub']) ? (string) $payload['sub'] : '';

        $user = $userId !== '' ? $this->users->findPublicById($userId) : null;
        if ($user === null) {
            throw new HttpException(401, 'Пользователь не найден');
        }

        return $user;
    }

    /** @param array<string, mixed> $user */
    public function requireRole(array $user, string $role): void
    {
        if (($user['role'] ?? null) !== $role) {
            throw new HttpException(403, 'Недостаточно прав доступа');
        }
    }
}
