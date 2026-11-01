<?php

declare(strict_types=1);

namespace App\Upload;

use App\Auth\Guard;
use App\Http\HttpException;
use App\Http\Request;

/**
 * POST /api/upload/photo — загрузка и оптимизация фото без записи в БД.
 */
final class UploadController
{
    public function __construct(
        private readonly UploadService $uploads,
        private readonly Guard $guard,
    ) {
    }

    public function uploadPhoto(Request $request): array
    {
        $this->guard->user($request);

        $files = $request->uploadedFiles('file');
        if ($files === []) {
            throw new HttpException(400, 'Файл не загружен');
        }

        $fileData = $this->uploads->store($files[0]);

        return [
            'filename' => $fileData['filename'],
            'originalName' => $fileData['originalName'],
            'mimeType' => $fileData['mimeType'],
            'size' => $fileData['webpSize'],
            'width' => $fileData['width'],
            'height' => $fileData['height'],
            'url' => $this->uploads->urlFor($fileData['filename']),
        ];
    }
}
