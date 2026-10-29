import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ReorderCategoriesDto } from './dto/reorder-categories.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const existingByName = await this.prisma.category.findUnique({
      where: { name: createCategoryDto.name },
    });
    if (existingByName) {
      throw new ConflictException('Категория с таким названием уже существует');
    }

    const existingBySlug = await this.prisma.category.findUnique({
      where: { slug: createCategoryDto.slug },
    });
    if (existingBySlug) {
      throw new ConflictException('Категория с таким слагом уже существует');
    }

    const maxOrder = await this.prisma.category.aggregate({
      _max: { sortOrder: true },
    });

    return this.prisma.category.create({
      data: {
        ...createCategoryDto,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
  }

  async findAll() {
    return this.prisma.category.findMany({
      include: {
        _count: { select: { photos: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        photos: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!category) {
      throw new NotFoundException('Категория не найдена');
    }

    return category;
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        photos: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!category) {
      throw new NotFoundException('Категория не найдена');
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    await this.findOne(id);

    if (updateCategoryDto.name) {
      const existingByName = await this.prisma.category.findFirst({
        where: { name: updateCategoryDto.name, NOT: { id } },
      });
      if (existingByName) {
        throw new ConflictException('Категория с таким названием уже существует');
      }
    }

    if (updateCategoryDto.slug) {
      const existingBySlug = await this.prisma.category.findFirst({
        where: { slug: updateCategoryDto.slug, NOT: { id } },
      });
      if (existingBySlug) {
        throw new ConflictException('Категория с таким слагом уже существует');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    await this.prisma.category.delete({ where: { id } });
    return { message: 'Категория удалена' };
  }

  async reorder(reorderDto: ReorderCategoriesDto) {
    const updates = reorderDto.items.map(({ id, sortOrder }) =>
      this.prisma.category.update({
        where: { id },
        data: { sortOrder },
      }),
    );
    await this.prisma.$transaction(updates);
    return this.findAll();
  }
}