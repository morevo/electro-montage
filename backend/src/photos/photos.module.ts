import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';
import { UploadService } from '../upload/upload.service';
import { PhotosService } from './photos.service';
import { PhotosController } from './photos.controller';

@Module({
  imports: [
    PrismaModule,
    UploadModule,
    // Используем единый multer-конфиг из UploadService (disk storage + лимиты + фильтр).
    // files: 20 — чтобы работала пакетная загрузка через POST /photos/bulk.
    MulterModule.registerAsync({
      imports: [UploadModule],
      inject: [UploadService],
      useFactory: (uploadService: UploadService) => uploadService.getMulterConfig(20),
    }),
  ],
  controllers: [PhotosController],
  providers: [PhotosService],
  exports: [PhotosService],
})
export class PhotosModule {}
