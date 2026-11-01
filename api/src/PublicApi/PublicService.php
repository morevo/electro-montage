<?php

declare(strict_types=1);

namespace App\PublicApi;

use App\Categories\CategoryRepository;
use App\Http\HttpException;

/**
 * Публичный API портфолио — без авторизации, как backend/src/public.
 */
final class PublicService
{
    public function __construct(private readonly CategoryRepository $categories)
    {
    }

    /** @return list<array<string, mixed>> */
    public function getCategories(): array
    {
        return $this->categories->findPublicCategories();
    }

    public function getCategoryBySlug(string $slug): array
    {
        $category = $this->categories->findPublicCategoryBySlug($slug);
        if ($category === null) {
            throw new HttpException(404, 'Категория не найдена');
        }

        return $category;
    }
}
