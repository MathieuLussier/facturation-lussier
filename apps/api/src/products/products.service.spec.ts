import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import type { PrismaService } from '../prisma/prisma.service';

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    name: 'Consultation',
    description: null,
    unitPriceCents: 10000,
    unit: 'heure',
    isActive: true,
    archivedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  };
}

function makePrisma() {
  const product = {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const client = {
    product,
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  return { prisma: { client } as unknown as PrismaService, product };
}

describe('ProductsService', () => {
  let service: ProductsService;
  let product: ReturnType<typeof makePrisma>['product'];

  beforeEach(() => {
    const p = makePrisma();
    product = p.product;
    service = new ProductsService(p.prisma);
  });

  describe('list', () => {
    it('retourne une page mappée avec total et défauts page/pageSize', async () => {
      product.findMany.mockResolvedValue([makeRow()]);
      product.count.mockResolvedValue(1);

      const res = await service.list({});

      expect(res).toMatchObject({ total: 1, page: 1, pageSize: 20 });
      expect(res.items[0]).toMatchObject({ id: 'p1', name: 'Consultation', unitPriceCents: 10000 });
      expect(res.items[0].createdAt).toBe('2026-01-01T00:00:00.000Z');
    });

    it('applique recherche insensible à la casse + pagination', async () => {
      product.findMany.mockResolvedValue([]);
      product.count.mockResolvedValue(0);

      await service.list({ search: 'consult', page: 2, pageSize: 10 });

      expect(product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ name: { contains: 'consult', mode: 'insensitive' } }),
          skip: 10,
          take: 10,
        }),
      );
    });

    it('filtre archivedAt: null par défaut, le retire avec includeArchived', async () => {
      product.findMany.mockResolvedValue([]);
      product.count.mockResolvedValue(0);

      await service.list({});
      expect(product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ archivedAt: null }) }),
      );

      product.findMany.mockClear();
      await service.list({ includeArchived: true });
      const whereArg = product.findMany.mock.calls[0][0].where as Record<string, unknown>;
      expect(whereArg).not.toHaveProperty('archivedAt');
    });
  });

  describe('listActive', () => {
    it('filtre isActive + non archivés et mappe', async () => {
      product.findMany.mockResolvedValue([makeRow()]);
      const res = await service.listActive();
      expect(product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isActive: true, archivedAt: null }) }),
      );
      expect(res[0].name).toBe('Consultation');
    });
  });

  describe('findById', () => {
    it('retourne le produit mappé', async () => {
      product.findUnique.mockResolvedValue(makeRow());
      await expect(service.findById('p1')).resolves.toMatchObject({ id: 'p1' });
    });

    it('lance NotFound si absent', async () => {
      product.findUnique.mockResolvedValue(null);
      await expect(service.findById('x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('crée et retourne le produit mappé', async () => {
      product.create.mockResolvedValue(makeRow());
      const res = await service.create({ name: 'Consultation', unitPriceCents: 10000, unit: 'heure' });
      expect(product.create).toHaveBeenCalledWith({
        data: { name: 'Consultation', unitPriceCents: 10000, unit: 'heure' },
      });
      expect(res.name).toBe('Consultation');
    });
  });

  describe('update', () => {
    it('lance NotFound si absent (sans appeler update)', async () => {
      product.findUnique.mockResolvedValue(null);
      await expect(service.update('x', { unitPriceCents: 1 })).rejects.toBeInstanceOf(NotFoundException);
      expect(product.update).not.toHaveBeenCalled();
    });

    it('met à jour quand présent', async () => {
      product.findUnique.mockResolvedValue(makeRow());
      product.update.mockResolvedValue(makeRow({ unitPriceCents: 12000 }));
      const res = await service.update('p1', { unitPriceCents: 12000 });
      expect(product.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { unitPriceCents: 12000 } });
      expect(res.unitPriceCents).toBe(12000);
    });
  });

  describe('archive / unarchive', () => {
    it('archive positionne archivedAt = une Date', async () => {
      const now = new Date();
      product.findUnique.mockResolvedValue(makeRow());
      product.update.mockResolvedValue(makeRow({ archivedAt: now }));
      const res = await service.archive('p1');
      expect(product.update.mock.calls[0][0].data.archivedAt).toBeInstanceOf(Date);
      expect(res.archivedAt).toBe(now.toISOString());
    });

    it('unarchive efface archivedAt', async () => {
      product.findUnique.mockResolvedValue(makeRow({ archivedAt: new Date() }));
      product.update.mockResolvedValue(makeRow({ archivedAt: null }));
      const res = await service.unarchive('p1');
      expect(product.update.mock.calls[0][0].data.archivedAt).toBeNull();
      expect(res.archivedAt).toBeNull();
    });
  });

  describe('remove', () => {
    it('lance NotFound si absent (sans appeler delete)', async () => {
      product.findUnique.mockResolvedValue(null);
      await expect(service.remove('x')).rejects.toBeInstanceOf(NotFoundException);
      expect(product.delete).not.toHaveBeenCalled();
    });

    it('supprime quand présent', async () => {
      product.findUnique.mockResolvedValue(makeRow());
      product.delete.mockResolvedValue(makeRow());
      await service.remove('p1');
      expect(product.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    });
  });
});
