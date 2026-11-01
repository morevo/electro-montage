<?php

declare(strict_types=1);

namespace App;

use App\Auth\AuthController;
use App\Auth\AuthService;
use App\Auth\Guard;
use App\Auth\TokenService;
use App\Categories\CategoryController;
use App\Categories\CategoryRepository;
use App\Categories\CategoryService;
use App\Http\HttpException;
use App\Http\Request;
use App\Http\Response;
use App\Http\Router;
use App\Photos\PhotoController;
use App\Photos\PhotoRepository;
use App\Photos\PhotoService;
use App\PublicApi\PublicController;
use App\PublicApi\PublicService;
use App\Support\Config;
use App\Support\Env;
use App\Support\RateLimiter;
use App\Upload\ImageProcessor;
use App\Upload\UploadController;
use App\Upload\UploadService;
use App\Users\UserController;
use App\Users\UserRepository;
use App\Users\UserService;
use PDO;

/**
 * Сборка приложения: явная инъекция зависимостей вместо DI-контейнера
 * (сервисов немного) и регистрация маршрутов в том же порядке, что в NestJS.
 */
final class App
{
    private function __construct(
        private readonly Config $config,
        private readonly Router $router,
        private readonly Response $response,
        private readonly RateLimiter $rateLimiter,
    ) {
    }

    public static function boot(string $basePath): self
    {
        Env::load($basePath . '/.env');

        $config = Config::fromEnvironment($basePath);
        $pdo = Database::connect($config->databaseUrl());
        $response = new Response();

        $tokenService = new TokenService(
            $config->jwtAccessSecret(),
            $config->jwtRefreshSecret(),
            $config->accessTtl(),
            $config->refreshTtl(),
        );

        $userRepository = new UserRepository($pdo);
        $photoRepository = new PhotoRepository($pdo);
        $categoryRepository = new CategoryRepository($pdo, $photoRepository);
        $guard = new Guard($tokenService, $userRepository);

        $userService = new UserService($userRepository);
        $categoryService = new CategoryService($categoryRepository);
        $uploadService = new UploadService($config, new ImageProcessor());
        $photoService = new PhotoService($photoRepository, $categoryRepository, $uploadService);
        $publicService = new PublicService($categoryRepository);
        $authService = new AuthService($pdo, $userRepository, $tokenService, $response, $config);

        $authController = new AuthController($authService, $guard);
        $userController = new UserController($userService, $guard);
        $categoryController = new CategoryController($categoryService, $guard);
        $photoController = new PhotoController($photoService, $uploadService, $guard);
        $uploadController = new UploadController($uploadService, $guard);
        $publicController = new PublicController($publicService);

        $router = new Router();

        // ── Auth ──
        $router->add('POST', '/api/auth/login', static fn (Request $request): array => $authController->login($request));
        $router->add('POST', '/api/auth/logout', static fn (Request $request): array => $authController->logout($request));
        $router->add('POST', '/api/auth/refresh', static fn (Request $request): array => $authController->refresh($request));
        $router->add('GET', '/api/auth/me', static fn (Request $request): array => $authController->me($request));

        // ── Users (SUPER_ADMIN) ──
        $router->add('POST', '/api/users', static fn (Request $request): array => $userController->create($request), 201);
        $router->add('GET', '/api/users', static fn (Request $request): array => $userController->findAll($request));
        $router->add('GET', '/api/users/{id}', static fn (Request $r, array $p): array => $userController->findOne($r, $p['id']));
        $router->add('PATCH', '/api/users/{id}', static fn (Request $r, array $p): array => $userController->update($r, $p['id']));
        $router->add('DELETE', '/api/users/{id}', static fn (Request $r, array $p): array => $userController->delete($r, $p['id']));

        // ── Categories ──
        $router->add('POST', '/api/categories', static fn (Request $request): array => $categoryController->create($request), 201);
        $router->add('GET', '/api/categories', static fn (Request $request): array => $categoryController->findAll($request));
        $router->add('GET', '/api/categories/slug/{slug}', static fn (Request $r, array $p): array => $categoryController->findBySlug($r, $p['slug']));
        $router->add('GET', '/api/categories/{id}', static fn (Request $r, array $p): array => $categoryController->findOne($r, $p['id']));
        // Статические маршруты объявлены до {id}, иначе reorder попал бы в него.
        $router->add('PATCH', '/api/categories/reorder', static fn (Request $request): array => $categoryController->reorder($request));
        $router->add('PATCH', '/api/categories/{id}', static fn (Request $r, array $p): array => $categoryController->update($r, $p['id']));
        $router->add('DELETE', '/api/categories/{id}', static fn (Request $r, array $p): array => $categoryController->delete($r, $p['id']));

        // ── Photos ──
        $router->add('POST', '/api/photos', static fn (Request $request): array => $photoController->create($request), 201);
        $router->add('POST', '/api/photos/bulk', static fn (Request $request): array => $photoController->createMany($request), 201);
        $router->add('POST', '/api/photos/bulk-delete', static fn (Request $request): array => $photoController->deleteMany($request));
        $router->add('GET', '/api/photos', static fn (Request $request): array => $photoController->findAll($request));
        $router->add('GET', '/api/photos/{id}', static fn (Request $r, array $p): array => $photoController->findOne($r, $p['id']));
        $router->add('PATCH', '/api/photos/reorder', static fn (Request $request): array => $photoController->reorder($request));
        $router->add('PATCH', '/api/photos/{id}', static fn (Request $r, array $p): array => $photoController->update($r, $p['id']));
        $router->add('DELETE', '/api/photos/{id}', static fn (Request $r, array $p): array => $photoController->delete($r, $p['id']));

        // ── Upload ──
        $router->add('POST', '/api/upload/photo', static fn (Request $request): array => $uploadController->uploadPhoto($request), 201);

        // ── Public ──
        $router->add('GET', '/api/public/categories', static fn (Request $request): array => $publicController->categories($request));
        $router->add('GET', '/api/public/categories/{slug}', static fn (Request $r, array $p): array => $publicController->categoryBySlug($r, $p['slug']));

        $rateLimiter = new RateLimiter(
            sys_get_temp_dir() . '/electromontage-rate-' . substr(hash('sha256', $basePath), 0, 12),
            100,
            60,
        );

        return new self($config, $router, $response, $rateLimiter);
    }

    public function handle(Request $request): void
    {
        try {
            $this->applyCors($request);

            if ($request->method === 'OPTIONS') {
                $this->response->noContent();

                return;
            }

            // Аналог глобального ThrottlerGuard (@nestjs/throttler): 100/мин на IP.
            if (!$this->rateLimiter->allow($request->ip)) {
                throw new HttpException(429, 'ThrottlerException: Too Many Requests');
            }

            $match = $this->router->match($request->method, $request->path);
            if ($match === null) {
                throw new HttpException(404, sprintf('Cannot %s %s', $request->method, $request->path));
            }

            $handler = $match['handler'];
            $result = $handler($request, $match['params']);

            $this->response->status($match['status'])->json($result);
        } catch (HttpException $exception) {
            $this->response->status($exception->status())->json($exception->toBody());
        } catch (\Throwable $exception) {
            error_log(sprintf(
                '%s %s — %s in %s:%d',
                $request->method,
                $request->path,
                $exception->getMessage(),
                $exception->getFile(),
                $exception->getLine(),
            ));

            $this->response->status(500)->json([
                'statusCode' => 500,
                'message' => $this->config->isProduction()
                    ? 'Внутренняя ошибка сервера'
                    : $exception->getMessage(),
                'error' => 'Internal Server Error',
            ]);
        }
    }

    private function applyCors(Request $request): void
    {
        $origin = $request->header('origin');
        if ($origin === null) {
            return;
        }

        $allowed = rtrim($this->config->frontendUrl(), '/');
        if (rtrim($origin, '/') !== $allowed) {
            return;
        }

        $this->response
            ->header('Access-Control-Allow-Origin', $origin)
            ->header('Access-Control-Allow-Credentials', 'true')
            ->header('Vary', 'Origin')
            ->header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
            ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
    }

    public function pdo(): PDO
    {
        // Оставлено для bin-скриптов, которым нужен доступ к базе.
        return Database::connect($this->config->databaseUrl());
    }
}
