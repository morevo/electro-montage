import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as multer from 'multer';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { Request } from 'express';

@Injectable()
export class UploadService {
  private readonly uploadDir: string;
  private readonly maxFileSize: number;
  private readonly allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = configService.get('UPLOAD_DIR') || './uploads';
    this.maxFileSize = configService.get('MAX_FILE_SIZE') || 10485760;
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, 'portfolio'), { recursive: true });
    } catch (error) {
      console.error('Failed to create upload directory:', error);
    }
  }

  getMulterConfig(maxFiles = 1) {
    return {
      storage: multer.diskStorage({
        destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
          cb(null, path.join(this.uploadDir, 'portfolio'));
        },
        filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
          const ext = path.extname(file.originalname).toLowerCase();
          const filename = `${randomUUID()}${ext}`;
          cb(null, filename);
        },
      }),
      fileFilter: (req: Request, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!this.allowedExtensions.includes(ext)) {
          return cb(new BadRequestException('Недопустимый формат файла. Разрешены: JPG, PNG, WebP'), false);
        }
        if (!this.allowedMimeTypes.includes(file.mimetype)) {
          return cb(new BadRequestException('Недопустимый MIME тип файла'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: this.maxFileSize,
        files: maxFiles,
      },
    };
  }

  async validateAndProcessImage(filePath: string): Promise<{ width: number; height: number }> {
    try {
      const metadata = await sharp(filePath).metadata();

      if (!metadata.width || !metadata.height) {
        throw new BadRequestException('Не удалось определить размеры изображения');
      }

      if (metadata.width > 5000 || metadata.height > 5000) {
        throw new BadRequestException('Изображение слишком большое (макс. 5000px)');
      }

      const optimizedPath = filePath.replace(/\.(jpg|jpeg|png|webp)$/i, '_optimized.webp');
      await sharp(filePath)
        .webp({ quality: 85, effort: 4 })
        .toFile(optimizedPath);

      await fs.unlink(filePath);
      await fs.rename(optimizedPath, filePath.replace(path.extname(filePath), '.webp'));

      return { width: metadata.width, height: metadata.height };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Ошибка обработки изображения');
    }
  }

  getFileUrl(filename: string): string {
    return `/uploads/portfolio/${filename}`;
  }

  async deleteFile(filename: string): Promise<void> {
    const filePath = path.join(this.uploadDir, 'portfolio', filename);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn(`Failed to delete file ${filePath}:`, error);
    }
  }
}