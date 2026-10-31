import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiCookieAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';

import { PhotosService } from './photos.service';
import { UploadService } from '../upload/upload.service';
import { CreatePhotoDto } from './dto/create-photo.dto';
import { UpdatePhotoDto } from './dto/update-photo.dto';
import { ReorderPhotosDto } from './dto/reorder-photos.dto';
import { BulkCreatePhotosDto } from './dto/bulk-create-photos.dto';
import { BulkDeletePhotosDto } from './dto/bulk-delete-photos.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

const validationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

@ApiTags('Photos')
@Controller('photos')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiCookieAuth('access_token')
export class PhotosController {
  constructor(
    private readonly photosService: PhotosService,
    private readonly uploadService: UploadService,
  ) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Загрузить фото' })
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() createPhotoDto: CreatePhotoDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Файл не загружен');
    }
    // Оптимизируем в WebP и получаем реальные размеры
    const { width, height } = await this.uploadService.validateAndProcessImage(file.path);
    const webpFilename = file.filename.replace(/\.(jpg|jpeg|png|webp)$/i, '.webp');

    const fileData = {
      filename: webpFilename,
      originalName: file.originalname,
      mimeType: 'image/webp',
      size: file.size,
      width,
      height,
    };
    return this.photosService.create(createPhotoDto.categoryId, createPhotoDto, fileData);
  }

  /**
   * Загрузка нескольких фото за раз. Названия приходят JSON-строкой в том же
   * порядке, что и файлы; если название не передали — берём имя файла.
   */
  @Post('bulk')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Загрузить несколько фото' })
  @UseInterceptors(FilesInterceptor('files', 20))
  async createMany(
    @Body() dto: BulkCreatePhotosDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Файлы не загружены');
    }

    let titles: string[] = [];
    if (dto.titles) {
      try {
        const parsed = JSON.parse(dto.titles);
        if (Array.isArray(parsed)) titles = parsed.map((value) => String(value));
      } catch {
        throw new BadRequestException('Поле titles должно быть JSON-массивом строк');
      }
    }

    const created = [];
    for (const [index, file] of files.entries()) {
      const { width, height } = await this.uploadService.validateAndProcessImage(file.path);
      const webpFilename = file.filename.replace(/\.(jpg|jpeg|png|webp)$/i, '.webp');
      const title =
        titles[index]?.trim() || file.originalname.replace(/\.[^.]+$/, '') || 'Фото';

      created.push(
        await this.photosService.create(
          dto.categoryId,
          { title, description: dto.description, categoryId: dto.categoryId } as CreatePhotoDto,
          {
            filename: webpFilename,
            originalName: file.originalname,
            mimeType: 'image/webp',
            size: file.size,
            width,
            height,
          },
        ),
      );
    }

    return { created };
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Удалить несколько фото' })
  @UsePipes(validationPipe)
  deleteMany(@Body() dto: BulkDeletePhotosDto) {
    return this.photosService.removeMany(dto.ids);
  }

  @Get()
  @ApiOperation({ summary: 'Список фото (с пагинацией и фильтром по категории)' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @UsePipes(validationPipe)
  findAll(
    @Query('categoryId') categoryId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.photosService.findAll(categoryId, +page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить фото по ID' })
  @UsePipes(validationPipe)
  findOne(@Param('id') id: string) {
    return this.photosService.findOne(id);
  }

  // ВАЖНО: статические маршруты должны идти до ':id', иначе reorder попадёт в ':id'
  @Patch('reorder')
  @ApiOperation({ summary: 'Изменить порядок фото в категории' })
  @UsePipes(validationPipe)
  reorder(@Body() reorderDto: ReorderPhotosDto) {
    return this.photosService.reorder(reorderDto.categoryId, reorderDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить метаданные фото' })
  @UsePipes(validationPipe)
  update(@Param('id') id: string, @Body() updatePhotoDto: UpdatePhotoDto) {
    return this.photosService.update(id, updatePhotoDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Удалить фото' })
  @UsePipes(validationPipe)
  delete(@Param('id') id: string) {
    return this.photosService.delete(id);
  }
}