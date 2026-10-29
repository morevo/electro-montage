import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';

import { PublicService } from './public.service';

@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Получить все категории с фото (для публичного портфолио)' })
  async getCategories() {
    return this.publicService.getCategories();
  }

  @Get('categories/:slug')
  @ApiOperation({ summary: 'Получить категорию по слагу с фото' })
  @ApiParam({ name: 'slug', example: 'electrovodka' })
  async getCategoryBySlug(@Param('slug') slug: string) {
    return this.publicService.getCategoryBySlug(slug);
  }
}