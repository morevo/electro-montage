#!/usr/bin/env node
/**
 * Одна команда для локальной разработки: поднимает MySQL (если сервис стоит
 * и просто не запущен), PHP-бэкенд (php -S на 3001, как раньше Node) и
 * frontend (Vite) вместе, с префиксом [backend]/[frontend] перед каждой
 * строкой вывода. Остановить всё разом — `npm run dev:stop`.
 *
 * PHP-бэкенд не требует постоянного процесса на проде (там его запускает
 * Apache/FastCGI по запросу), но локально удобно так же, как было с NestJS.
 *
 * Специально без npm-зависимостей (без concurrently/kill-port и т.п.):
 * корневой package.json исторически пустой (у backend и frontend свои
 * собственные node_modules), и `npm install` в корне однажды случайно
 * пересобрал зависимости как монорепо и снёс оба node_modules. Чтобы это
 * не повторилось, здесь — только встроенный child_process.
 */
const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const API_DIR = path.join(ROOT, 'api');
const isWindows = process.platform === 'win32';

function tryStartMysql() {
  if (!isWindows) return;
  const check = spawnSync('powershell', [
    '-NoProfile',
    '-Command',
    '(Get-Service -Name MySQL80 -ErrorAction SilentlyContinue).Status',
  ]);
  const status = check.stdout?.toString().trim();

  if (status === 'Running') {
    console.log('✅ MySQL80 уже запущен');
    return;
  }

  console.log('▶ Пытаюсь запустить службу MySQL80…');
  const start = spawnSync('net', ['start', 'MySQL80'], { stdio: 'inherit' });
  if (start.status !== 0) {
    console.log(
      '⚠️  Не удалось запустить MySQL80 автоматически (обычно для этого нужны права ' +
        'администратора).\n' +
        '   Запусти вручную в PowerShell от имени администратора: net start MySQL80\n' +
        '   Либо открой "Службы" (services.msc) и запусти MySQL80 оттуда.'
    );
  }
}

/**
 * На Windows расширения pdo_mysql/gd в php.ini по умолчанию выключены.
 * Включаем их флагами командной строки — конфиг PHP на машине не трогаем.
 */
function phpFlags() {
  const flags = [];
  const loaded = spawnSync('php', ['-m'], { encoding: 'utf8' });
  if (loaded.status !== 0) {
    console.log(
      '❌ PHP не найден в PATH. Установите PHP 8.1+ (нужны pdo_mysql и gd/imagick)\n' +
        '   и проверьте: php -v'
    );
    process.exit(1);
  }

  const modules = new Set(
    loaded.stdout
      .split('\n')
      .map((line) => line.trim().toLowerCase())
      .filter(Boolean)
  );

  const missing = ['pdo_mysql', 'gd'].filter((extension) => !modules.has(extension));
  if (missing.length > 0 && isWindows) {
    const binary = spawnSync('php', ['-r', 'echo PHP_BINARY;'], { encoding: 'utf8' }).stdout.trim();
    const extDir = path.join(path.dirname(binary), 'ext');
    flags.push('-d', `extension_dir=${extDir}`);
    for (const extension of missing) {
      flags.push('-d', `extension=${extension}`);
    }
  }

  return flags;
}

/** Печатает строки дочернего процесса с цветным префиксом [name]. */
function runTagged(name, color, cwd, command, args) {
  const child = spawn(command, args, {
    cwd: path.join(ROOT, cwd),
    shell: isWindows,
    env: process.env,
  });

  const prefix = `${color}[${name}]\x1b[0m `;
  const pipe = (stream, out) => {
    stream.setEncoding('utf8');
    let buffer = '';
    stream.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) out.write(prefix + line + '\n');
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);

  return child;
}

tryStartMysql();

const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

const flags = phpFlags();

// Схема БД + первый администратор + демо-портфолио (идемпотентно).
console.log('▶ Готовлю базу (php bin/setup.php)…');
const setup = spawnSync('php', [...flags, path.join(API_DIR, 'bin', 'setup.php')], {
  cwd: ROOT,
  stdio: 'inherit',
});
if (setup.status !== 0) {
  console.log('⚠️  База не подготовлена — API может отвечать ошибкой 500 (см. LOCAL_DEV.md)');
}

const backend = runTagged('backend', YELLOW, '.', 'php', [
  ...flags,
  '-S',
  '127.0.0.1:3001',
  '-t',
  'api',
  'api/index.php',
]);
const frontend = runTagged('frontend', CYAN, 'frontend', 'npm', ['run', 'dev']);

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('\n⏹  Останавливаю backend и frontend…');
  backend.kill();
  frontend.kill();
  // Даём процессам немного времени на мягкое завершение, затем выходим.
  setTimeout(() => process.exit(0), 1000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

backend.on('exit', (code) => {
  if (!shuttingDown && code !== 0) {
    console.log(`❌ backend завершился с кодом ${code}`);
    shutdown();
  }
});
frontend.on('exit', (code) => {
  if (!shuttingDown && code !== 0) {
    console.log(`❌ frontend завершился с кодом ${code}`);
    shutdown();
  }
});
