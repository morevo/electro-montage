<?php

declare(strict_types=1);

namespace App\Categories;

use App\Http\HttpException;
use App\Support\Str;

final class CategoryService
{
    public function __construct(private readonly CategoryRepository $categories)
    {
    }

    /** @param array<string, mixed> $data */
    public function create(array $data): array
    {
        $name = (string) $data['name'];

        if ($this->categories->nameTaken($name)) {
            throw new HttpException(409, 'Категория с таким названием уже существует');
        }

        // Слаг приходит из API или генерируется из названия — в админке поля нет.
        $requestedSlug = isset($data['slug']) ? (string) $data['slug'] : null;
        if ($requestedSlug !== null && $this->categories->slugTaken($requestedSlug)) {
            throw new HttpException(409, 'Категория с таким слагом уже существует');
        }

        return $this->categories->create([
            'name' => $name,
            'slug' => $requestedSlug ?? $this->uniqueSlug($name),
            'description' => isset($data['description']) ? (string) $data['description'] : null,
            'sortOrder' => $this->categories->nextSortOrder(),
        ]);
    }

    /** @return list<array<string, mixed>> */
    public function findAll(): array
    {
        return $this->categories->findAllWithPhotoCounts();
    }

    public function findOne(string $id): array
    {
        $row = $this->categories->findRowById($id);
        if ($row === null) {
            throw new HttpException(404, 'Категория не найдена');
        }

        $category = CategoryRepository::toApi($row);
        $category['photos'] = $this->categories->photosForCategory($id);

        return $category;
    }

    public function findBySlug(string $slug): array
    {
        $row = $this->categories->findRowBySlug($slug);
        if ($row === null) {
            throw new HttpException(404, 'Категория не найдена');
        }

        $category = CategoryRepository::toApi($row);
        $category['photos'] = $this->categories->photosForCategory((string) $row['id']);

        return $category;
    }

    /** @param array<string, mixed> $data */
    public function update(string $id, array $data): array
    {
        $this->findOne($id);

        if (isset($data['name']) && $this->categories->nameTaken((string) $data['name'], $id)) {
            throw new HttpException(409, 'Категория с таким названием уже существует');
        }

        if (isset($data['slug']) && $this->categories->slugTaken((string) $data['slug'], $id)) {
            throw new HttpException(409, 'Категория с таким слагом уже существует');
        }

        $fields = [];
        foreach (['name', 'slug', 'description'] as $field) {
            if (array_key_exists($field, $data)) {
                $fields[$field] = $data[$field];
            }
        }

        return $this->categories->update($id, $fields);
    }

    public function delete(string $id): array
    {
        $this->findOne($id);
        $this->categories->delete($id);

        return ['message' => 'Категория удалена'];
    }

    /**
     * @param list<array{id: string, sortOrder: int}> $items
     * @return list<array<string, mixed>>
     */
    public function reorder(array $items): array
    {
        $this->categories->reorder($items);

        return $this->findAll();
    }

    /** Свободный слаг: base, base-2, base-3… */
    private function uniqueSlug(string $base, ?string $exceptId = null): string
    {
        $root = Str::slugify($base);

        for ($i = 1; $i < 100; $i += 1) {
            $candidate = $i === 1 ? $root : $root . '-' . $i;
            if (!$this->categories->slugTaken($candidate, $exceptId)) {
                return $candidate;
            }
        }

        return $root . '-' . (int) (microtime(true) * 1000);
    }
}
