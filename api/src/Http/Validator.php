<?php

declare(strict_types=1);

namespace App\Http;

use App\Support\Str;

/**
 * Ручная валидация, повторяющая правила class-validator из NestJS DTO:
 * те же поля, те же ограничения, 400 с массивом сообщений и запрет
 * неизвестных полей (whitelist + forbidNonWhitelisted).
 */
final class Validator
{
    /** @var list<string> */
    private array $errors = [];

    /**
     * @param array<mixed> $data
     * @param list<string> $allowed
     */
    public function __construct(
        private readonly array $data,
        array $allowed,
    ) {
        foreach (array_keys($data) as $key) {
            if (!in_array((string) $key, $allowed, true)) {
                $this->errors[] = sprintf('property %s should not exist', (string) $key);
            }
        }
    }

    /** @param array<mixed> $data */
    public static function for(array $data, array $allowed): self
    {
        return new self($data, $allowed);
    }

    public function string(
        string $field,
        bool $required = true,
        ?int $min = null,
        ?int $max = null,
        ?string $pattern = null,
        ?string $patternMessage = null,
    ): ?string {
        $value = $this->value($field);

        if ($value === null) {
            if ($required) {
                $this->errors[] = "{$field} must be a string";
            }

            return null;
        }

        if (!is_string($value)) {
            $this->errors[] = "{$field} must be a string";

            return null;
        }

        $length = mb_strlen($value, 'UTF-8');
        if ($min !== null && $length < $min) {
            $this->errors[] = "{$field} must be longer than or equal to {$min} characters";
        }
        if ($max !== null && $length > $max) {
            $this->errors[] = "{$field} must be shorter than or equal to {$max} characters";
        }
        if ($pattern !== null && preg_match($pattern, $value) !== 1) {
            $this->errors[] = $patternMessage ?? "{$field} is invalid";
        }

        return $value;
    }

    /** @param list<string> $values */
    public function enum(string $field, array $values, bool $required = true): ?string
    {
        $value = $this->value($field);

        if ($value === null) {
            if ($required) {
                $this->errors[] = "{$field} must be one of the following values: " . implode(', ', $values);
            }

            return null;
        }

        if (!is_string($value) || !in_array($value, $values, true)) {
            $this->errors[] = "{$field} must be one of the following values: " . implode(', ', $values);

            return null;
        }

        return $value;
    }

    public function uuid(string $field, bool $required = true): ?string
    {
        $value = $this->value($field);

        if ($value === null) {
            if ($required) {
                $this->errors[] = "{$field} must be a UUID";
            }

            return null;
        }

        if (!is_string($value) || !Str::isUuid($value)) {
            $this->errors[] = "{$field} must be a UUID";

            return null;
        }

        return $value;
    }

    public function int(string $field, bool $required = true, int $min = 0): ?int
    {
        $value = $this->value($field);

        if ($value === null) {
            if ($required) {
                $this->errors[] = "{$field} must be an integer number";
            }

            return null;
        }

        if (!is_int($value) && !(is_string($value) && preg_match('/^-?\d+$/', $value) === 1)) {
            $this->errors[] = "{$field} must be an integer number";

            return null;
        }

        $int = (int) $value;

        if ($int < $min) {
            $this->errors[] = "{$field} must not be less than {$min}";
        }

        return $int;
    }

    /** @return array<mixed>|null */
    public function array(string $field, bool $required = true): ?array
    {
        $value = $this->value($field);

        if ($value === null) {
            if ($required) {
                $this->errors[] = "{$field} must be an array";
            }

            return null;
        }

        if (!is_array($value)) {
            $this->errors[] = "{$field} must be an array";

            return null;
        }

        return $value;
    }

    public function addError(string $message): void
    {
        $this->errors[] = $message;
    }

    /** @return list<string> */
    public function errors(): array
    {
        return $this->errors;
    }

    public function done(): void
    {
        if ($this->errors !== []) {
            throw new ValidationException($this->errors);
        }
    }

    private function value(string $field): mixed
    {
        if (!array_key_exists($field, $this->data)) {
            return null;
        }

        return $this->data[$field];
    }
}
