#!/usr/bin/env node
/**
 * Одна команда для локальной разработки: поднимает MySQL (если сервис стоит
 * и просто не запущен), backend (NestJS, watch-режим) и frontend (Vite)
 * вместе, с префиксом [backend]/[frontend] перед каждой строкой вывода.
 * Остановить всё разом — `npm run dev:stop`.
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

const backend = runTagged('backend', YELLOW, 'backend', 'npm', ['run', 'start:dev']);
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
