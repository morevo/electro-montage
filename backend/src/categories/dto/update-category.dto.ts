import { IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Электропроводка' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'electrovodka' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Слаг может содержать только строчные буквы, цифры и дефисы',
  })
  slug?: string;

  @ApiPropertyOptional({ example: 'Работы по электропроводке' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}