<?php

declare(strict_types=1);

namespace App\Http;

/**
 * Обёртка над суперглобалами — контроллеры не знают про $_SERVER/$_FILES.
 */
final class Request
{
    /**
     * @param array<string, mixed> $query
     * @param array<string, mixed> $post
     * @param array<string, mixed> $files
     * @param array<string, string> $cookies
     * @param array<string, string> $headers
     */
    public function __construct(
        public readonly string $method,
        public readonly string $path,
        public readonly array $query,
        public readonly string $rawBody,
        public readonly array $post,
        public readonly array $files,
        public readonly array $cookies,
        public readonly array $headers,
        public readonly string $ip,
    ) {
    }

    public static function fromGlobals(): self
    {
        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $name = strtolower(str_replace('_', '-', substr($key, 5)));
                $headers[$name] = (string) $value;
            } elseif ($key === 'CONTENT_TYPE') {
                $headers['content-type'] = (string) $value;
            } elseif ($key === 'CONTENT_LENGTH') {
                $headers['content-length'] = (string) $value;
            }
        }

        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $path = parse_url($uri, PHP_URL_PATH);
        $path = is_string($path) && $path !== '' ? $path : '/';
        if ($path !== '/' && str_ends_with($path, '/')) {
            $path = rtrim($path, '/');
        }

        return new self(
            strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET'),
            $path,
            $_GET,
            (string) file_get_contents('php://input'),
            $_POST,
            $_FILES,
            $_COOKIE,
            $headers,
            (string) ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'),
        );
    }

    public function header(string $name): ?string
    {
        return $this->headers[strtolower($name)] ?? null;
    }

    public function cookie(string $name): ?string
    {
        $value = $this->cookies[$name] ?? null;

        return is_string($value) && $value !== '' ? $value : null;
    }

    public function bearerToken(): ?string
    {
        $header = $this->header('authorization');
        if ($header !== null && preg_match('/^Bearer\s+(.+)$/i', $header, $matches) === 1) {
            return trim($matches[1]);
        }

        return null;
    }

    /**
     * JSON-тело запроса. Пустое тело — пустой массив, как у body-parser.
     *
     * @return array<mixed>
     */
    public function json(): array
    {
        if (trim($this->rawBody) === '') {
            return [];
        }

        $decoded = json_decode($this->rawBody, true);
        if (!is_array($decoded)) {
            throw new HttpException(400, 'Некорректный JSON в теле запроса');
        }

        return $decoded;
    }

    /**
     * Нормализованный список загруженных файлов для поля формы.
     * Понимает и одиночное поле, и массив files[].
     *
     * @return list<array{name: string, tmp_name: string, type: string, error: int, size: int}>
     */
    public function uploadedFiles(string $field): array
    {
        $entry = $this->files[$field] ?? null;
        if (!is_array($entry) || !array_key_exists('name', $entry)) {
            return [];
        }

        if (!is_array($entry['name'])) {
            return [[
                'name' => (string) $entry['name'],
                'tmp_name' => (string) ($entry['tmp_name'] ?? ''),
                'type' => (string) ($entry['type'] ?? ''),
                'error' => (int) ($entry['error'] ?? UPLOAD_ERR_NO_FILE),
                'size' => (int) ($entry['size'] ?? 0),
            ]];
        }

        $files = [];
        foreach (array_keys($entry['name']) as $index) {
            $files[] = [
                'name' => (string) $entry['name'][$index],
                'tmp_name' => (string) ($entry['tmp_name'][$index] ?? ''),
                'type' => (string) ($entry['type'][$index] ?? ''),
                'error' => (int) ($entry['error'][$index] ?? UPLOAD_ERR_NO_FILE),
                'size' => (int) ($entry['size'][$index] ?? 0),
            ];
        }

        return $files;
    }
}
