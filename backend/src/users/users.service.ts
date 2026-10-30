import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.findByLogin(createUserDto.login);
    if (existingUser) {
      throw new ConflictException('Пользователь с таким логином уже существует');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 12);

    return this.prisma.user.create({
      data: {
        login: createUserDto.login,
        passwordHash,
        name: createUserDto.name,
      },
      select: {
        id: true,
        login: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async findByLogin(login: string) {
    return this.prisma.user.findUnique({
      where: { login },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        login: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return user;
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        login: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findById(id);

    const data: any = { ...updateUserDto };
    if (updateUserDto.password) {
      data.passwordHash = await bcrypt.hash(updateUserDto.password, 12);
      delete data.password;
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        login: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async delete(id: string) {
    await this.findById(id);
    await this.prisma.user.delete({ where: { id } });
    return { message: 'Пользователь удалён' };
  }
}