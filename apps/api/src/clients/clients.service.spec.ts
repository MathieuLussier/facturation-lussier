import 'reflect-metadata';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ClientsService } from './clients.service';
import type { PrismaService } from '../prisma/prisma.service';

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    type: 'COMPANY',
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
    archivedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    _count: { invoices: 0, contacts: 0, projects: 0 },
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
  const contact = { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) };
  const project = { count: jest.fn().mockResolvedValue(0) };
  const client = {
    client: model,
    invoice,
    contact,
    project,
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  return { prisma: { client } as unknown as PrismaService, model, invoice, contact, project };
}

describe('ClientsService', () => {
  let service: ClientsService;
  let model: ReturnType<typeof makePrisma>['model'];
  let invoice: ReturnType<typeof makePrisma>['invoice'];
  let contact: ReturnType<typeof makePrisma>['contact'];
  let project: ReturnType<typeof makePrisma>['project'];

  beforeEach(() => {
    const p = makePrisma();
    model = p.model;
    invoice = p.invoice;
    contact = p.contact;
    project = p.project;
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
          where: expect.objectContaining({
            companyName: { contains: 'acme', mode: 'insensitive' },
          }),
          skip: 10,
          take: 10,
        }),
      );
    });

    it('filtre archivedAt: null par défaut (includeArchived absent)', async () => {
      model.findMany.mockResolvedValue([]);
      model.count.mockResolvedValue(0);

      await service.list({});

      expect(model.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ archivedAt: null }),
        }),
      );
    });

    it("n'ajoute pas archivedAt au where quand includeArchived est true", async () => {
      model.findMany.mockResolvedValue([]);
      model.count.mockResolvedValue(0);

      await service.list({ includeArchived: true });

      const whereArg = model.findMany.mock.calls[0][0].where as Record<string, unknown>;
      expect(whereArg).not.toHaveProperty('archivedAt');
    });

    it('calcule deletable=true quand tous les compteurs sont 0', async () => {
      model.findMany.mockResolvedValue([makeRow()]);
      model.count.mockResolvedValue(1);

      const res = await service.list({});

      expect(res.items[0].deletable).toBe(true);
    });

    it('calcule deletable=false quand invoices > 0', async () => {
      model.findMany.mockResolvedValue([makeRow({ _count: { invoices: 1, contacts: 0, projects: 0 } })]);
      model.count.mockResolvedValue(1);

      const res = await service.list({});

      expect(res.items[0].deletable).toBe(false);
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

    it('inclut archivedAt null dans la réponse', async () => {
      model.findUnique.mockResolvedValue(makeRow());
      const res = await service.findById('c1');
      expect(res.archivedAt).toBeNull();
    });

    it('inclut deletable dans la réponse', async () => {
      model.findUnique.mockResolvedValue(makeRow());
      const res = await service.findById('c1');
      expect(res.deletable).toBe(true);
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

    it('transmet le type et retourne un particulier', async () => {
      model.create.mockResolvedValue(makeRow({ type: 'INDIVIDUAL', companyName: 'Jean Tremblay' }));
      const res = await service.create({ type: 'INDIVIDUAL', companyName: 'Jean Tremblay' }, 'u1');
      expect(model.create).toHaveBeenCalledWith({
        data: { type: 'INDIVIDUAL', companyName: 'Jean Tremblay', createdById: 'u1' },
      });
      expect(res.type).toBe('INDIVIDUAL');
    });
  });

  describe('directory', () => {
    const makeContactRow = (over: Record<string, unknown> = {}) => ({
      id: 'ct1',
      name: 'Jean Tremblay',
      companyId: 'c1',
      archivedAt: null,
      company: { companyName: 'Acme Inc' },
      ...over,
    });

    it('fusionne entreprises/particuliers + contacts, triés par nom', async () => {
      model.findMany.mockResolvedValue([
        makeRow({ id: 'c1', type: 'COMPANY', companyName: 'Acme Inc', city: 'Québec' }),
        makeRow({ id: 'c2', type: 'INDIVIDUAL', companyName: 'Zoé Bernard' }),
      ]);
      contact.findMany.mockResolvedValue([makeContactRow({ name: 'Bob Roy' })]);

      const res = await service.directory({});

      expect(res.total).toBe(3);
      expect(res.items.map((e) => e.name)).toEqual(['Acme Inc', 'Bob Roy', 'Zoé Bernard']);
      const byName = Object.fromEntries(res.items.map((e) => [e.name, e]));
      expect(byName['Acme Inc'].kind).toBe('company');
      expect(byName['Zoé Bernard'].kind).toBe('individual');
      expect(byName['Bob Roy'].kind).toBe('contact');
      expect(byName['Bob Roy'].companyId).toBe('c1');
      expect(byName['Bob Roy'].subtitle).toBe('Acme Inc');
    });

    it('exclut les archivés par défaut, les inclut avec includeArchived', async () => {
      model.findMany.mockResolvedValue([]);
      contact.findMany.mockResolvedValue([]);

      await service.directory({});
      expect(model.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ archivedAt: null }) }),
      );

      model.findMany.mockClear();
      await service.directory({ includeArchived: true });
      const whereArg = model.findMany.mock.calls[0][0].where as Record<string, unknown>;
      expect(whereArg).not.toHaveProperty('archivedAt');
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

      expect(model.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'c1' },
          data: { city: 'Montréal' },
        }),
      );
      expect(res.city).toBe('Montréal');
    });
  });

  describe('remove', () => {
    it('lance NotFound si absent (sans appeler delete)', async () => {
      model.findUnique.mockResolvedValue(null);
      await expect(service.remove('x')).rejects.toBeInstanceOf(NotFoundException);
      expect(model.delete).not.toHaveBeenCalled();
    });

    it('supprime quand présent et sans relation rattachée', async () => {
      model.findUnique.mockResolvedValue(makeRow());
      invoice.count.mockResolvedValue(0);
      contact.count.mockResolvedValue(0);
      project.count.mockResolvedValue(0);
      model.delete.mockResolvedValue(makeRow());

      await service.remove('c1');

      expect(model.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    });

    it('lance Conflict si des factures sont rattachées (sans appeler delete)', async () => {
      model.findUnique.mockResolvedValue(makeRow());
      invoice.count.mockResolvedValue(2);
      contact.count.mockResolvedValue(0);
      project.count.mockResolvedValue(0);

      await expect(service.remove('c1')).rejects.toBeInstanceOf(ConflictException);
      expect(model.delete).not.toHaveBeenCalled();
    });

    it('lance Conflict si des contacts sont rattachés (sans appeler delete)', async () => {
      model.findUnique.mockResolvedValue(makeRow());
      invoice.count.mockResolvedValue(0);
      contact.count.mockResolvedValue(1);
      project.count.mockResolvedValue(0);

      await expect(service.remove('c1')).rejects.toBeInstanceOf(ConflictException);
      expect(model.delete).not.toHaveBeenCalled();
    });

    it('lance Conflict si des projets sont rattachés (sans appeler delete)', async () => {
      model.findUnique.mockResolvedValue(makeRow());
      invoice.count.mockResolvedValue(0);
      contact.count.mockResolvedValue(0);
      project.count.mockResolvedValue(3);

      await expect(service.remove('c1')).rejects.toBeInstanceOf(ConflictException);
      expect(model.delete).not.toHaveBeenCalled();
    });
  });

  describe('archive', () => {
    it('lance NotFound si absent', async () => {
      model.findUnique.mockResolvedValue(null);
      await expect(service.archive('x')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('appelle update avec archivedAt = une Date et retourne le client mappé', async () => {
      const now = new Date();
      model.findUnique.mockResolvedValue(makeRow());
      model.update.mockResolvedValue(makeRow({ archivedAt: now }));

      const res = await service.archive('c1');

      const updateCall = model.update.mock.calls[0][0] as {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      };
      expect(updateCall.where).toEqual({ id: 'c1' });
      expect(updateCall.data.archivedAt).toBeInstanceOf(Date);
      expect(res.archivedAt).toBe(now.toISOString());
    });
  });

  describe('unarchive', () => {
    it('lance NotFound si absent', async () => {
      model.findUnique.mockResolvedValue(null);
      await expect(service.unarchive('x')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('appelle update avec archivedAt = null et retourne le client mappé', async () => {
      model.findUnique.mockResolvedValue(makeRow({ archivedAt: new Date() }));
      model.update.mockResolvedValue(makeRow({ archivedAt: null }));

      const res = await service.unarchive('c1');

      const updateCall = model.update.mock.calls[0][0] as {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      };
      expect(updateCall.where).toEqual({ id: 'c1' });
      expect(updateCall.data.archivedAt).toBeNull();
      expect(res.archivedAt).toBeNull();
    });
  });
});
