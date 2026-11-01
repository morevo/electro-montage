<?php

declare(strict_types=1);

namespace App\Photos;

use App\Auth\Guard;
use App\Http\HttpException;
use App\Http\Request;
use App\Http\Validator;
use App\Support\Str;
use App\Upload\UploadService;

/**
 * Перенос backend/src/photos/photos.controller.ts: те же маршруты,
 * multipart-поля и WAF-обходы (base64 для текста, нейтральное имя файла).
 */
final class PhotoController
{
    private const MAX_BULK_FILES = 20;

    public function __construct(
        private readonly PhotoService $photos,
        private readonly UploadService $uploads,
        private readonly Guard $guard,
    ) {
    }

    public function create(Request $request): array
    {
        $this->guard->user($request);

        $body = $request->post;

        // Свободный текст приходит в base64 — декодируем ДО валидации.
        if (array_key_exists('title', $body)) {
            $body['title'] = Str::decodeBase64Text($body['title']);
        }
        if (array_key_exists('description', $body)) {
            $body['description'] = Str::decodeBase64Text($body['description']);
        }

        $validator = Validator::for($body, [
            'file', 'title', 'description', 'categoryId',
            'filename', 'originalName', 'mimeType', 'size', 'width', 'height',
        ]);
        $validator->string('title', true, null, 200);
        $validator->string('description', false, null, 500);
        $validator->uuid('categoryId');
        $validator->done();

        $files = $request->uploadedFiles('file');
        if ($files === []) {
            throw new HttpException(400, 'Файл не загружен');
        }

        $fileData = $this->uploads->store($files[0]);

        return $this->photos->create((string) $body['categoryId'], $body, $fileData);
    }

    public function createMany(Request $request): array
    {
        $this->guard->user($request);

        $body = $request->post;

        if (array_key_exists('titles', $body)) {
            $body['titles'] = Str::decodeBase64Text($body['titles']);
        }
        if (array_key_exists('description', $body)) {
            $body['description'] = Str::decodeBase64Text($body['description']);
        }

        $validator = Validator::for($body, ['files', 'categoryId', 'titles', 'description']);
        $validator->uuid('categoryId');
        $validator->string('titles', false, null, 7000);
        $validator->string('description', false, null, 500);
        $validator->done();

        $files = $request->uploadedFiles('files');
        if ($files === []) {
            throw new HttpException(400, 'Файлы не загружены');
        }
        if (count($files) > self::MAX_BULK_FILES) {
            throw new HttpException(400, 'Слишком много файлов (максимум ' . self::MAX_BULK_FILES . ')');
        }

        $titles = [];
        if (isset($body['titles']) && (string) $body['titles'] !== '') {
            $decoded = json_decode((string) $body['titles'], true);
            if (!is_array($decoded)) {
                throw new HttpException(400, 'Поле titles должно быть JSON-массивом строк');
            }
            foreach ($decoded as $value) {
                $titles[] = is_scalar($value) ? (string) $value : '';
            }
        }

        $categoryId = (string) $body['categoryId'];
        $created = [];

        foreach ($files as $index => $file) {
            $fileData = $this->uploads->store($file);

            $title = trim($titles[$index] ?? '');
            if ($title === '') {
                $title = (string) preg_replace('/\.[^.]+$/', '', $file['name']);
            }
            if ($title === '') {
                $title = 'Фото';
            }

            $created[] = $this->photos->create($categoryId, [
                'title' => $title,
                'description' => $body['description'] ?? null,
            ], $fileData);
        }

        return ['created' => $created];
    }

    public function deleteMany(Request $request): array
    {
        $this->guard->user($request);

        $body = $request->json();
        $validator = Validator::for($body, ['ids']);
        $ids = $validator->array('ids');
        $validator->done();

        if ($ids === []) {
            throw new HttpException(400, ['ids should not be empty']);
        }
        if (count($ids) > 200) {
            throw new HttpException(400, ['ids must contain no more than 200 elements']);
        }

        $validated = [];
        foreach ($ids as $id) {
            if (!is_string($id) || !Str::isUuid($id)) {
                throw new HttpException(400, ['each value in ids must be a UUID']);
            }
            $validated[] = $id;
        }

        return $this->photos->removeMany($validated);
    }

    public function findAll(Request $request): array
    {
        $this->guard->user($request);

        $categoryId = isset($request->query['categoryId']) && $request->query['categoryId'] !== ''
            ? (string) $request->query['categoryId']
            : null;
        $page = isset($request->query['page']) ? (int) $request->query['page'] : 1;
        $limit = isset($request->query['limit']) ? (int) $request->query['limit'] : 20;

        return $this->photos->findAll($categoryId, $page, $limit);
    }

    public function findOne(Request $request, string $id): array
    {
        $this->guard->user($request);

        return $this->photos->findOne($id);
    }

    public function reorder(Request $request): array
    {
        $this->guard->user($request);

        $body = $request->json();
        $validator = Validator::for($body, ['categoryId', 'items']);
        $categoryId = $validator->uuid('categoryId');
        $items = $validator->array('items');
        $validator->done();

        $parsed = [];
        foreach ($items ?? [] as $item) {
            if (!is_array($item)) {
                throw new HttpException(400, ['items must be an array']);
            }

            $itemValidator = Validator::for($item, ['id', 'sortOrder']);
            $id = $itemValidator->uuid('id');
            $sortOrder = $itemValidator->int('sortOrder', true, 0);
            $itemValidator->done();

            if ($id !== null && $sortOrder !== null) {
                $parsed[] = ['id' => $id, 'sortOrder' => $sortOrder];
            }
        }

        return $this->photos->reorder((string) $categoryId, $parsed);
    }

    public function update(Request $request, string $id): array
    {
        $this->guard->user($request);

        $body = $request->json();
        $validator = Validator::for($body, ['title', 'description', 'categoryId']);
        $validator->string('title', false, null, 200);
        $validator->string('description', false, null, 500);
        $validator->uuid('categoryId', false);
        $validator->done();

        return $this->photos->update($id, $body);
    }

    public function delete(Request $request, string $id): array
    {
        $this->guard->user($request);

        return $this->photos->delete($id);
    }
}
