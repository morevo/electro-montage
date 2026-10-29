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
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiCookieAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';

import { PhotosService } from './photos.service';
import { CreatePhotoDto } from './dto/create-photo.dto';
import { UpdatePhotoDto } from './dto/update-photo.dto';
import { ReorderPhotosDto } from './dto/reorder-photos.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Photos')
@Controller('photos')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiCookieAuth('access_token')
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

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
    const fileData = {
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
    return this.photosService.create(createPhotoDto.categoryId, createPhotoDto, fileData);
  }

  @Get()
  @ApiOperation({ summary: 'Список фото (с пагинацией и фильтром по категории)' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('categoryId') categoryId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.photosService.findAll(categoryId, +page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить фото по ID' })
  findOne(@Param('id') id: string) {
    return this.photosService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить метаданные фото' })
  update(@Param('id') id: string, @Body() updatePhotoDto: UpdatePhotoDto) {
    return this.photosService.update(id, updatePhotoDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Удалить фото' })
  delete(@Param('id') id: string) {
    return this.photosService.delete(id);
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Изменить порядок фото в категории' })
  reorder(@Body() reorderDto: ReorderPhotosDto) {
    return this.photosService.reorder(reorderDto.categoryId, reorderDto);
  }
}