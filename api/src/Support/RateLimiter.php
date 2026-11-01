<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Файловый аналог @nestjs/throttler (100 запросов в минуту на IP).
 * У PHP нет общего процесса, поэтому счётчики живут в файлах и защищены flock.
 * Любая ошибка файловой системы означает «пропустить» — лимитер не должен
 * ломать сайт.
 */
final class RateLimiter
{
    public function __construct(
        private readonly string $directory,
        private readonly int $limit = 100,
        private readonly int $windowSeconds = 60,
    ) {
    }

    public function allow(string $key): bool
    {
        $now = time();

        try {
            if (!is_dir($this->directory) && !@mkdir($this->directory, 0700, true) && !is_dir($this->directory)) {
                return true;
            }

            $file = $this->directory . '/' . hash('sha256', $key);
            $handle = @fopen($file, 'c+');
            if ($handle === false) {
                return true;
            }

            if (!flock($handle, LOCK_EX)) {
                fclose($handle);

                return true;
            }

            $contents = stream_get_contents($handle);
            $state = is_string($contents) && $contents !== '' ? json_decode($contents, true) : null;
            if (!is_array($state) || !isset($state['start'], $state['count']) || ($now - (int) $state['start']) >= $this->windowSeconds) {
                $state = ['start' => $now, 'count' => 0];
            }

            $state['count'] = (int) $state['count'] + 1;
            $allowed = $state['count'] <= $this->limit;

            ftruncate($handle, 0);
            rewind($handle);
            fwrite($handle, (string) json_encode($state));
            fflush($handle);
            flock($handle, LOCK_UN);
            fclose($handle);

            return $allowed;
        } catch (\Throwable) {
            return true;
        }
    }
}
