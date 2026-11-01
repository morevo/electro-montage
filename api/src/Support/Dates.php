<?php

declare(strict_types=1);

namespace App\Support;

use DateTimeImmutable;
use DateTimeZone;

/**
 * Prisma отдавал даты как JS Date → "2026-11-01T12:34:56.789Z".
 * MySQL хранит DATETIME(3) в UTC — приводим к тому же виду, чтобы фронтенд
 * не заметил смены бэкенда.
 */
final class Dates
{
    public static function toIso(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $normalized = rtrim($value, 'Z');
        $hasMicroseconds = str_contains($normalized, '.');
        $format = $hasMicroseconds ? 'Y-m-d H:i:s.u' : 'Y-m-d H:i:s';

        $date = DateTimeImmutable::createFromFormat($format, $normalized, new DateTimeZone('UTC'));
        if ($date === false) {
            return $value;
        }

        return $date->format('Y-m-d\TH:i:s.v\Z');
    }

    public static function nowUtc(): string
    {
        return (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('Y-m-d H:i:s.v');
    }

    public static function fromUnixTimestamp(int $timestamp): string
    {
        return (new DateTimeImmutable('@' . $timestamp))
            ->setTimezone(new DateTimeZone('UTC'))
            ->format('Y-m-d H:i:s.v');
    }
}
