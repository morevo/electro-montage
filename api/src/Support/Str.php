<?php

declare(strict_types=1);

namespace App\Support;

final class Str
{
    /** UUID v4 — тот же формат, что отдавал Prisma (@default(uuid())). */
    public static function uuid4(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
    }

    public static function isUuid(?string $value): bool
    {
        if ($value === null) {
            return false;
        }

        return preg_match(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i',
            $value,
        ) === 1;
    }

    /**
     * Транслитерация в slug — точный перенос backend/src/common/utils/slugify.ts:
     * контент-менеджер слаг не вводит, сервер делает его из названия категории.
     */
    public static function slugify(string $value): string
    {
        $map = [
            'а' => 'a', 'б' => 'b', 'в' => 'v', 'г' => 'g', 'д' => 'd', 'е' => 'e',
            'ё' => 'e', 'ж' => 'zh', 'з' => 'z', 'и' => 'i', 'й' => 'y', 'к' => 'k',
            'л' => 'l', 'м' => 'm', 'н' => 'n', 'о' => 'o', 'п' => 'p', 'р' => 'r',
            'с' => 's', 'т' => 't', 'у' => 'u', 'ф' => 'f', 'х' => 'h', 'ц' => 'ts',
            'ч' => 'ch', 'ш' => 'sh', 'щ' => 'sch', 'ъ' => '', 'ы' => 'y', 'ь' => '',
            'э' => 'e', 'ю' => 'yu', 'я' => 'ya',
        ];

        $transliterated = '';
        foreach (mb_str_split(mb_strtolower($value, 'UTF-8')) as $char) {
            $transliterated .= $map[$char] ?? $char;
        }

        $slug = preg_replace('/[^a-z0-9]+/', '-', $transliterated) ?? '';
        $slug = trim($slug, '-');
        $slug = mb_substr($slug, 0, 60);
        $slug = rtrim($slug, '-');

        return $slug !== '' ? $slug : 'category';
    }

    /**
     * Обход WAF: фронтенд шлёт title/description/titles в base64, потому что
     * ModSecurity блокировал multipart-запросы с текстом вида ".htaccess".
     * Декодируем ровно так же, как decodeBase64Text() в Node-версии.
     */
    public static function decodeBase64Text(mixed $value): mixed
    {
        if (!is_string($value) || $value === '') {
            return $value;
        }

        $decoded = base64_decode($value, false);
        if ($decoded === false || $decoded === '') {
            return $value;
        }

        return $decoded;
    }
}
