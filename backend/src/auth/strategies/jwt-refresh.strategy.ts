import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

import { PrismaService } from '../../prisma/prisma.service';
import { TokenPayload } from '../interfaces/token-payload.interface';

// Extend Express Request type to include refreshToken
interface RequestWithRefreshToken extends Request {
  refreshToken?: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.refresh_token,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: RequestWithRefreshToken, payload: TokenPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    const tokenHash = req.cookies?.refresh_token
      ? await import('bcrypt').then((b) => b.hash(req.cookies.refresh_token, 10))
      : null;

    if (tokenHash) {
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { tokenHash },
      });
      if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token недействителен или истёк');
      }
    }

    req.user = user;
    req.refreshToken = req.cookies?.refresh_token;
    return user;
  }
}