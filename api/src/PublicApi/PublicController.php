<?php

declare(strict_types=1);

namespace App\PublicApi;

use App\Http\Request;

final class PublicController
{
    public function __construct(private readonly PublicService $public)
    {
    }

    public function categories(Request $request): array
    {
        return $this->public->getCategories();
    }

    public function categoryBySlug(Request $request, string $slug): array
    {
        return $this->public->getCategoryBySlug($slug);
    }
}
