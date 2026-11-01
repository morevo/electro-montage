<?php

declare(strict_types=1);

namespace App\Http;

/**
 * Повторяет поведение ValidationPipe в NestJS: 400 и массив сообщений.
 */
final class ValidationException extends HttpException
{
    /** @param list<string> $messages */
    public function __construct(array $messages)
    {
        parent::__construct(400, $messages);
    }
}
