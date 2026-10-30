import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Сид создаёт администратора и переносит портфолио из frontend/src/assets.
 *
 * Учётные данные админа НЕ зашиты в код: они берутся из переменных окружения
 *   SEED_ADMIN_LOGIN    — логин (не e-mail)
 *   SEED_ADMIN_PASSWORD — пароль, минимум 16 символов
 *
 * Значения лежат в backend/.env (файл не попадает в git).
 */

const LOGIN_ENV = 'SEED_ADMIN_LOGIN';
const PASSWORD_ENV = 'SEED_ADMIN_PASSWORD';

/**
 * ts-node не подхватывает .env автоматически, а PrismaClient читает DATABASE_URL
 * до того, как мы успеем что-то сделать. Поэтому читаем файл сами и кладём
 * значения в process.env ДО создания PrismaClient.
 */
async function loadDotEnv(): Promise<void> {
  const envPath = path.resolve(__dirname, '..', '.env');
  let raw: string;
  try {
    raw = await fs.readFile(envPath, 'utf-8');
  } catch {
    return; // файла может не быть — ок, переменные могли прийти извне
  }

  for (const line of raw.split(/\r?\n/)) {
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

interface ManifestItem {
  category: string;
  title: string;
  file: string;
  width: number;
  height: number;
}

interface Manifest {
  portfolio: ManifestItem[];
}

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function readAdminCredentials(): { login: string; password: string } {
  const login = (process.env[LOGIN_ENV] ?? '').trim();
  const password = process.env[PASSWORD_ENV] ?? '';

  const hint =
    `\nЗадайте их в backend/.env:\n` +
    `  ${LOGIN_ENV}=admin_xxxxxxxx\n` +
    `  ${PASSWORD_ENV}=<пароль от 16+ символов>\n` +
    `Сгенерировать пароль:\n` +
    `  node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"\n`;

  if (!login || !password) {
    throw new Error(`Не заданы ${LOGIN_ENV} и/или ${PASSWORD_ENV}.${hint}`);
  }

  if (login.includes('@')) {
    throw new Error(
      `${LOGIN_ENV} не должен быть e-mail — используйте логин без «@».${hint}`,
    );
  }

  if (password.length < 16) {
    throw new Error(
      `${PASSWORD_ENV} слишком короткий (${password.length} символов, нужно минимум 16).${hint}`,
    );
  }

  return { login, password };
}

async function main() {
  await loadDotEnv();

  const { login: adminLogin, password: adminPassword } = readAdminCredentials();

  console.log('🌱 Starting seed...');

  const prisma = new PrismaClient();

  try {
    // ── Администратор ──
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const admin = await prisma.user.upsert({
      where: { login: adminLogin },
      update: { passwordHash },
      create: {
        login: adminLogin,
        passwordHash,
        name: 'Администратор',
        role: 'SUPER_ADMIN',
      },
    });
    // Пароль намеренно не печатаем: он должен быть известен только из .env
    console.log(`✅ Admin user: ${admin.login} (пароль — из ${PASSWORD_ENV})`);

    // ── Портфолио из манифеста ──
    // prisma/ -> backend/ -> <repo root> -> frontend/src/assets
    const manifestPath = path.resolve(
      __dirname,
      '..',
      '..',
      'frontend',
      'src',
      'assets',
      'portfolio-manifest.json',
    );
    const assetsDir = path.dirname(manifestPath);
    const uploadsDir = path.join(process.cwd(), 'uploads', 'portfolio');

    await fs.mkdir(uploadsDir, { recursive: true });

    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const manifest: Manifest = JSON.parse(manifestContent);

    const categoriesMap = new Map<string, ManifestItem[]>();
    for (const item of manifest.portfolio) {
      if (!categoriesMap.has(item.category)) {
        categoriesMap.set(item.category, []);
      }
      categoriesMap.get(item.category)!.push(item);
    }

    const categoryNames = Array.from(categoriesMap.keys());

    for (const [categoryName, items] of categoriesMap.entries()) {
      const slug = categoryName
        .toLowerCase()
        .replace(/[^a-z0-9а-яё]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      const category = await prisma.category.upsert({
        where: { name: categoryName },
        update: { slug },
        create: {
          name: categoryName,
          slug,
          description: `Работы по категории: ${categoryName}`,
          sortOrder: categoryNames.indexOf(categoryName),
        },
      });
      console.log(`✅ Category: ${category.name} (${items.length} photos)`);

      // Re-create photos for this category in manifest order
      await prisma.photo.deleteMany({ where: { categoryId: category.id } });

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const filename = path.basename(item.file);
        const sourceFile = path.join(assetsDir, item.file);
        const targetFile = path.join(uploadsDir, filename);

        // Copy the actual image into the uploads folder so /uploads/... works
        await fs.copyFile(sourceFile, targetFile);

        await prisma.photo.create({
          data: {
            title: item.title,
            description: '',
            filename,
            originalName: filename,
            mimeType: MIME_BY_EXT[path.extname(filename).toLowerCase()] ?? 'application/octet-stream',
            size: (await fs.stat(targetFile)).size,
            width: item.width,
            height: item.height,
            sortOrder: i,
            categoryId: category.id,
          },
        });
      }
    }

    console.log('🎉 Seed completed successfully!');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('❌ Seed failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
