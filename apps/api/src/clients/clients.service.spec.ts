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
  const queryRaw = jest.fn();
  const client = {
    client: model,
    invoice,
    contact,
    project,
    $queryRaw: queryRaw,
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  return { prisma: { client } as unknown as PrismaService, model, invoice, contact, project, queryRaw };
}

describe('ClientsService', () => {
  let service: ClientsService;
  let model: ReturnType<typeof makePrisma>['model'];
  let invoice: ReturnType<typeof makePrisma>['invoice'];
  let contact: ReturnType<typeof makePrisma>['contact'];
  let project: ReturnType<typeof makePrisma>['project'];
  let queryRaw: ReturnType<typeof makePrisma>['queryRaw'];

  beforeEach(() => {
    const p = makePrisma();
    model = p.model;
    invoice = p.invoice;
    contact = p.contact;
    project = p.project;
    queryRaw = p.queryRaw;
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

    it('liste uniquement les archivés quand archivedOnly est true', async () => {
      model.findMany.mockResolvedValue([]);
      model.count.mockResolvedValue(0);

      await service.list({ archivedOnly: true });

      const whereArg = model.findMany.mock.calls[0][0].where as Record<string, unknown>;
      expect(whereArg.archivedAt).toEqual({ not: null });
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
    // La fusion/tri/pagination se font en SQL (UNION) ; le service mappe les
    // lignes renvoyées et le total. La correction du SQL lui-même est couverte
    // par une validation live contre Postgres (hors test unitaire).
    function sqlOf(call: unknown[]): string {
      return String((call[0] as { sql: string }).sql);
    }

    it('mappe les lignes de l’UNION SQL et le total', async () => {
      queryRaw
        .mockResolvedValueOnce([
          { id: 'c1', name: 'Acme Inc', kind: 'company', subtitle: 'Québec', companyId: null, archivedAt: null },
          { id: 'ct1', name: 'Bob Roy', kind: 'contact', subtitle: 'Acme Inc', companyId: 'c1', archivedAt: null },
          { id: 'c2', name: 'Zoé Bernard', kind: 'individual', subtitle: null, companyId: null, archivedAt: null },
        ])
        .mockResolvedValueOnce([{ count: 3n }]);

      const res = await service.directory({});

      expect(res.total).toBe(3);
      expect(res.items.map((e) => e.name)).toEqual(['Acme Inc', 'Bob Roy', 'Zoé Bernard']);
      const byName = Object.fromEntries(res.items.map((e) => [e.name, e]));
      expect(byName['Acme Inc'].kind).toBe('company');
      expect(byName['Zoé Bernard'].kind).toBe('individual');
      expect(byName['Bob Roy'].kind).toBe('contact');
      expect(byName['Bob Roy'].companyId).toBe('c1');
      expect(byName['Bob Roy'].subtitle).toBe('Acme Inc');
      expect(queryRaw).toHaveBeenCalledTimes(2); // lignes + count
    });

    it('applique la pagination DB (LIMIT/OFFSET) et retourne page/pageSize', async () => {
      queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ count: 0n }]);
      const res = await service.directory({ page: 3, pageSize: 10 });
      expect(res).toMatchObject({ page: 3, pageSize: 10, total: 0, items: [] });
      // Les paramètres LIMIT/OFFSET sont bien passés à la requête de lignes.
      const values = (queryRaw.mock.calls[0][0] as { values: unknown[] }).values;
      expect(values).toEqual(expect.arrayContaining([10, 20])); // LIMIT 10, OFFSET (3-1)*10
    });

    it('filtre par archivage dans le SQL (actifs par défaut, archivés sinon)', async () => {
      queryRaw.mockResolvedValue([]);

      await service.directory({});
      expect(sqlOf(queryRaw.mock.calls[0])).toContain('IS NULL');
      expect(sqlOf(queryRaw.mock.calls[0])).not.toContain('IS NOT NULL');

      queryRaw.mockClear();
      await service.directory({ archivedOnly: true });
      expect(sqlOf(queryRaw.mock.calls[0])).toContain('IS NOT NULL');
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
