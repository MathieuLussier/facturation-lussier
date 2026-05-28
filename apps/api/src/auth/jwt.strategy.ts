import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthUser } from '@facturation/core';

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
}

/**
 * Stratégie Passport JWT.
 * Extrait le Bearer token du header Authorization et valide la signature.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
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

  validate(payload: JwtPayload): AuthUser {
    if (!payload.isActive) {
      throw new UnauthorizedException('Compte désactivé');
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role as AuthUser['role'],
      isActive: payload.isActive,
    };
  }
}
