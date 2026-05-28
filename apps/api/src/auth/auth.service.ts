import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import type { AuthTokens, AuthUser } from '@facturation/core';
import { PrismaService } from '../prisma/prisma.service';

const SALT_ROUNDS = 12;

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessTtl: number;
  private readonly refreshTtl: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {
    const accessSecret = this.config.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET');

    if (!accessSecret || !refreshSecret) {
      throw new Error('JWT_ACCESS_SECRET et JWT_REFRESH_SECRET sont obligatoires');
    }

    this.accessSecret = accessSecret;
    this.refreshSecret = refreshSecret;
    this.accessTtl = Number(this.config.get<string>('ACCESS_TTL') ?? '900');
    this.refreshTtl = Number(this.config.get<string>('REFRESH_TTL') ?? '604800');
  }

  /** TTL (secondes) du refresh token — source unique pour le cookie et le JWT. */
  get refreshTtlSeconds(): number {
    return this.refreshTtl;
  }

  // ---------------------------------------------------------------------------
  // Hachage de mot de passe
  // ---------------------------------------------------------------------------

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  // ---------------------------------------------------------------------------
  // Connexion
  // ---------------------------------------------------------------------------

  async login(email: string, password: string): Promise<{ tokens: AuthTokens; refreshToken: string }> {
    const user = await this.prisma.client.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    return this.generateTokenPair(user.id, {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    });
  }

  // ---------------------------------------------------------------------------
  // Rotation du refresh token
  // ---------------------------------------------------------------------------

  async refresh(rawRefreshToken: string): Promise<{ tokens: AuthTokens; refreshToken: string }> {
    let payload: JwtPayload;

    try {
      payload = this.jwtService.verify<JwtPayload>(rawRefreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }

    const tokenHash = hashToken(rawRefreshToken);

    const stored = await this.prisma.client.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored) {
      // Réutilisation détectée : révoquer TOUS les tokens de l'utilisateur
      await this.prisma.client.refreshToken.updateMany({
        where: { userId: payload.sub, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token déjà utilisé — tous vos tokens ont été révoqués');
    }

    if (stored.revokedAt !== null || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token révoqué ou expiré');
    }

    // Rotation : révoquer l'ancien token
    await this.prisma.client.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.client.user.findUnique({
      where: { id: stored.userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Compte désactivé');
    }

    return this.generateTokenPair(user.id, {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    });
  }

  // ---------------------------------------------------------------------------
  // Déconnexion
  // ---------------------------------------------------------------------------

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = hashToken(rawRefreshToken);

    await this.prisma.client.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ---------------------------------------------------------------------------
  // Utilitaires privés
  // ---------------------------------------------------------------------------

  private async generateTokenPair(
    userId: string,
    user: AuthUser,
  ): Promise<{ tokens: AuthTokens; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: userId,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    };

    // Générer les deux tokens
    const accessToken = this.jwtService.sign(payload, {
      secret: this.accessSecret,
      expiresIn: `${this.accessTtl}s`,
    });

    // `jti` aléatoire : garantit l'unicité du token (donc du tokenHash) même si
    // deux tokens sont émis pour le même utilisateur dans la même seconde
    // (iat/exp ont une résolution d'1 s). Évite une collision sur la contrainte
    // @unique de tokenHash lors d'un refresh immédiat après le login.
    const refreshToken = this.jwtService.sign(
      { sub: userId, jti: crypto.randomUUID() },
      {
        secret: this.refreshSecret,
        expiresIn: `${this.refreshTtl}s`,
      },
    );

    // Nettoyer les tokens expirés de manière opportuniste
    await this.prisma.client.refreshToken.deleteMany({
      where: { userId, expiresAt: { lt: new Date() } },
    });

    // Stocker le hash du refresh token
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + this.refreshTtl * 1000);

    await this.prisma.client.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return {
      tokens: { accessToken, expiresInSec: this.accessTtl },
      refreshToken,
    };
  }

  // ---------------------------------------------------------------------------
  // Création d'utilisateur (usage interne + UsersService)
  // ---------------------------------------------------------------------------

  async createUser(data: {
    email: string;
    name: string;
    password: string;
    role: AuthUser['role'];
  }): Promise<AuthUser> {
    const existing = await this.prisma.client.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà');
    }

    const passwordHash = await this.hashPassword(data.password);

    const user = await this.prisma.client.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        name: data.name,
        role: data.role,
        isActive: true,
      },
    });

    return this.toAuthUser(user);
  }

  toAuthUser(user: {
    id: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
  }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as AuthUser['role'],
      isActive: user.isActive,
    };
  }
}
