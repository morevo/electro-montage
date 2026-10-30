import { IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Электропроводка' })
  @IsString()
  @MinLength(2, { message: 'Название должно содержать минимум 2 символа' })
  @MaxLength(100)
  name: string;

  // Слаг больше не вводится в админке — сервер делает его сам из названия.
  // Поле оставлено для API/скриптов, которым нужен свой адрес категории.
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