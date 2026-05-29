import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import type { PrismaService } from '../prisma/prisma.service';

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ct1',
    companyId: 'co1',
    name: 'Alice Martin',
    email: null,
    phone: null,
    title: null,
    isBillingContact: false,
    notes: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  };
}

function makePrisma() {
  const contactModel = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const clientModel = {
    findUnique: jest.fn(),
  };
  const client = {
    contact: contactModel,
    client: clientModel,
  };
  return {
    prisma: { client } as unknown as PrismaService,
    contactModel,
    clientModel,
  };
}

describe('ContactsService', () => {
  let service: ContactsService;
  let contactModel: ReturnType<typeof makePrisma>['contactModel'];
  let clientModel: ReturnType<typeof makePrisma>['clientModel'];

  beforeEach(() => {
    const p = makePrisma();
    contactModel = p.contactModel;
    clientModel = p.clientModel;
    service = new ContactsService(p.prisma);
  });

  describe('list', () => {
    it('retourne les contacts triés par nom pour un companyId donné', async () => {
      contactModel.findMany.mockResolvedValue([makeRow()]);

      const res = await service.list('co1');

      expect(contactModel.findMany).toHaveBeenCalledWith({
        where: { companyId: 'co1' },
        orderBy: { name: 'asc' },
      });
      expect(res).toHaveLength(1);
      expect(res[0]).toMatchObject({ id: 'ct1', companyId: 'co1', name: 'Alice Martin' });
      expect(res[0].createdAt).toBe('2026-01-01T00:00:00.000Z');
    });

    it('retourne un tableau vide si aucun contact', async () => {
      contactModel.findMany.mockResolvedValue([]);

      const res = await service.list('co1');

      expect(res).toEqual([]);
    });
  });

  describe('findById', () => {
    it('retourne le contact mappé', async () => {
      contactModel.findUnique.mockResolvedValue(makeRow());

      await expect(service.findById('ct1')).resolves.toMatchObject({ id: 'ct1' });
    });

    it('lance NotFound si absent', async () => {
      contactModel.findUnique.mockResolvedValue(null);

      await expect(service.findById('x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it("crée le contact après vérification de l'entreprise", async () => {
      clientModel.findUnique.mockResolvedValue({ id: 'co1' });
      contactModel.create.mockResolvedValue(makeRow());

      const res = await service.create({ companyId: 'co1', name: 'Alice Martin' });

      expect(clientModel.findUnique).toHaveBeenCalledWith({
        where: { id: 'co1' },
        select: { id: true },
      });
      expect(contactModel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ companyId: 'co1', name: 'Alice Martin' }),
      });
      expect(res.name).toBe('Alice Martin');
    });

    it("lance NotFound si l'entreprise est introuvable", async () => {
      clientModel.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ companyId: 'inexistant', name: 'Alice' }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(contactModel.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('lance NotFound si le contact est absent (sans appeler update)', async () => {
      contactModel.findUnique.mockResolvedValue(null);

      await expect(service.update('x', { name: 'Bob' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(contactModel.update).not.toHaveBeenCalled();
    });

    it('met à jour quand le contact existe', async () => {
      contactModel.findUnique.mockResolvedValue(makeRow());
      contactModel.update.mockResolvedValue(makeRow({ name: 'Bob Dupont' }));

      const res = await service.update('ct1', { name: 'Bob Dupont' });

      expect(contactModel.update).toHaveBeenCalledWith({
        where: { id: 'ct1' },
        data: { name: 'Bob Dupont' },
      });
      expect(res.name).toBe('Bob Dupont');
    });
  });

  describe('remove', () => {
    it('lance NotFound si absent (sans appeler delete)', async () => {
      contactModel.findUnique.mockResolvedValue(null);

      await expect(service.remove('x')).rejects.toBeInstanceOf(NotFoundException);
      expect(contactModel.delete).not.toHaveBeenCalled();
    });

    it('supprime quand présent', async () => {
      contactModel.findUnique.mockResolvedValue(makeRow());
      contactModel.delete.mockResolvedValue(makeRow());

      await service.remove('ct1');

      expect(contactModel.delete).toHaveBeenCalledWith({ where: { id: 'ct1' } });
    });
  });
});
