import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import type { AuthUser } from '@facturation/core';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReflector(roles: string[] | undefined) {
  return {
    getAllAndOverride: jest.fn().mockReturnValue(roles),
  } as unknown as Reflector;
}

function makeContext(user: AuthUser | undefined) {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

// ---------------------------------------------------------------------------
// RolesGuard — tests unitaires
// ---------------------------------------------------------------------------

describe('RolesGuard', () => {
  it('autorise quand aucun role nest requis', () => {
    const guard = new RolesGuard(makeReflector(undefined));
    const ctx = makeContext({ id: '1', email: 'a@b.com', name: 'A', role: 'MEMBER', isActive: true });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('autorise quand la liste de roles est vide', () => {
    const guard = new RolesGuard(makeReflector([]));
    const ctx = makeContext({ id: '1', email: 'a@b.com', name: 'A', role: 'MEMBER', isActive: true });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('autorise un utilisateur ADMIN sur une route Roles ADMIN', () => {
    const guard = new RolesGuard(makeReflector(['ADMIN']));
    const ctx = makeContext({ id: '1', email: 'a@b.com', name: 'A', role: 'ADMIN', isActive: true });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('refuse un utilisateur MEMBER sur une route Roles ADMIN avec ForbiddenException', () => {
    const guard = new RolesGuard(makeReflector(['ADMIN']));
    const ctx = makeContext({ id: '1', email: 'a@b.com', name: 'A', role: 'MEMBER', isActive: true });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('refuse quand user est undefined', () => {
    const guard = new RolesGuard(makeReflector(['ADMIN']));
    const ctx = makeContext(undefined);

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('autorise MEMBER quand MEMBER est dans la liste de roles', () => {
    const guard = new RolesGuard(makeReflector(['ADMIN', 'MEMBER']));
    const ctx = makeContext({ id: '1', email: 'a@b.com', name: 'A', role: 'MEMBER', isActive: true });

    expect(guard.canActivate(ctx)).toBe(true);
  });
});
