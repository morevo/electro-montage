<?php

declare(strict_types=1);

namespace App\Upload;

use App\Http\HttpException;

/**
 * WebP-конвертация вместо sharp: Imagick, если расширение установлено на
 * хостинге, иначе GD (на reg.ru доступен хотя бы один из них; какой именно —
 * проверяет bin/healthcheck.php).
 */
final class ImageProcessor
{
    private const WEBP_QUALITY = 85;

    /** @return array{width: int, height: int, type: int} */
    public function inspect(string $path): array
    {
        $info = @getimagesize($path);
        if ($info === false) {
            throw new HttpException(400, 'Не удалось определить размеры изображения');
        }

        return [
            'width' => (int) $info[0],
            'height' => (int) $info[1],
            'type' => (int) $info[2],
        ];
    }

    public function convertToWebp(string $sourcePath, string $targetPath, int $imageType): void
    {
        try {
            if (class_exists(\Imagick::class)) {
                $this->convertWithImagick($sourcePath, $targetPath);
            } else {
                $this->convertWithGd($sourcePath, $targetPath, $imageType);
            }
        } catch (HttpException $exception) {
            throw $exception;
        } catch (\Throwable $exception) {
            error_log('WebP conversion failed: ' . $exception->getMessage());
            throw new HttpException(400, 'Ошибка обработки изображения');
        }
    }

    private function convertWithImagick(string $sourcePath, string $targetPath): void
    {
        $image = new \Imagick($sourcePath);
        $image->setImageFormat('webp');
        $image->setImageCompressionQuality(self::WEBP_QUALITY);
        $image->stripImage();
        $image->writeImage($targetPath);
        $image->clear();
    }

    private function convertWithGd(string $sourcePath, string $targetPath, int $imageType): void
    {
        if (!function_exists('imagewebp')) {
            throw new HttpException(
                500,
                'На сервере не установлено ни Imagick, ни GD с поддержкой WebP — обработка фото недоступна',
            );
        }

        $image = match ($imageType) {
            IMAGETYPE_JPEG => imagecreatefromjpeg($sourcePath),
            IMAGETYPE_PNG => imagecreatefrompng($sourcePath),
            IMAGETYPE_WEBP => imagecreatefromwebp($sourcePath),
            default => false,
        };

        if ($image === false) {
            throw new HttpException(400, 'Ошибка обработки изображения');
        }

        // Сохраняем прозрачность PNG/WebP при конвертации.
        imagepalettetotruecolor($image);
        imagealphablending($image, false);
        imagesavealpha($image, true);

        $written = imagewebp($image, $targetPath, self::WEBP_QUALITY);
        imagedestroy($image);

        if ($written === false) {
            throw new HttpException(400, 'Ошибка обработки изображения');
        }
    }
}
