import 'reflect-metadata';
import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import type { PrismaService } from '../prisma/prisma.service';

function makeStrategy(user: unknown) {
  const config = { get: () => 'access-secret' } as unknown as ConfigService;
  const findUnique = jest.fn().mockResolvedValue(user);
  const prisma = { client: { user: { findUnique } } } as unknown as PrismaService;
  return { strategy: new JwtStrategy(config, prisma), findUnique };
}

const payload = { sub: 'u1', email: 'token@b.c', name: 'Token', role: 'MEMBER', isActive: true };

describe('JwtStrategy', () => {
  it('retourne l’utilisateur FRAIS de la base (le token peut être périmé)', async () => {
    const { strategy, findUnique } = makeStrategy({
      id: 'u1',
      email: 'db@b.c',
      name: 'DB',
      role: 'ADMIN',
      isActive: true,
    });
    const res = await strategy.validate(payload);
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'u1' } }),
    );
    // Rôle/email proviennent de la base, pas du token.
    expect(res).toMatchObject({ id: 'u1', email: 'db@b.c', role: 'ADMIN', isActive: true });
  });

  it('401 si l’utilisateur est introuvable', async () => {
    const { strategy } = makeStrategy(null);
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('401 si le compte est désactivé (même si le token le dit actif)', async () => {
    const { strategy } = makeStrategy({
      id: 'u1',
      email: 'a@b.c',
      name: 'A',
      role: 'MEMBER',
      isActive: false,
    });
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
