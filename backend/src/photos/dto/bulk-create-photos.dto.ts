import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkCreatePhotosDto {
  @ApiProperty()
  @IsUUID()
  categoryId: string;

  /**
   * Названия файлов в том же порядке, что и files[].
   * Приходит JSON-строкой: multipart не умеет массивы.
   */
  @ApiPropertyOptional({ example: '["Щит в доме","Щит в квартире"]' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  titles?: string;

  @ApiPropertyOptional({ example: 'Работы за октябрь' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
