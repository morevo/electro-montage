import { IsString, MinLength, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
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
}