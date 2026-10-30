import { IsString, MinLength, IsOptional, IsEnum, Matches, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'admin_xxxxxxxx' })
  @IsOptional()
  @IsString({ message: 'Укажите логин' })
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: 'Логин — не e-mail: только латиница, цифры, точка, дефис и подчёркивание',
  })
  @MaxLength(64)
  login?: string;

  @ApiPropertyOptional({ example: 'newPassword123' })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Пароль должен содержать минимум 6 символов' })
  password?: string;

  @ApiPropertyOptional({ example: 'Администратор' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}