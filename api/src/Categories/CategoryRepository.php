<?php

declare(strict_types=1);

namespace App\Categories;

use App\Photos\PhotoRepository;
use App\Support\Dates;
use App\Support\Str;
use PDO;

final class CategoryRepository
{
    public function __construct(
        private readonly PDO $pdo,
        private readonly PhotoRepository $photos,
    ) {
    }

    /** @return array<string, mixed>|null */
    public function findRowById(string $id): ?array
    {
        $statement = $this->pdo->prepare('SELECT * FROM categories WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
        $row = $statement->fetch();

        return is_array($row) ? $row : null;
    }

    /** @return array<string, mixed>|null */
    public function findRowBySlug(string $slug): ?array
    {
        $statement = $this->pdo->prepare('SELECT * FROM categories WHERE slug = :slug LIMIT 1');
        $statement->execute(['slug' => $slug]);
        $row = $statement->fetch();

        return is_array($row) ? $row : null;
    }

    /** @return array<string, mixed>|null */
    public function findRowByName(string $name): ?array
    {
        $statement = $this->pdo->prepare('SELECT * FROM categories WHERE name = :name LIMIT 1');
        $statement->execute(['name' => $name]);
        $row = $statement->fetch();

        return is_array($row) ? $row : null;
    }

    public function slugTaken(string $slug, ?string $exceptId = null): bool
    {
        $sql = 'SELECT id FROM categories WHERE slug = :slug';
        $params = ['slug' => $slug];
        if ($exceptId !== null) {
            $sql .= ' AND id <> :id';
            $params['id'] = $exceptId;
        }

        $statement = $this->pdo->prepare($sql . ' LIMIT 1');
        $statement->execute($params);

        return $statement->fetch() !== false;
    }

    public function nameTaken(string $name, ?string $exceptId = null): bool
    {
        $sql = 'SELECT id FROM categories WHERE name = :name';
        $params = ['name' => $name];
        if ($exceptId !== null) {
            $sql .= ' AND id <> :id';
            $params['id'] = $exceptId;
        }

        $statement = $this->pdo->prepare($sql . ' LIMIT 1');
        $statement->execute($params);

        return $statement->fetch() !== false;
    }

    public function nextSortOrder(): int
    {
        $value = $this->pdo->query('SELECT MAX(sortOrder) FROM categories')->fetchColumn();

        return ($value === null || $value === false ? -1 : (int) $value) + 1;
    }

    /** @param array<string, mixed> $data */
    public function create(array $data): array
    {
        $id = Str::uuid4();
        $now = Dates::nowUtc();

        $statement = $this->pdo->prepare(
            'INSERT INTO categories (id, name, slug, description, sortOrder, createdAt, updatedAt)
             VALUES (:id, :name, :slug, :description, :sortOrder, :createdAt, :updatedAt)',
        );
        $statement->execute([
            'id' => $id,
            'name' => $data['name'],
            'slug' => $data['slug'],
            'description' => $data['description'] ?? null,
            'sortOrder' => $data['sortOrder'],
            'createdAt' => $now,
            'updatedAt' => $now,
        ]);

        $row = $this->findRowById($id);
        if ($row === null) {
            throw new \RuntimeException('Не удалось прочитать созданную категорию');
        }

        return self::toApi($row);
    }

    /** @return list<array<string, mixed>> категории с _count.photos */
    public function findAllWithPhotoCounts(): array
    {
        $statement = $this->pdo->query(
            'SELECT c.*, (
                SELECT COUNT(*) FROM photos p WHERE p.categoryId = c.id
             ) AS photosCount
             FROM categories c
             ORDER BY c.sortOrder ASC',
        );

        $result = [];
        foreach ($statement->fetchAll() as $row) {
            $category = self::toApi($row);
            $category['_count'] = ['photos' => (int) $row['photosCount']];
            $result[] = $category;
        }

        return $result;
    }

    /** @param array<string, mixed> $fields */
    public function update(string $id, array $fields): array
    {
        if ($fields !== []) {
            $fields['updatedAt'] = Dates::nowUtc();

            $assignments = [];
            foreach (array_keys($fields) as $column) {
                $assignments[] = $column . ' = :' . $column;
            }

            $statement = $this->pdo->prepare(
                'UPDATE categories SET ' . implode(', ', $assignments) . ' WHERE id = :id',
            );
            $statement->execute($fields + ['id' => $id]);
        }

        $row = $this->findRowById($id);
        if ($row === null) {
            throw new \RuntimeException('Категория исчезла после обновления');
        }

        return self::toApi($row);
    }

    public function delete(string $id): void
    {
        $statement = $this->pdo->prepare('DELETE FROM categories WHERE id = :id');
        $statement->execute(['id' => $id]);
    }

    /** @param list<array{id: string, sortOrder: int}> $items */
    public function reorder(array $items): void
    {
        $this->pdo->beginTransaction();
        try {
            $statement = $this->pdo->prepare('UPDATE categories SET sortOrder = :sortOrder WHERE id = :id');
            foreach ($items as $item) {
                $statement->execute([
                    'sortOrder' => $item['sortOrder'],
                    'id' => $item['id'],
                ]);
            }
            $this->pdo->commit();
        } catch (\Throwable $exception) {
            $this->pdo->rollBack();
            throw $exception;
        }
    }

    /** @return list<array<string, mixed>> */
    public function photosForCategory(string $categoryId): array
    {
        return $this->photos->findByCategory($categoryId);
    }

    /**
     * Публичный каталог: все категории с ограниченным набором полей фото.
     *
     * @return list<array<string, mixed>>
     */
    public function findPublicCategories(): array
    {
        $categories = $this->pdo->query(
            'SELECT * FROM categories ORDER BY sortOrder ASC',
        )->fetchAll();

        return $this->attachPublicPhotos($categories);
    }

    /** @return array<string, mixed>|null */
    public function findPublicCategoryBySlug(string $slug): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT * FROM categories WHERE slug = :slug LIMIT 1',
        );
        $statement->execute(['slug' => $slug]);
        $row = $statement->fetch();

        if (!is_array($row)) {
            return null;
        }

        return $this->attachPublicPhotos([$row])[0];
    }

    /**
     * @param list<array<string, mixed>> $categories
     * @return list<array<string, mixed>>
     */
    private function attachPublicPhotos(array $categories): array
    {
        if ($categories === []) {
            return [];
        }

        $photosByCategory = [];
        $statement = $this->pdo->query(
            'SELECT id, title, description, filename, width, height, sortOrder, categoryId
             FROM photos ORDER BY sortOrder ASC',
        );

        foreach ($statement->fetchAll() as $photo) {
            $photosByCategory[(string) $photo['categoryId']][] = [
                'id' => (string) $photo['id'],
                'title' => (string) $photo['title'],
                'description' => $photo['description'] !== null ? (string) $photo['description'] : null,
                'filename' => (string) $photo['filename'],
                'width' => $photo['width'] !== null ? (int) $photo['width'] : null,
                'height' => $photo['height'] !== null ? (int) $photo['height'] : null,
                'sortOrder' => (int) $photo['sortOrder'],
            ];
        }

        $result = [];
        foreach ($categories as $row) {
            $category = self::toApi($row);
            $category['photos'] = $photosByCategory[(string) $row['id']] ?? [];
            $result[] = $category;
        }

        return $result;
    }

    /** @param array<string, mixed> $row */
    public static function toApi(array $row): array
    {
        return [
            'id' => (string) $row['id'],
            'name' => (string) $row['name'],
            'slug' => (string) $row['slug'],
            'description' => $row['description'] !== null ? (string) $row['description'] : null,
            'sortOrder' => (int) $row['sortOrder'],
            'createdAt' => Dates::toIso($row['createdAt'] !== null ? (string) $row['createdAt'] : null),
            'updatedAt' => Dates::toIso($row['updatedAt'] !== null ? (string) $row['updatedAt'] : null),
        ];
    }
}
