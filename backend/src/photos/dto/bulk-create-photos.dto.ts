import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { decodeBase64Text } from '../../common/utils/base64-text.util';

export class BulkCreatePhotosDto {
  @ApiProperty()
  @IsUUID()
  categoryId: string;

  /**
   * Названия файлов в том же порядке, что и files[].
   * Приходит JSON-строкой в base64 (см. decodeBase64Text) — multipart не
   * умеет массивы, а base64 защищает от ложных срабатываний WAF хостинга.
   */
  @ApiPropertyOptional({ example: '["Щит в доме","Щит в квартире"]' })
  @IsOptional()
  @Transform(({ value }) => decodeBase64Text(value))
  @IsString()
  @MaxLength(7000)
  titles?: string;

  @ApiPropertyOptional({ example: 'Работы за октябрь' })
  @IsOptional()
  @Transform(({ value }) => decodeBase64Text(value))
  @IsString()
  @MaxLength(500)
  description?: string;
}
