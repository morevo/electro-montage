<?php

declare(strict_types=1);

namespace App\Auth;

use App\Http\Request;
use App\Http\Validator;

final class AuthController
{
    public function __construct(
        private readonly AuthService $auth,
        private readonly Guard $guard,
    ) {
    }

    public function login(Request $request): array
    {
        $body = $request->json();

        $validator = Validator::for($body, ['login', 'password']);
        $validator->string(
            'login',
            true,
            null,
            64,
            '/^[a-zA-Z0-9_.-]+$/',
            'Логин — не e-mail: только латиница, цифры, точка, дефис и подчёркивание',
        );
        $validator->string('password', true, 6);
        $validator->done();

        /** @var array{login: string, password: string} $body */
        return $this->auth->login($body);
    }

    public function logout(Request $request): array
    {
        return $this->auth->logout($request->cookie('refresh_token'));
    }

    public function refresh(Request $request): array
    {
        return $this->auth->refresh($request->cookie('refresh_token'));
    }

    public function me(Request $request): array
    {
        $user = $this->guard->user($request);

        return $this->auth->getProfile((string) $user['id']);
    }
}
