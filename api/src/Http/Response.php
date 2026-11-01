<?php

declare(strict_types=1);

namespace App\Http;

/**
 * Единая точка вывода ответа: JSON без обёрток (ровно как отдавал NestJS)
 * и cookies с httpOnly.
 */
final class Response
{
    /** @var list<array{name: string, value: string, options: array<string, mixed>}> */
    private array $cookies = [];

    /** @var array<string, string> */
    private array $headers = [];

    private int $status = 200;

    public function status(int $status): self
    {
        $this->status = $status;

        return $this;
    }

    public function header(string $name, string $value): self
    {
        $this->headers[$name] = $value;

        return $this;
    }

    /** @param array<string, mixed> $options */
    public function setCookie(string $name, string $value, array $options = []): self
    {
        $this->cookies[] = ['name' => $name, 'value' => $value, 'options' => $options];

        return $this;
    }

    /** @param array<string, mixed> $options */
    public function clearCookie(string $name, array $options = []): self
    {
        $options['expires'] = time() - 3600;
        $this->cookies[] = ['name' => $name, 'value' => '', 'options' => $options];

        return $this;
    }

    public function noContent(): void
    {
        $this->sendHeaders(204);
        echo '';
    }

    public function json(mixed $data): void
    {
        $payload = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($payload === false) {
            $payload = '{"statusCode":500,"message":"Ошибка сериализации ответа","error":"Internal Server Error"}';
            $this->status = 500;
        }

        $this->sendHeaders($this->status);
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
        }

        echo $payload;
    }

    private function sendHeaders(int $status): void
    {
        if (headers_sent()) {
            return;
        }

        http_response_code($status);
        foreach ($this->headers as $name => $value) {
            header($name . ': ' . $value, false);
        }
        foreach ($this->cookies as $cookie) {
            setcookie($cookie['name'], $cookie['value'], $cookie['options']);
        }
    }
}
