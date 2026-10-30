import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { createHash, randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TokenPayload } from './interfaces/token-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto, res: Response) {
    const existingUser = await this.usersService.findByLogin(registerDto.login);
    if (existingUser) {
      throw new ConflictException('Пользователь с таким логином уже существует');
    }

    const user = await this.usersService.create(registerDto);
    return this.generateTokensAndSetCookies(user, res);
  }

  async login(loginDto: LoginDto, res: Response) {
    const user = await this.usersService.findByLogin(loginDto.login);
    // Одинаковый текст для «нет юзера» и «неверный пароль», чтобы по ответу
    // нельзя было перебирать логины.
    const invalidCredentials = 'Неверный логин или пароль';
    if (!user) {
      throw new UnauthorizedException(invalidCredentials);
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException(invalidCredentials);
    }

    return this.generateTokensAndSetCookies(user, res);
  }

  async logout(refreshToken: string | undefined, res: Response) {
    // Отзываем текущий refresh-токен (если он есть), затем чистим cookies.
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: this.hashToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    this.clearAuthCookies(res);
    return { message: 'Успешный выход' };
  }

  async refresh(refreshToken: string, res: Response) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token не предоставлен');
    }

    // Детерминированный хеш: bcrypt не подходит для поиска (у каждого хеша своя соль)
    const tokenHash = this.hashToken(refreshToken);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token недействителен или истёк');
    }

    // Удаляем старый токен (ротация): хранить отозванные строки незачем,
    // а tokenHash уникален и мешал бы повторной выдаче в ту же секунду.
    await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });

    return this.generateTokensAndSetCookies(storedToken.user, res);
  }

  async getProfile(userId: string) {
    return this.usersService.findById(userId);
  }

  private async generateTokensAndSetCookies(user: any, res: Response) {
    const payload: TokenPayload = {
      sub: user.id,
      login: user.login,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_TTL') || '7d',
      // jti делает каждый refresh-токен уникальным: без него два токена,
      // выданные в одну секунду, совпадали по подписи и падали на unique tokenHash.
      jwtid: randomUUID(),
    });

    const refreshTokenHash = this.hashToken(refreshToken);
    const refreshTtlMs = this.parseTtl(this.configService.get('JWT_REFRESH_TTL') || '7d');

    // Чистим просроченные/отозванные токены этого пользователя
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId: user.id,
        OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }],
      },
    });

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: refreshTokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + refreshTtlMs),
      },
    });

    this.setAuthCookies(res, accessToken, refreshToken);

    return {
      user: {
        id: user.id,
        login: user.login,
        name: user.name,
        role: user.role,
      },
    };
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict' as const,
      path: '/',
    };

    const accessTtlMs = this.parseTtl(this.configService.get('JWT_ACCESS_TTL') || '15m');
    const refreshTtlMs = this.parseTtl(this.configService.get('JWT_REFRESH_TTL') || '7d');

    res.cookie('access_token', accessToken, {
      ...cookieOptions,
      maxAge: accessTtlMs,
    });

    res.cookie('refresh_token', refreshToken, {
      ...cookieOptions,
      maxAge: refreshTtlMs,
    });
  }

  private clearAuthCookies(res: Response) {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
    });
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
    });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseTtl(ttl: string): number {
    const match = ttl.match(/^(\d+)([mhd])$/);
    if (!match) return 15 * 60 * 1000;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 15 * 60 * 1000;
    }
  }
}