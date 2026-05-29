import 'reflect-metadata';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import type { AuthService } from '../auth/auth.service';
import type { PrismaService } from '../prisma/prisma.service';

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    email: 'membre@example.com',
    name: 'Membre Test',
    role: 'MEMBER',
    isActive: true,
    _count: { createdInvoices: 0, createdClients: 0 },
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makePrisma() {
  const user = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn().mockResolvedValue(1), // par défaut : il existe d'autres admins actifs
  };
  const invoice = { count: jest.fn().mockResolvedValue(0) };
  const client = { count: jest.fn().mockResolvedValue(0) };
  const prisma = { client: { user, invoice, client } } as unknown as PrismaService;
  return { prisma, user, invoice, client };
}

function makeAuth() {
  return {
    toAuthUser: jest.fn((u: { id: string; email: string; name: string; role: string; isActive: boolean }) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      isActive: u.isActive,
    })),
    createUser: jest.fn(),
    revokeUserTokens: jest.fn().mockResolvedValue(undefined),
    setUserPassword: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<AuthService>;
}

describe('UsersService', () => {
  let service: UsersService;
  let p: ReturnType<typeof makePrisma>;
  let auth: ReturnType<typeof makeAuth>;

  beforeEach(() => {
    p = makePrisma();
    auth = makeAuth();
    service = new UsersService(p.prisma, auth);
  });

  describe('findAll / findById — deletable', () => {
    it('calcule deletable=true quand aucune donnée créée', async () => {
      p.user.findMany.mockResolvedValue([makeUser()]);
      const res = await service.findAll();
      expect(res[0].deletable).toBe(true);
    });

    it('calcule deletable=false quand l’utilisateur a créé des factures', async () => {
      p.user.findUnique.mockResolvedValue(makeUser({ _count: { createdInvoices: 3, createdClients: 0 } }));
      const res = await service.findById('u1');
      expect(res.deletable).toBe(false);
    });

    it('findById lance NotFound si absent', async () => {
      p.user.findUnique.mockResolvedValue(null);
      await expect(service.findById('x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('retourne deletable=true pour un compte fraîchement créé', async () => {
      (auth.createUser as jest.Mock).mockResolvedValue({
        id: 'new',
        email: 'n@n.com',
        name: 'Nouveau',
        role: 'MEMBER',
        isActive: true,
      });
      const res = await service.create({
        email: 'n@n.com',
        name: 'Nouveau',
        password: 'Password1!',
        role: 'MEMBER',
      });
      expect(res.deletable).toBe(true);
    });
  });

  describe('update — garde-fous', () => {
    it('lance NotFound si absent', async () => {
      p.user.findUnique.mockResolvedValue(null);
      await expect(service.update('x', { name: 'X' }, 'admin')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('400 si on tente de se désactiver soi-même', async () => {
      p.user.findUnique.mockResolvedValue(makeUser({ id: 'admin', role: 'ADMIN' }));
      await expect(
        service.update('admin', { isActive: false }, 'admin'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(p.user.update).not.toHaveBeenCalled();
    });

    it('409 si on désactive le dernier ADMIN actif', async () => {
      p.user.findUnique.mockResolvedValue(makeUser({ id: 'a2', role: 'ADMIN', isActive: true }));
      p.user.count.mockResolvedValue(0); // aucun autre admin actif
      await expect(
        service.update('a2', { isActive: false }, 'admin'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(p.user.update).not.toHaveBeenCalled();
    });

    it('409 si on rétrograde le dernier ADMIN actif', async () => {
      p.user.findUnique.mockResolvedValue(makeUser({ id: 'a2', role: 'ADMIN', isActive: true }));
      p.user.count.mockResolvedValue(0);
      await expect(
        service.update('a2', { role: 'MEMBER' }, 'admin'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('désactive un membre et révoque ses sessions', async () => {
      p.user.findUnique.mockResolvedValue(makeUser({ id: 'u1', role: 'MEMBER' }));
      p.user.update.mockResolvedValue(makeUser({ id: 'u1', isActive: false }));
      await service.update('u1', { isActive: false }, 'admin');
      expect(p.user.update).toHaveBeenCalled();
      expect(auth.revokeUserTokens).toHaveBeenCalledWith('u1');
    });

    it('409 si le nouvel email est déjà pris', async () => {
      p.user.findUnique
        .mockResolvedValueOnce(makeUser({ id: 'u1', email: 'a@a.com' })) // existing
        .mockResolvedValueOnce(makeUser({ id: 'u2', email: 'b@b.com' })); // conflit
      await expect(
        service.update('u1', { email: 'b@b.com' }, 'admin'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('met à jour le nom sans révoquer de session', async () => {
      p.user.findUnique.mockResolvedValue(makeUser({ id: 'u1' }));
      p.user.update.mockResolvedValue(makeUser({ id: 'u1', name: 'Nouveau' }));
      const res = await service.update('u1', { name: 'Nouveau' }, 'admin');
      expect(res.name).toBe('Nouveau');
      expect(auth.revokeUserTokens).not.toHaveBeenCalled();
    });
  });

  describe('remove — garde-fous', () => {
    it('lance NotFound si absent', async () => {
      p.user.findUnique.mockResolvedValue(null);
      await expect(service.remove('x', 'admin')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('400 si on tente de se supprimer soi-même', async () => {
      p.user.findUnique.mockResolvedValue(makeUser({ id: 'admin', role: 'ADMIN' }));
      await expect(service.remove('admin', 'admin')).rejects.toBeInstanceOf(BadRequestException);
      expect(p.user.delete).not.toHaveBeenCalled();
    });

    it('409 si on supprime le dernier ADMIN actif', async () => {
      p.user.findUnique.mockResolvedValue(makeUser({ id: 'a2', role: 'ADMIN', isActive: true }));
      p.user.count.mockResolvedValue(0);
      await expect(service.remove('a2', 'admin')).rejects.toBeInstanceOf(ConflictException);
      expect(p.user.delete).not.toHaveBeenCalled();
    });

    it('409 si l’utilisateur a créé des données', async () => {
      p.user.findUnique.mockResolvedValue(makeUser({ id: 'u1', role: 'MEMBER' }));
      p.invoice.count.mockResolvedValue(2);
      await expect(service.remove('u1', 'admin')).rejects.toBeInstanceOf(ConflictException);
      expect(p.user.delete).not.toHaveBeenCalled();
    });

    it('supprime un utilisateur sans données', async () => {
      p.user.findUnique.mockResolvedValue(makeUser({ id: 'u1', role: 'MEMBER' }));
      p.invoice.count.mockResolvedValue(0);
      p.client.count.mockResolvedValue(0);
      p.user.delete.mockResolvedValue(makeUser({ id: 'u1' }));
      await service.remove('u1', 'admin');
      expect(p.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
    });
  });

  describe('resetPassword', () => {
    it('lance NotFound si absent', async () => {
      p.user.findUnique.mockResolvedValue(null);
      await expect(service.resetPassword('x', 'NouveauMdp1!')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(auth.setUserPassword).not.toHaveBeenCalled();
    });

    it('délègue à AuthService.setUserPassword', async () => {
      p.user.findUnique.mockResolvedValue(makeUser({ id: 'u1' }));
      await service.resetPassword('u1', 'NouveauMdp1!');
      expect(auth.setUserPassword).toHaveBeenCalledWith('u1', 'NouveauMdp1!');
    });
  });
});
