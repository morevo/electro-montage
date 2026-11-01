<?php

declare(strict_types=1);

namespace App\Http;

use RuntimeException;

/**
 * HTTP-исключение с тем же JSON-телом, что отдавал NestJS:
 * {"statusCode": 404, "message": "...", "error": "Not Found"}.
 */
class HttpException extends RuntimeException
{
    private readonly string $error;

    /** @param string|list<string> $message */
    public function __construct(
        private readonly int $status,
        private readonly string|array $messages,
        ?string $error = null,
    ) {
        parent::__construct(is_string($messages) ? $messages : implode('. ', $messages));
        $this->error = $error ?? self::reasonPhrase($status);
    }

    public function status(): int
    {
        return $this->status;
    }

    /** @return string|list<string> */
    public function messages(): string|array
    {
        return $this->messages;
    }

    public function error(): string
    {
        return $this->error;
    }

    public function toBody(): array
    {
        return [
            'statusCode' => $this->status,
            'message' => $this->messages,
            'error' => $this->error,
        ];
    }

    private static function reasonPhrase(int $status): string
    {
        return match ($status) {
            400 => 'Bad Request',
            401 => 'Unauthorized',
            403 => 'Forbidden',
            404 => 'Not Found',
            409 => 'Conflict',
            413 => 'Payload Too Large',
            429 => 'Too Many Requests',
            default => 'Internal Server Error',
        };
    }
}
