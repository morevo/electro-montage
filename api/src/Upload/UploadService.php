<?php

declare(strict_types=1);

namespace App\Upload;

use App\Http\HttpException;
use App\Support\Config;
use App\Support\Str;

/**
 * Перенос backend/src/upload/upload.service.ts: те же разрешённые форматы,
 * лимит размера, лимит 5000px и конвертация результата в WebP.
 *
 * Имя файла на диске — UUID + расширение (оригинальное имя клиента хранится
 * только в БД). Это же снимает WAF-проблему с «опасными» именами файлов.
 */
final class UploadService
{
    private const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
    private const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    private const MAX_DIMENSION = 5000;

    public function __construct(
        private readonly Config $config,
        private readonly ImageProcessor $images,
    ) {
    }

    /**
     * @param array{name: string, tmp_name: string, type: string, error: int, size: int} $file
     * @return array{filename: string, originalName: string, mimeType: string, size: int, webpSize: int, width: int, height: int}
     */
    public function store(array $file): array
    {
        $this->assertUploaded($file);

        $originalName = $file['name'];
        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

        if (!in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
            throw new HttpException(400, 'Недопустимый формат файла. Разрешены: JPG, PNG, WebP');
        }

        if ($file['size'] > $this->config->maxFileSize()) {
            throw new HttpException(400, 'Файл слишком большой');
        }

        $mimeType = $this->detectMimeType($file['tmp_name']);
        if (!in_array($mimeType, self::ALLOWED_MIME_TYPES, true)) {
            throw new HttpException(400, 'Недопустимый MIME тип файла');
        }

        $info = $this->images->inspect($file['tmp_name']);
        if ($info['width'] > self::MAX_DIMENSION || $info['height'] > self::MAX_DIMENSION) {
            throw new HttpException(400, 'Изображение слишком большое (макс. 5000px)');
        }

        $directory = $this->config->portfolioDir();
        $this->ensureDirectory($directory);

        $baseName = Str::uuid4();
        $sourcePath = $directory . '/' . $baseName . '.' . ($extension === 'jpeg' ? 'jpg' : $extension);
        $targetPath = $directory . '/' . $baseName . '.webp';

        if (!@move_uploaded_file($file['tmp_name'], $sourcePath) && !@rename($file['tmp_name'], $sourcePath)) {
            throw new HttpException(500, 'Не удалось сохранить загруженный файл');
        }

        try {
            $this->images->convertToWebp($sourcePath, $targetPath, $info['type']);
        } finally {
            if (is_file($sourcePath)) {
                @unlink($sourcePath);
            }
        }

        if (!is_file($targetPath)) {
            throw new HttpException(400, 'Ошибка обработки изображения');
        }

        return [
            'filename' => $baseName . '.webp',
            'originalName' => $originalName,
            'mimeType' => 'image/webp',
            'size' => $file['size'],
            'webpSize' => (int) (filesize($targetPath) ?: 0),
            'width' => $info['width'],
            'height' => $info['height'],
        ];
    }

    /** @param array{error: int, tmp_name: string} $file */
    private function assertUploaded(array $file): void
    {
        $error = $file['error'];

        if ($error === UPLOAD_ERR_OK && is_uploaded_file($file['tmp_name'])) {
            return;
        }

        throw match ($error) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => new HttpException(400, 'Файл слишком большой'),
            UPLOAD_ERR_NO_FILE => new HttpException(400, 'Файл не загружен'),
            default => new HttpException(400, 'Не удалось загрузить файл'),
        };
    }

    private function detectMimeType(string $path): string
    {
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($path);

        return is_string($mime) ? strtolower($mime) : '';
    }

    private function ensureDirectory(string $directory): void
    {
        if (is_dir($directory)) {
            return;
        }

        if (!@mkdir($directory, 0775, true) && !is_dir($directory)) {
            throw new HttpException(500, 'Не удалось создать каталог для загрузки файлов');
        }
    }

    /** Физическое удаление файла фото (при удалении записи из БД). */
    public function deleteFile(string $filename): void
    {
        $path = $this->config->portfolioDir() . '/' . basename($filename);
        if (is_file($path)) {
            @unlink($path);
        }
    }

    public function urlFor(string $filename): string
    {
        return '/uploads/portfolio/' . $filename;
    }
}
