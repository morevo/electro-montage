#!/usr/bin/env node
/**
 * Гасит всё, что подняла `npm run dev`: процессы на портах backend (3001) и
 * frontend (5173 и соседние, если 5173 был занят). MySQL НЕ останавливается
 * намеренно — это системная служба, ею может пользоваться что-то ещё, а
 * повторный запуск требует прав администратора (см. dev.js).
 *
 * Без npm-зависимостей — только встроенные средства ОС (netstat/taskkill на
 * Windows, lsof/kill на macOS/Linux). Используется для `npm run dev:stop`.
 */
const { execSync } = require('node:child_process');

const PORTS = [3001, 5173, 5174, 5175];
const isWindows = process.platform === 'win32';

function killPortWindows(port) {
  let out;
  try {
    out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
  } catch {
    return false; // порт свободен
  }
  const pids = new Set();
  for (const line of out.split('\n')) {
    const match = line.trim().match(/LISTENING\s+(\d+)\s*$/);
    if (match) pids.add(match[1]);
  }
  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
    } catch {
      // процесс уже завершился между netstat и taskkill — не страшно
    }
  }
  return pids.size > 0;
}

function killPortPosix(port) {
  let pids;
  try {
    pids = execSync(`lsof -ti:${port}`, { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  } catch {
    return false; // порт свободен
  }
  for (const pid of pids) {
    try {
      execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
    } catch {
      // уже завершился
    }
  }
  return pids.length > 0;
}

console.log('▶ Останавливаю backend и frontend…');
for (const port of PORTS) {
  const killed = isWindows ? killPortWindows(port) : killPortPosix(port);
  if (killed) console.log(`⏹  Порт ${port} освобождён`);
}
console.log('✅ Готово. MySQL не трогаю — он системная служба, оставляю работать.');
