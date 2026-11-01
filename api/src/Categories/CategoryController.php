<?php

declare(strict_types=1);

namespace App\Categories;

use App\Auth\Guard;
use App\Http\Request;
use App\Http\Validator;

/**
 * Все маршруты требуют авторизации (JwtAuthGuard в NestJS).
 */
final class CategoryController
{
    public function __construct(
        private readonly CategoryService $categories,
        private readonly Guard $guard,
    ) {
    }

    public function create(Request $request): array
    {
        $this->guard->user($request);

        $body = $request->json();
        $validator = Validator::for($body, ['name', 'slug', 'description']);
        $validator->string('name', true, 2, 100);
        $validator->string(
            'slug',
            false,
            2,
            100,
            '/^[a-z0-9-]+$/',
            'Слаг может содержать только строчные буквы, цифры и дефисы',
        );
        $validator->string('description', false, null, 500);
        $validator->done();

        return $this->categories->create($body);
    }

    public function findAll(Request $request): array
    {
        $this->guard->user($request);

        return $this->categories->findAll();
    }

    public function findBySlug(Request $request, string $slug): array
    {
        $this->guard->user($request);

        return $this->categories->findBySlug($slug);
    }

    public function findOne(Request $request, string $id): array
    {
        $this->guard->user($request);

        return $this->categories->findOne($id);
    }

    public function reorder(Request $request): array
    {
        $this->guard->user($request);

        $body = $request->json();
        $validator = Validator::for($body, ['items']);
        $items = $validator->array('items');
        $validator->done();

        $parsed = [];
        foreach ($items ?? [] as $item) {
            if (!is_array($item)) {
                throw new \App\Http\ValidationException(['items must be an array']);
            }

            $itemValidator = Validator::for($item, ['id', 'sortOrder']);
            $id = $itemValidator->uuid('id');
            $sortOrder = $itemValidator->int('sortOrder', true, 0);
            $itemValidator->done();

            if ($id !== null && $sortOrder !== null) {
                $parsed[] = ['id' => $id, 'sortOrder' => $sortOrder];
            }
        }

        return $this->categories->reorder($parsed);
    }

    public function update(Request $request, string $id): array
    {
        $this->guard->user($request);

        $body = $request->json();
        $validator = Validator::for($body, ['name', 'slug', 'description']);
        $validator->string('name', false, 2, 100);
        $validator->string(
            'slug',
            false,
            2,
            100,
            '/^[a-z0-9-]+$/',
            'Слаг может содержать только строчные буквы, цифры и дефисы',
        );
        $validator->string('description', false, null, 500);
        $validator->done();

        return $this->categories->update($id, $body);
    }

    public function delete(Request $request, string $id): array
    {
        $this->guard->user($request);

        return $this->categories->delete($id);
    }
}
