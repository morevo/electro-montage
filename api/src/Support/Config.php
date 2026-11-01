<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Типизированный доступ к настройкам из .env.
 */
final class Config
{
    public function __construct(private readonly string $basePath)
    {
    }

    public static function fromEnvironment(string $basePath): self
    {
        return new self($basePath);
    }

    public function basePath(): string
    {
        return $this->basePath;
    }

    public function databaseUrl(): string
    {
        return Env::require('DATABASE_URL');
    }

    public function jwtAccessSecret(): string
    {
        return Env::require('JWT_ACCESS_SECRET');
    }

    public function jwtRefreshSecret(): string
    {
        return Env::require('JWT_REFRESH_SECRET');
    }

    public function accessTtl(): string
    {
        return Env::get('JWT_ACCESS_TTL', '15m') ?? '15m';
    }

    public function refreshTtl(): string
    {
        return Env::get('JWT_REFRESH_TTL', '7d') ?? '7d';
    }

    public function isProduction(): bool
    {
        return Env::get('APP_ENV', 'development') === 'production';
    }

    public function frontendUrl(): string
    {
        return Env::get('FRONTEND_URL', 'http://localhost:5173') ?? 'http://localhost:5173';
    }

    /** Абсолютный путь к каталогу, где лежат загруженные фото. */
    public function uploadDir(): string
    {
        $configured = Env::get('UPLOAD_DIR', 'uploads') ?? 'uploads';
        if (str_starts_with($configured, '/') || preg_match('#^[A-Za-z]:[\\\\/]#', $configured) === 1) {
            return rtrim($configured, '/\\');
        }

        return $this->basePath . '/' . trim($configured, '/\\');
    }

    public function portfolioDir(): string
    {
        return $this->uploadDir() . '/portfolio';
    }

    public function maxFileSize(): int
    {
        return Env::getInt('MAX_FILE_SIZE', 10485760);
    }

    public function portfolioManifest(): string
    {
        $configured = Env::get('PORTFOLIO_MANIFEST', 'storage/portfolio-manifest.json')
            ?? 'storage/portfolio-manifest.json';

        if (str_starts_with($configured, '/') || preg_match('#^[A-Za-z]:[\\\\/]#', $configured) === 1) {
            return $configured;
        }

        return $this->basePath . '/' . ltrim($configured, '/');
    }
}
