import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs/promises';
import * as path from 'path';

const prisma = new PrismaClient();

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

async function main() {
  console.log('🌱 Starting seed...');

  // Create default admin user
  const adminEmail = 'admin@electromontage.ru';
  const adminPassword = 'ElectroAdmin2024!';

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: {
      email: adminEmail,
      passwordHash,
      name: 'Администратор',
      role: 'SUPER_ADMIN',
    },
  });
  console.log(`✅ Admin user: ${admin.email}`);

  // Read portfolio manifest
  const manifestPath = path.join(__dirname, '..', '..', '..', 'frontend', 'src', 'assets', 'portfolio-manifest.json');
  const manifestContent = await fs.readFile(manifestPath, 'utf-8');
  const manifest: Manifest = JSON.parse(manifestContent);

  // Group by category
  const categoriesMap = new Map<string, ManifestItem[]>();
  for (const item of manifest.portfolio) {
    if (!categoriesMap.has(item.category)) {
      categoriesMap.set(item.category, []);
    }
    categoriesMap.get(item.category)!.push(item);
  }

  // Create categories and photos
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
        sortOrder: Array.from(categoriesMap.keys()).indexOf(categoryName),
      },
    });
    console.log(`✅ Category: ${category.name} (${items.length} photos)`);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const filename = path.basename(item.file);

      await prisma.photo.upsert({
        where: { id: `seed-${category.id}-${i}` }, // Using composite-like key via unique constraint workaround
        update: {
          title: item.title,
          description: '',
          filename,
          originalName: filename,
          mimeType: 'image/webp',
          size: 0,
          width: item.width,
          height: item.height,
          sortOrder: i,
          categoryId: category.id,
        },
        create: {
          id: `seed-${category.id}-${i}`,
          title: item.title,
          description: '',
          filename,
          originalName: filename,
          mimeType: 'image/webp',
          size: 0,
          width: item.width,
          height: item.height,
          sortOrder: i,
          categoryId: category.id,
        },
      });
    }
  }

  // Fix: The upsert with custom ID won't work well. Let's do a proper approach.
  console.log('🔄 Re-seeding photos with proper IDs...');

  // Delete seeded photos and re-create
  for (const [categoryName, items] of categoriesMap.entries()) {
    const category = await prisma.category.findUnique({ where: { name: categoryName } });
    if (!category) continue;

    await prisma.photo.deleteMany({ where: { categoryId: category.id } });

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const filename = path.basename(item.file).replace(/\.(jpg|jpeg|png)$/i, '.webp');

      await prisma.photo.create({
        data: {
          title: item.title,
          description: '',
          filename,
          originalName: filename,
          mimeType: 'image/webp',
          size: 0,
          width: item.width,
          height: item.height,
          sortOrder: i,
          categoryId: category.id,
        },
      });
    }
  }

  console.log('🎉 Seed completed successfully!');
  console.log(`\n📋 Admin credentials:`);
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });