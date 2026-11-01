<?php

declare(strict_types=1);

namespace App\Photos;

use App\Categories\CategoryRepository;
use App\Http\HttpException;
use App\Upload\UploadService;

final class PhotoService
{
    public function __construct(
        private readonly PhotoRepository $photos,
        private readonly CategoryRepository $categories,
        private readonly UploadService $uploads,
    ) {
    }

    /**
     * @param array<string, mixed> $data  title/description/categoryId
     * @param array<string, mixed> $fileData filename/originalName/mimeType/size/width/height
     */
    public function create(string $categoryId, array $data, array $fileData): array
    {
        $this->assertCategoryExists($categoryId);

        return $this->photos->create([
            'title' => (string) $data['title'],
            'description' => isset($data['description']) ? (string) $data['description'] : null,
            'categoryId' => $categoryId,
            'sortOrder' => $this->photos->nextSortOrder($categoryId),
            'filename' => $fileData['filename'],
            'originalName' => $fileData['originalName'],
            'mimeType' => $fileData['mimeType'],
            'size' => $fileData['size'],
            'width' => $fileData['width'],
            'height' => $fileData['height'],
        ]);
    }

    public function findAll(?string $categoryId, int $page, int $limit): array
    {
        $page = max(1, $page);
        $limit = max(1, min(100, $limit));

        $result = $this->photos->paginate($categoryId, $page, $limit);
        $total = $result['total'];

        return [
            'data' => $result['data'],
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'totalPages' => (int) ceil($total / $limit),
        ];
    }

    public function findOne(string $id): array
    {
        $photo = $this->photos->findWithCategory($id);
        if ($photo === null) {
            throw new HttpException(404, 'Фото не найдено');
        }

        return $photo;
    }

    /** @param array<string, mixed> $data */
    public function update(string $id, array $data): array
    {
        $this->findOne($id);

        if (isset($data['categoryId'])) {
            $this->assertCategoryExists((string) $data['categoryId']);
        }

        $fields = [];
        foreach (['title', 'description', 'categoryId'] as $field) {
            if (array_key_exists($field, $data)) {
                $fields[$field] = $data[$field];
            }
        }

        return $this->photos->update($id, $fields);
    }

    public function delete(string $id): array
    {
        $photo = $this->findOne($id);

        // Иначе при удалении фото оставались «сироты» на диске.
        $this->uploads->deleteFile((string) $photo['filename']);

        $this->photos->delete($id);

        return ['message' => 'Фото удалено'];
    }

    /** @param list<string> $ids */
    public function removeMany(array $ids): array
    {
        $files = $this->photos->findFilesByIds($ids);

        foreach ($files as $file) {
            $this->uploads->deleteFile($file['filename']);
        }

        $deleted = $this->photos->deleteMany(array_column($files, 'id'));

        return ['deleted' => $deleted];
    }

    /**
     * @param list<array{id: string, sortOrder: int}> $items
     */
    public function reorder(string $categoryId, array $items): array
    {
        $this->assertCategoryExists($categoryId);

        $this->photos->reorder($items);

        // Как в NestJS: ответ — первая страница фото этой категории.
        return $this->findAll($categoryId, 1, 20);
    }

    private function assertCategoryExists(string $categoryId): void
    {
        if ($this->categories->findRowById($categoryId) === null) {
            throw new HttpException(404, 'Категория не найдена');
        }
    }
}
