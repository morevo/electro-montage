/**
 * Перенос локального портфолио в прод.
 *
 * Изображения приезжают вместе с деплоем в uploads/portfolio (со вложенными
 * папками), манифест — в prisma/portfolio-manifest.json. Скрипт раскладывает
 * файлы плоско (как их ждёт API: /uploads/portfolio/<filename>), создаёт
 * категории и записи фото.
 *
 * Идемпотентен: повторный запуск ничего не дублирует.
 *
 * Использование (из каталога backend):
 *   node scripts/seed-portfolio.js
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

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

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

function slugify(value) {
  return value
    .toLowerCase()
    .split('')
    .map((ch) => (ch in TRANSLIT ? TRANSLIT[ch] : ch))
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'category';
}

async function main() {
  loadDotEnv();

  const root = path.resolve(__dirname, '..');
  const manifestPath =
    process.env.PORTFOLIO_MANIFEST || path.join(root, 'prisma/portfolio-manifest.json');
  const uploadsDir = path.join(root, 'uploads/portfolio');

  if (!fs.existsSync(manifestPath)) {
    console.log('ℹ️  манифеста портфолио нет — шаг пропущен');
    return;
  }
  if (!fs.existsSync(uploadsDir)) {
    console.log('ℹ️  uploads/portfolio пуст — шаг пропущен');
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const items = Array.isArray(manifest.portfolio) ? manifest.portfolio : [];
  if (items.length === 0) {
    console.log('ℹ️  манифест пуст — шаг пропущен');
    return;
  }

  const prisma = new PrismaClient();
  let createdCategories = 0;
  let createdPhotos = 0;
  let copied = 0;
  let skipped = 0;

  try {
    const order = [];
    for (const item of items) {
      if (!order.includes(item.category)) order.push(item.category);
    }

    const categoryIds = new Map();
    for (let i = 0; i < order.length; i += 1) {
      const name = order[i];
      const slug = slugify(name);
      let category = await prisma.category.findFirst({
        where: { OR: [{ name }, { slug }] },
      });
      if (!category) {
        category = await prisma.category.create({
          data: { name, slug, sortOrder: i },
        });
        createdCategories += 1;
      }
      categoryIds.set(name, category.id);
    }

    const sortCounters = new Map();

    for (const item of items) {
      const flatName = path.basename(item.file);
      const nestedSource = path.join(uploadsDir, item.file.replace(/^portfolio\//, ''));
      const flatTarget = path.join(uploadsDir, flatName);

      if (nestedSource !== flatTarget && fs.existsSync(nestedSource) && !fs.existsSync(flatTarget)) {
        fs.copyFileSync(nestedSource, flatTarget);
        copied += 1;
      }

      if (!fs.existsSync(flatTarget)) {
        skipped += 1;
        continue;
      }

      const existing = await prisma.photo.findFirst({ where: { filename: flatName } });
      if (existing) {
        skipped += 1;
        continue;
      }

      const stat = fs.statSync(flatTarget);
      const sortOrder = sortCounters.get(item.category) ?? 0;

      await prisma.photo.create({
        data: {
          title: item.title || flatName,
          filename: flatName,
          originalName: flatName,
          mimeType: 'image/jpeg',
          size: stat.size,
          width: item.width ?? null,
          height: item.height ?? null,
          sortOrder,
          categoryId: categoryIds.get(item.category),
        },
      });

      sortCounters.set(item.category, sortOrder + 1);
      createdPhotos += 1;
    }

    console.log(
      `✅ портфолио: категорий +${createdCategories}, фото +${createdPhotos}, ` +
        `файлов перенесено ${copied}, пропущено ${skipped}`,
    );
  } finally {
    await prisma.$disconnect();
  }

  // Вложенные папки-источники больше не нужны: API отдаёт плоские файлы.
  for (const entry of fs.readdirSync(uploadsDir)) {
    const full = path.join(uploadsDir, entry);
    if (fs.statSync(full).isDirectory()) {
      fs.rmSync(full, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  console.error('❌ портфолио не перенесено:', error && error.message ? error.message : error);
  process.exit(1);
});
