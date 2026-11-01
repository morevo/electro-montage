<?php

declare(strict_types=1);

namespace App\Auth;

use App\Http\HttpException;
use App\Support\Str;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

/**
 * access/refresh токены подписаны РАЗНЫМИ секретами (как в NestJS).
 * Токены живут только в httpOnly cookie.
 */
final class TokenService
{
    private const ALGORITHM = 'HS256';

    public function __construct(
        private readonly string $accessSecret,
        private readonly string $refreshSecret,
        private readonly string $accessTtl,
        private readonly string $refreshTtl,
    ) {
    }

    /** @param array<string, mixed> $user */
    public function issueAccess(array $user): string
    {
        return $this->issue($user, $this->accessSecret, $this->accessTtlSeconds());
    }

    /** @param array<string, mixed> $user */
    public function issueRefresh(array $user): string
    {
        // jti делает каждый refresh-токен уникальным: без него два токена,
        // выданные в одну секунду, совпадали по подписи и падали на unique tokenHash.
        return $this->issue($user, $this->refreshSecret, $this->refreshTtlSeconds(), Str::uuid4());
    }

    /** @param array<string, mixed> $user */
    private function issue(array $user, string $secret, int $ttlSeconds, ?string $jti = null): string
    {
        $now = time();
        $payload = [
            'sub' => (string) $user['id'],
            'login' => (string) $user['login'],
            'role' => (string) $user['role'],
            'iat' => $now,
            'exp' => $now + $ttlSeconds,
        ];

        if ($jti !== null) {
            $payload['jti'] = $jti;
        }

        return JWT::encode($payload, $secret, self::ALGORITHM);
    }

    /** @return array<string, mixed> */
    public function decodeAccess(string $token): array
    {
        return $this->decode($token, $this->accessSecret);
    }

    /** @return array<string, mixed> */
    public function decodeRefresh(string $token): array
    {
        return $this->decode($token, $this->refreshSecret);
    }

    /** @return array<string, mixed> */
    private function decode(string $token, string $secret): array
    {
        try {
            $decoded = JWT::decode($token, new Key($secret, self::ALGORITHM));
        } catch (\Throwable) {
            throw new HttpException(401, 'Требуется авторизация');
        }

        return (array) $decoded;
    }

    public function accessTtlSeconds(): int
    {
        return self::parseTtlSeconds($this->accessTtl);
    }

    public function refreshTtlSeconds(): int
    {
        return self::parseTtlSeconds($this->refreshTtl);
    }

    public static function parseTtlSeconds(string $ttl): int
    {
        if (preg_match('/^(\d+)([mhd])$/', $ttl, $matches) !== 1) {
            return 15 * 60;
        }

        $value = (int) $matches[1];

        return match ($matches[2]) {
            'm' => $value * 60,
            'h' => $value * 60 * 60,
            'd' => $value * 24 * 60 * 60,
            default => 15 * 60,
        };
    }
}
