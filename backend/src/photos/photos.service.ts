import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePhotoDto } from './dto/create-photo.dto';
import { UpdatePhotoDto } from './dto/update-photo.dto';
import { ReorderPhotosDto } from './dto/reorder-photos.dto';
import * as fs from 'fs/promises';
import * as path from 'path';

interface PhotoFileData {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
}

@Injectable()
export class PhotosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(categoryId: string, createPhotoDto: CreatePhotoDto, fileData: PhotoFileData) {
    await this.prisma.category.findUniqueOrThrow({ where: { id: categoryId } });

    const maxOrder = await this.prisma.photo.aggregate({
      where: { categoryId },
      _max: { sortOrder: true },
    });

    return this.prisma.photo.create({
      data: {
        ...createPhotoDto,
        categoryId,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        ...fileData,
      },
    });
  }

  async findAll(categoryId?: string, page = 1, limit = 20) {
    const where = categoryId ? { categoryId } : {};
    const [photos, total] = await Promise.all([
      this.prisma.photo.findMany({
        where,
        include: { category: { select: { id: true, name: true, slug: true } } },
        orderBy: { sortOrder: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.photo.count({ where }),
    ]);

    return {
      data: photos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const photo = await this.prisma.photo.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });

    if (!photo) {
      throw new NotFoundException('Фото не найдено');
    }

    return photo;
  }

  async update(id: string, updatePhotoDto: UpdatePhotoDto) {
    await this.findOne(id);

    if (updatePhotoDto.categoryId) {
      await this.prisma.category.findUniqueOrThrow({
        where: { id: updatePhotoDto.categoryId },
      });
    }

    return this.prisma.photo.update({
      where: { id },
      data: updatePhotoDto,
    });
  }

  async delete(id: string) {
    const photo = await this.findOne(id);

    const filePath = path.join(process.cwd(), 'uploads', photo.filename);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn(`Failed to delete file ${filePath}:`, error);
    }

    await this.prisma.photo.delete({ where: { id } });
    return { message: 'Фото удалено' };
  }

  async reorder(categoryId: string, reorderDto: ReorderPhotosDto) {
    await this.prisma.category.findUniqueOrThrow({ where: { id: categoryId } });

    const updates = reorderDto.items.map(({ id, sortOrder }) =>
      this.prisma.photo.update({
        where: { id },
        data: { sortOrder },
      }),
    );
    await this.prisma.$transaction(updates);
    return this.findAll(categoryId);
  }
}