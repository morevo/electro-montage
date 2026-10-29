import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePhotoDto {
  @ApiProperty({ example: 'Электрический щит в частном доме' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Сборка щита 3х16А' })
  @IsOptional()
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