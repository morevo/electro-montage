import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkDeletePhotosDto {
  @ApiProperty({ example: ['a1b2c3d4-0000-4000-8000-000000000000'] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  ids: string[];
}
