import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { decodeBase64Text } from '../../common/utils/base64-text.util';

export class CreatePhotoDto {
  @ApiProperty({ example: 'Электрический щит в частном доме' })
  @Transform(({ value }) => decodeBase64Text(value))
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Сборка щита 3х16А' })
  @IsOptional()
  @Transform(({ value }) => decodeBase64Text(value))
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty()
  @IsUUID()
  categoryId: string;

  // These are filled from the uploaded file
  filename?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
}