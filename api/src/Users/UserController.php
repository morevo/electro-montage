<?php

declare(strict_types=1);

namespace App\Users;

use App\Auth\Guard;
use App\Http\Request;
use App\Http\Validator;

/**
 * Все маршруты только для SUPER_ADMIN (как UsersController в NestJS).
 */
final class UserController
{
    public function __construct(
        private readonly UserService $users,
        private readonly Guard $guard,
    ) {
    }

    public function create(Request $request): array
    {
        $this->authorize($request);

        $body = $request->json();
        $validator = Validator::for($body, ['login', 'password', 'name']);
        $validator->string(
            'login',
            true,
            null,
            64,
            '/^[a-zA-Z0-9_.-]+$/',
            'Логин — не e-mail: только латиница, цифры, точка, дефис и подчёркивание',
        );
        $validator->string('password', true, 6);
        $validator->string('name', false);
        $validator->done();

        return $this->users->create($body);
    }

    public function findAll(Request $request): array
    {
        $this->authorize($request);

        return $this->users->findAll();
    }

    public function findOne(Request $request, string $id): array
    {
        $this->authorize($request);

        return $this->users->findById($id);
    }

    public function update(Request $request, string $id): array
    {
        $this->authorize($request);

        $body = $request->json();
        $validator = Validator::for($body, ['login', 'password', 'name', 'role']);
        $validator->string(
            'login',
            false,
            null,
            64,
            '/^[a-zA-Z0-9_.-]+$/',
            'Логин — не e-mail: только латиница, цифры, точка, дефис и подчёркивание',
        );
        $validator->string('password', false, 6);
        $validator->string('name', false);
        $validator->enum('role', ['ADMIN', 'SUPER_ADMIN'], false);
        $validator->done();

        return $this->users->update($id, $body);
    }

    public function delete(Request $request, string $id): array
    {
        $this->authorize($request);

        return $this->users->delete($id);
    }

    private function authorize(Request $request): void
    {
        $user = $this->guard->user($request);
        $this->guard->requireRole($user, 'SUPER_ADMIN');
    }
}
