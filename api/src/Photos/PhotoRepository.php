<?php

declare(strict_types=1);

namespace App\Photos;

use App\Support\Dates;
use App\Support\Str;
use PDO;

final class PhotoRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    /** @return array<string, mixed>|null */
    public function findRowById(string $id): ?array
    {
        $statement = $this->pdo->prepare('SELECT * FROM photos WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
        $row = $statement->fetch();

        return is_array($row) ? $row : null;
    }

    /** @return array<string, mixed>|null фото + category {id,name,slug} */
    public function findWithCategory(string $id): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT p.*, c.name AS categoryName, c.slug AS categorySlug
             FROM photos p
             JOIN categories c ON c.id = p.categoryId
             WHERE p.id = :id
             LIMIT 1',
        );
        $statement->execute(['id' => $id]);
        $row = $statement->fetch();

        return is_array($row) ? self::toApi($row, true) : null;
    }

    /** @return list<array<string, mixed>> */
    public function findByCategory(string $categoryId): array
    {
        $statement = $this->pdo->prepare(
            'SELECT * FROM photos WHERE categoryId = :categoryId ORDER BY sortOrder ASC',
        );
        $statement->execute(['categoryId' => $categoryId]);

        return array_map(
            static fn (array $row): array => self::toApi($row, false),
            $statement->fetchAll(),
        );
    }

    /** @return array{data: list<array<string, mixed>>, total: int} */
    public function paginate(?string $categoryId, int $page, int $limit): array
    {
        $offset = max(0, ($page - 1) * $limit);

        if ($categoryId !== null) {
            $countStatement = $this->pdo->prepare('SELECT COUNT(*) FROM photos WHERE categoryId = :categoryId');
            $countStatement->execute(['categoryId' => $categoryId]);
            $total = (int) $countStatement->fetchColumn();

            $statement = $this->pdo->prepare(
                'SELECT p.*, c.name AS categoryName, c.slug AS categorySlug
                 FROM photos p
                 JOIN categories c ON c.id = p.categoryId
                 WHERE p.categoryId = :categoryId
                 ORDER BY p.sortOrder ASC
                 LIMIT ' . $limit . ' OFFSET ' . $offset,
            );
            $statement->execute(['categoryId' => $categoryId]);
        } else {
            $total = (int) $this->pdo->query('SELECT COUNT(*) FROM photos')->fetchColumn();

            $statement = $this->pdo->query(
                'SELECT p.*, c.name AS categoryName, c.slug AS categorySlug
                 FROM photos p
                 JOIN categories c ON c.id = p.categoryId
                 ORDER BY p.sortOrder ASC
                 LIMIT ' . $limit . ' OFFSET ' . $offset,
            );
        }

        $data = array_map(
            static fn (array $row): array => self::toApi($row, true),
            $statement->fetchAll(),
        );

        return ['data' => $data, 'total' => $total];
    }

    public function nextSortOrder(string $categoryId): int
    {
        $statement = $this->pdo->prepare('SELECT MAX(sortOrder) FROM photos WHERE categoryId = :categoryId');
        $statement->execute(['categoryId' => $categoryId]);
        $value = $statement->fetchColumn();

        return ($value === null || $value === false ? -1 : (int) $value) + 1;
    }

    /** @param array<string, mixed> $data */
    public function create(array $data): array
    {
        $id = Str::uuid4();
        $now = Dates::nowUtc();

        $statement = $this->pdo->prepare(
            'INSERT INTO photos
                (id, title, description, filename, originalName, mimeType, size, width, height, sortOrder, categoryId, createdAt, updatedAt)
             VALUES
                (:id, :title, :description, :filename, :originalName, :mimeType, :size, :width, :height, :sortOrder, :categoryId, :createdAt, :updatedAt)',
        );
        $statement->execute([
            'id' => $id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'filename' => $data['filename'],
            'originalName' => $data['originalName'],
            'mimeType' => $data['mimeType'],
            'size' => $data['size'],
            'width' => $data['width'] ?? null,
            'height' => $data['height'] ?? null,
            'sortOrder' => $data['sortOrder'],
            'categoryId' => $data['categoryId'],
            'createdAt' => $now,
            'updatedAt' => $now,
        ]);

        $row = $this->findRowById($id);
        if ($row === null) {
            throw new \RuntimeException('Не удалось прочитать созданное фото');
        }

        return self::toApi($row, false);
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
                'UPDATE photos SET ' . implode(', ', $assignments) . ' WHERE id = :id',
            );
            $statement->execute($fields + ['id' => $id]);
        }

        $row = $this->findRowById($id);
        if ($row === null) {
            throw new \RuntimeException('Фото исчезло после обновления');
        }

        return self::toApi($row, false);
    }

    public function delete(string $id): void
    {
        $statement = $this->pdo->prepare('DELETE FROM photos WHERE id = :id');
        $statement->execute(['id' => $id]);
    }

    /**
     * @param list<string> $ids
     * @return list<array{id: string, filename: string}>
     */
    public function findFilesByIds(array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        $placeholders = implode(', ', array_fill(0, count($ids), '?'));
        $statement = $this->pdo->prepare(
            'SELECT id, filename FROM photos WHERE id IN (' . $placeholders . ')',
        );
        $statement->execute($ids);

        return array_map(
            static fn (array $row): array => [
                'id' => (string) $row['id'],
                'filename' => (string) $row['filename'],
            ],
            $statement->fetchAll(),
        );
    }

    /** @param list<string> $ids */
    public function deleteMany(array $ids): int
    {
        if ($ids === []) {
            return 0;
        }

        $placeholders = implode(', ', array_fill(0, count($ids), '?'));
        $statement = $this->pdo->prepare('DELETE FROM photos WHERE id IN (' . $placeholders . ')');
        $statement->execute($ids);

        return $statement->rowCount();
    }

    /** @param list<array{id: string, sortOrder: int}> $items */
    public function reorder(array $items): void
    {
        $this->pdo->beginTransaction();
        try {
            $statement = $this->pdo->prepare('UPDATE photos SET sortOrder = :sortOrder WHERE id = :id');
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

    public function count(): int
    {
        return (int) $this->pdo->query('SELECT COUNT(*) FROM photos')->fetchColumn();
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public static function toApi(array $row, bool $withCategory): array
    {
        $photo = [
            'id' => (string) $row['id'],
            'title' => (string) $row['title'],
            'description' => $row['description'] !== null ? (string) $row['description'] : null,
            'filename' => (string) $row['filename'],
            'originalName' => (string) $row['originalName'],
            'mimeType' => (string) $row['mimeType'],
            'size' => (int) $row['size'],
            'width' => $row['width'] !== null ? (int) $row['width'] : null,
            'height' => $row['height'] !== null ? (int) $row['height'] : null,
            'sortOrder' => (int) $row['sortOrder'],
            'categoryId' => (string) $row['categoryId'],
            'createdAt' => Dates::toIso($row['createdAt'] !== null ? (string) $row['createdAt'] : null),
            'updatedAt' => Dates::toIso($row['updatedAt'] !== null ? (string) $row['updatedAt'] : null),
        ];

        if ($withCategory && isset($row['categoryName'], $row['categorySlug'])) {
            $photo['category'] = [
                'id' => (string) $row['categoryId'],
                'name' => (string) $row['categoryName'],
                'slug' => (string) $row['categorySlug'],
            ];
        }

        return $photo;
    }
}
