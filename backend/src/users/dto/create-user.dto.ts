import { IsString, MinLength, IsOptional, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'admin_xxxxxxxx' })
  @IsString({ message: 'Укажите логин' })
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: 'Логин — не e-mail: только латиница, цифры, точка, дефис и подчёркивание',
  })
  @MaxLength(64)
  login: string;

  @ApiProperty({ example: '••••••••••••' })
  @IsString()
  @MinLength(6, { message: 'Пароль должен содержать минимум 6 символов' })
  password: string;

  @ApiPropertyOptional({ example: 'Администратор' })
  @IsOptional()
  @IsString()
  name?: string;
}