<?php

declare(strict_types=1);

namespace App\Support;

use RuntimeException;

/**
 * Минималистичный загрузчик .env: без внешних зависимостей и без магии.
 * Значения уже существующих переменных окружения не перезаписываются —
 * так деплой может передать секреты через окружение процесса.
 */
final class Env
{
    /** @var array<string, string> */
    private static array $values = [];

    public static function load(string $path): void
    {
        if (!is_readable($path)) {
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            return;
        }

        foreach ($lines as $line) {
            $trimmed = trim($line);
            if ($trimmed === '' || str_starts_with($trimmed, '#')) {
                continue;
            }

            $separator = strpos($trimmed, '=');
            if ($separator === false) {
                continue;
            }

            $key = trim(substr($trimmed, 0, $separator));
            $value = trim(substr($trimmed, $separator + 1));

            $length = strlen($value);
            if ($length >= 2) {
                $first = $value[0];
                $last = $value[$length - 1];
                if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                    $value = substr($value, 1, -1);
                }
            }

            if ($key === '' || array_key_exists($key, self::$values)) {
                continue;
            }

            self::$values[$key] = $value;
            if (getenv($key) === false) {
                putenv($key . '=' . $value);
            }
        }
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        $value = self::$values[$key] ?? getenv($key);
        if ($value === false || $value === null || $value === '') {
            return $default;
        }

        return (string) $value;
    }

    public static function require(string $key): string
    {
        $value = self::get($key);
        if ($value === null) {
            throw new RuntimeException("Не задана переменная окружения {$key} (см. api/.env)");
        }

        return $value;
    }

    public static function getInt(string $key, int $default): int
    {
        $value = self::get($key);
        if ($value === null || !is_numeric($value)) {
            return $default;
        }

        return (int) $value;
    }
}
