/**
 * Единая точка создания PrismaClient для служебных скриптов.
 *
 * Клиент создаётся с драйвер-адаптером mariadb: встроенный Rust-движок на
 * хостинге падал с «PANIC: timer has gone away».
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

function loadDotEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function createClient() {
  loadDotEnv();

  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error('DATABASE_URL не задан (backend/.env или окружение)');
  }

  const url = new URL(raw);
  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    connectionLimit: 3,
    ssl: false,
  });

  return new PrismaClient({ adapter });
}

module.exports = { createClient, loadDotEnv };
