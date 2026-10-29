import { IsArray, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderPhotoItemDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @Type(() => Number)
  sortOrder: number;
}

export class ReorderPhotosDto {
  @ApiProperty()
  @IsUUID()
  categoryId: string;

  @ApiProperty({ type: [ReorderPhotoItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderPhotoItemDto)
  items: ReorderPhotoItemDto[];
}