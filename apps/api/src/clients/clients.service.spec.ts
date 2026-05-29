import 'reflect-metadata';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ClientsService } from './clients.service';
import type { PrismaService } from '../prisma/prisma.service';

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    companyName: 'Acme Inc',
    email: null,
    phone: null,
    addressLine: null,
    city: null,
    province: 'QC',
    postalCode: null,
    country: 'Canada',
    neq: null,
    contactName: null,
    notes: null,
    createdById: 'u1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  };
}

function makePrisma() {
  const model = {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const invoice = { count: jest.fn().mockResolvedValue(0) };
  const client = {
    client: model,
    invoice,
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  return { prisma: { client } as unknown as PrismaService, model, invoice };
}

describe('ClientsService', () => {
  let service: ClientsService;
  let model: ReturnType<typeof makePrisma>['model'];
  let invoice: ReturnType<typeof makePrisma>['invoice'];

  beforeEach(() => {
    const p = makePrisma();
    model = p.model;
    invoice = p.invoice;
    service = new ClientsService(p.prisma);
  });

  describe('list', () => {
    it('retourne une page mappée avec total et défauts page/pageSize', async () => {
      model.findMany.mockResolvedValue([makeRow()]);
      model.count.mockResolvedValue(1);

      const res = await service.list({});

      expect(res).toMatchObject({ total: 1, page: 1, pageSize: 20 });
      expect(res.items[0]).toMatchObject({ id: 'c1', companyName: 'Acme Inc' });
      expect(res.items[0].createdAt).toBe('2026-01-01T00:00:00.000Z');
    });

    it('applique une recherche insensible à la casse + pagination', async () => {
      model.findMany.mockResolvedValue([]);
      model.count.mockResolvedValue(0);

      await service.list({ search: 'acme', page: 2, pageSize: 10 });

      expect(model.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyName: { contains: 'acme', mode: 'insensitive' } },
          skip: 10,
          take: 10,
        }),
      );
    });
  });

  describe('findById', () => {
    it('retourne le client mappé', async () => {
      model.findUnique.mockResolvedValue(makeRow());
      await expect(service.findById('c1')).resolves.toMatchObject({ id: 'c1' });
    });

    it('lance NotFound si absent', async () => {
      model.findUnique.mockResolvedValue(null);
      await expect(service.findById('x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('crée avec createdById et retourne le client mappé', async () => {
      model.create.mockResolvedValue(makeRow());

      const res = await service.create({ companyName: 'Acme Inc' }, 'u1');

      expect(model.create).toHaveBeenCalledWith({
        data: { companyName: 'Acme Inc', createdById: 'u1' },
      });
      expect(res.companyName).toBe('Acme Inc');
    });
  });

  describe('update', () => {
    it('lance NotFound si le client est absent (sans appeler update)', async () => {
      model.findUnique.mockResolvedValue(null);
      await expect(service.update('x', { city: 'Montréal' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(model.update).not.toHaveBeenCalled();
    });

    it('met à jour quand le client existe', async () => {
      model.findUnique.mockResolvedValue(makeRow());
      model.update.mockResolvedValue(makeRow({ city: 'Montréal' }));

      const res = await service.update('c1', { city: 'Montréal' });

      expect(model.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { city: 'Montréal' },
      });
      expect(res.city).toBe('Montréal');
    });
  });

  describe('remove', () => {
    it('lance NotFound si absent (sans appeler delete)', async () => {
      model.findUnique.mockResolvedValue(null);
      await expect(service.remove('x')).rejects.toBeInstanceOf(NotFoundException);
      expect(model.delete).not.toHaveBeenCalled();
    });

    it('supprime quand présent et sans facture rattachée', async () => {
      model.findUnique.mockResolvedValue(makeRow());
      invoice.count.mockResolvedValue(0);
      model.delete.mockResolvedValue(makeRow());

      await service.remove('c1');

      expect(model.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    });

    it('lance Conflict si des factures sont rattachées (sans appeler delete)', async () => {
      model.findUnique.mockResolvedValue(makeRow());
      invoice.count.mockResolvedValue(2);

      await expect(service.remove('c1')).rejects.toBeInstanceOf(ConflictException);
      expect(model.delete).not.toHaveBeenCalled();
    });
  });
});
