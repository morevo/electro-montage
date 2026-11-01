<?php

declare(strict_types=1);

namespace App\Http;

/**
 * Простой роутер: статические и {param}-сегменты. Маршруты проверяются в
 * порядке регистрации (как в NestJS), поэтому /photos/bulk объявляется
 * раньше /photos/:id.
 */
final class Router
{
    /** @var list<array{method: string, pattern: string, regex: string, params: list<string>, handler: callable, status: int}> */
    private array $routes = [];

    public function add(string $method, string $pattern, callable $handler, int $status = 200): void
    {
        $params = [];
        $regex = preg_replace_callback(
            '/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/',
            static function (array $matches) use (&$params): string {
                $params[] = $matches[1];

                return '([^/]+)';
            },
            $pattern,
        );

        $this->routes[] = [
            'method' => strtoupper($method),
            'pattern' => $pattern,
            'regex' => '#^' . $regex . '$#',
            'params' => $params,
            'handler' => $handler,
            'status' => $status,
        ];
    }

    /**
     * @return array{handler: callable, params: array<string, string>, status: int}|null
     */
    public function match(string $method, string $path): ?array
    {
        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }

            if (preg_match($route['regex'], $path, $matches) !== 1) {
                continue;
            }

            array_shift($matches);
            $params = [];
            foreach ($route['params'] as $index => $name) {
                $params[$name] = rawurldecode($matches[$index] ?? '');
            }

            return ['handler' => $route['handler'], 'params' => $params, 'status' => $route['status']];
        }

        return null;
    }
}
