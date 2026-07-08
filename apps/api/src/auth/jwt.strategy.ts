import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthUser } from '@facturation/core';
import { PrismaService } from '../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
}

/**
 * Stratégie Passport JWT.
 * Extrait le Bearer token, valide la signature, puis REVALIDE l'utilisateur en
 * base : un compte désactivé ou rétrogradé perd l'accès immédiatement, sans
 * attendre l'expiration du token (le rôle/isActif embarqués pourraient être
 * périmés). Le rôle et l'état actif retournés proviennent de la base.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_ACCESS_SECRET');
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET manquant — impossible de démarrer');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Compte désactivé ou introuvable');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as AuthUser['role'],
      isActive: user.isActive,
    };
  }
}
