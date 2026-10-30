/**
 * Создание/обновление администратора на проде.
 *
 * Отдельный скрипт нужен потому, что `prisma seed` в проде не работает:
 * в образ backend не копируется frontend/src/assets, откуда сид берёт фото.
 *
 * Использование (из корня репозитория):
 *   cd backend
 *   node scripts/create-admin.js
 *
 * Учётные данные берутся из backend/.env:
 *   SEED_ADMIN_LOGIN    — логин, не e-mail
 *   SEED_ADMIN_PASSWORD — пароль от 16+ символов
 *
 * Пароль в консоль не выводится.
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const LOGIN_ENV = 'SEED_ADMIN_LOGIN';
const PASSWORD_ENV = 'SEED_ADMIN_PASSWORD';

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

function readCredentials() {
  const login = (process.env[LOGIN_ENV] || '').trim();
  const password = process.env[PASSWORD_ENV] || '';
  const hint =
    '\nЗадайте в backend/.env:\n' +
    '  ' + LOGIN_ENV + '=admin_xxxxxxxx\n' +
    '  ' + PASSWORD_ENV + '=<пароль от 16+ символов>\n' +
    'Сгенерировать пароль:\n' +
    "  node -e \"console.log(require('crypto').randomBytes(24).toString('base64url'))\"\n";

  if (!login || !password) {
    throw new Error('Не заданы ' + LOGIN_ENV + ' и/или ' + PASSWORD_ENV + '.' + hint);
  }
  if (login.includes('@')) {
    throw new Error(LOGIN_ENV + ' не должен быть e-mail — используйте логин без «@».' + hint);
  }
  if (password.length < 16) {
    throw new Error(
      PASSWORD_ENV + ' слишком короткий (' + password.length + ' символов, нужно от 16).' + hint,
    );
  }
  return { login, password };
}

async function main() {
  loadDotEnv();
  const { login, password } = readCredentials();

  const prisma = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.upsert({
      where: { login },
      update: { passwordHash },
      create: { login, passwordHash, name: 'Администратор', role: 'SUPER_ADMIN' },
    });
    console.log('✅ Администратор готов: ' + user.login);
    console.log('   Пароль взят из ' + PASSWORD_ENV + ' и не выводится в консоль.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('❌ Не удалось создать администратора:', e && e.message ? e.message : e);
  process.exit(1);
});
