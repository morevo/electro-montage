<?php

declare(strict_types=1);

namespace App\Console;

use App\Support\Config;
use App\Support\Dates;
use App\Support\Str;
use PDO;

/**
 * Перенос портфолио из манифеста — перенос seed-portfolio.js.
 * Идемпотентен: повторный запуск ничего не дублирует.
 */
final class PortfolioSeeder
{
    /**
     * @param string|null $sourceDir корень, где лежат изображения по путям манифеста
     *                               (локально — frontend/src/assets, на проде — каталог uploads)
     * @return array{categories: int, photos: int, copied: int, skipped: int}
     */
    public static function run(PDO $pdo, Config $config, ?string $sourceDir = null): array
    {
        $stats = ['categories' => 0, 'photos' => 0, 'copied' => 0, 'skipped' => 0];

        $manifestPath = $config->portfolioManifest();
        if (!is_file($manifestPath)) {
            return $stats;
        }

        $uploadsDir = $config->portfolioDir();
        if (!is_dir($uploadsDir) && !@mkdir($uploadsDir, 0775, true) && !is_dir($uploadsDir)) {
            return $stats;
        }

        $manifest = json_decode((string) file_get_contents($manifestPath), true);
        $items = is_array($manifest) && isset($manifest['portfolio']) && is_array($manifest['portfolio'])
            ? $manifest['portfolio']
            : [];

        if ($items === []) {
            return $stats;
        }

        $order = [];
        foreach ($items as $item) {
            $category = (string) ($item['category'] ?? '');
            if ($category !== '' && !in_array($category, $order, true)) {
                $order[] = $category;
            }
        }

        $categoryIds = [];
        foreach ($order as $index => $categoryName) {
            $categoryIds[$categoryName] = self::ensureCategory($pdo, $categoryName, $index, $stats);
        }

        $sortCounters = [];
        foreach ($items as $item) {
            $file = (string) ($item['file'] ?? '');
            $categoryName = (string) ($item['category'] ?? '');
            if ($file === '' || !isset($categoryIds[$categoryName])) {
                $stats['skipped']++;
                continue;
            }

            $flatName = basename($file);
            $sourcePath = $sourceDir !== null
                ? $sourceDir . '/' . $file
                : $uploadsDir . '/' . preg_replace('#^portfolio/#', '', $file);
            $targetPath = $uploadsDir . '/' . $flatName;

            if ($sourcePath !== $targetPath && is_file($sourcePath) && !is_file($targetPath)) {
                if (@copy($sourcePath, $targetPath)) {
                    $stats['copied']++;
                }
            }

            if (!is_file($targetPath)) {
                $stats['skipped']++;
                continue;
            }

            $existing = $pdo->prepare('SELECT id FROM photos WHERE filename = :filename LIMIT 1');
            $existing->execute(['filename' => $flatName]);
            if ($existing->fetch() !== false) {
                $stats['skipped']++;
                continue;
            }

            $sortOrder = $sortCounters[$categoryName] ?? 0;
            $now = Dates::nowUtc();

            $insert = $pdo->prepare(
                'INSERT INTO photos
                    (id, title, description, filename, originalName, mimeType, size, width, height, sortOrder, categoryId, createdAt, updatedAt)
                 VALUES
                    (:id, :title, NULL, :filename, :originalName, \'image/jpeg\', :size, :width, :height, :sortOrder, :categoryId, :createdAt, :updatedAt)',
            );
            $insert->execute([
                'id' => Str::uuid4(),
                'title' => (string) ($item['title'] ?? $flatName),
                'filename' => $flatName,
                'originalName' => $flatName,
                'size' => (int) (filesize($targetPath) ?: 0),
                'width' => isset($item['width']) ? (int) $item['width'] : null,
                'height' => isset($item['height']) ? (int) $item['height'] : null,
                'sortOrder' => $sortOrder,
                'categoryId' => $categoryIds[$categoryName],
                'createdAt' => $now,
                'updatedAt' => $now,
            ]);

            $sortCounters[$categoryName] = $sortOrder + 1;
            $stats['photos']++;
        }

        // Вложенные папки-источники больше не нужны: API отдаёт плоские файлы.
        foreach (scandir($uploadsDir) ?: [] as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }
            $full = $uploadsDir . '/' . $entry;
            if (is_dir($full)) {
                self::removeDirectory($full);
            }
        }

        return $stats;
    }

    /** @param array{categories: int, photos: int, copied: int, skipped: int} $stats */
    private static function ensureCategory(PDO $pdo, string $name, int $sortOrder, array &$stats): string
    {
        $slug = Str::slugify($name);

        $statement = $pdo->prepare('SELECT id, name, slug FROM categories WHERE name = :name OR slug = :slug LIMIT 1');
        $statement->execute(['name' => $name, 'slug' => $slug]);
        $existing = $statement->fetch();

        if (is_array($existing)) {
            return (string) $existing['id'];
        }

        $id = Str::uuid4();
        $now = Dates::nowUtc();

        $insert = $pdo->prepare(
            'INSERT INTO categories (id, name, slug, description, sortOrder, createdAt, updatedAt)
             VALUES (:id, :name, :slug, NULL, :sortOrder, :createdAt, :updatedAt)',
        );
        $insert->execute([
            'id' => $id,
            'name' => $name,
            'slug' => $slug,
            'sortOrder' => $sortOrder,
            'createdAt' => $now,
            'updatedAt' => $now,
        ]);

        $stats['categories']++;

        return $id;
    }

    private static function removeDirectory(string $directory): void
    {
        $items = scandir($directory) ?: [];
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $path = $directory . '/' . $item;
            if (is_dir($path)) {
                self::removeDirectory($path);
            } else {
                @unlink($path);
            }
        }

        @rmdir($directory);
    }
}
