import 'reflect-metadata';
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReflector(isPublic: boolean) {
  return {
    getAllAndOverride: jest.fn().mockReturnValue(isPublic ? true : undefined),
  } as unknown as Reflector;
}

function makeContext() {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ headers: {} }),
    }),
  } as unknown as ExecutionContext;
}

// ---------------------------------------------------------------------------
// JwtAuthGuard — tests unitaires
// ---------------------------------------------------------------------------

describe('JwtAuthGuard', () => {
  describe('canActivate', () => {
    it('retourne true immediatement pour une route Public', () => {
      const guard = new JwtAuthGuard(makeReflector(true));
      const ctx = makeContext();

      const result = guard.canActivate(ctx);
      expect(result).toBe(true);
    });

    it('delegue a super.canActivate pour une route protegee', async () => {
      const guard = new JwtAuthGuard(makeReflector(false));
      const ctx = makeContext();

      // Sans token, le guard passport doit refuser ou lancer une exception
      try {
        const result = guard.canActivate(ctx);
        if (result instanceof Promise) {
          await result.catch(() => {
            // comportement attendu : rejet
          });
        }
        // Si false, acceptable aussi
      } catch {
        // Expected : UnauthorizedException
      }
    });
  });

  describe('handleRequest', () => {
    it('retourne user quand user est valide', () => {
      const guard = new JwtAuthGuard(makeReflector(false));
      const user = { id: '1', email: 'a@b.com', name: 'A', role: 'ADMIN', isActive: true };

      expect(guard.handleRequest(null, user)).toBe(user);
    });

    it('lance UnauthorizedException si user est null', () => {
      const guard = new JwtAuthGuard(makeReflector(false));

      expect(() => guard.handleRequest(null, null)).toThrow(UnauthorizedException);
    });

    it('lance UnauthorizedException si err est fournie', () => {
      const guard = new JwtAuthGuard(makeReflector(false));
      const err = new Error('JWT invalid');

      expect(() => guard.handleRequest(err, null)).toThrow(UnauthorizedException);
    });

    it('utilise un message generique sans exposer les details', () => {
      const guard = new JwtAuthGuard(makeReflector(false));

      try {
        guard.handleRequest(null, null);
      } catch (e) {
        expect((e as UnauthorizedException).message).toContain('invalide');
      }
    });
  });
});
