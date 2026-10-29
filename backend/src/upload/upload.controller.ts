import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiCookieAuth, ApiConsumes } from '@nestjs/swagger';

import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiCookieAuth('access_token')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('photo')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Загрузить и оптимизировать фото для портфолио' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Файл не загружен');
    }

    const { width, height } = await this.uploadService.validateAndProcessImage(file.path);

    const webpFilename = file.filename.replace(/\.(jpg|jpeg|png|webp)$/i, '.webp');
    const url = this.uploadService.getFileUrl(webpFilename);

    return {
      filename: webpFilename,
      originalName: file.originalname,
      mimeType: 'image/webp',
      size: (await import('fs/promises')).stat(file.path.replace(/\.(jpg|jpeg|png|webp)$/i, '.webp')).then(s => s.size),
      width,
      height,
      url,
    };
  }
}