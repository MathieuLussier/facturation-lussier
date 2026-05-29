import 'reflect-metadata';
import { ConflictException, NotFoundException } from '@nestjs/common';
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
    archivedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    _count: { invoices: 0, projects: 0 },
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
  const invoiceModel = {
    count: jest.fn().mockResolvedValue(0),
  };
  const projectModel = {
    count: jest.fn().mockResolvedValue(0),
  };
  const client = {
    contact: contactModel,
    client: clientModel,
    invoice: invoiceModel,
    project: projectModel,
  };
  return {
    prisma: { client } as unknown as PrismaService,
    contactModel,
    clientModel,
    invoiceModel,
    projectModel,
  };
}

describe('ContactsService', () => {
  let service: ContactsService;
  let contactModel: ReturnType<typeof makePrisma>['contactModel'];
  let clientModel: ReturnType<typeof makePrisma>['clientModel'];
  let invoiceModel: ReturnType<typeof makePrisma>['invoiceModel'];
  let projectModel: ReturnType<typeof makePrisma>['projectModel'];

  beforeEach(() => {
    const p = makePrisma();
    contactModel = p.contactModel;
    clientModel = p.clientModel;
    invoiceModel = p.invoiceModel;
    projectModel = p.projectModel;
    service = new ContactsService(p.prisma);
  });

  describe('list', () => {
    it('retourne les contacts triés par nom pour un companyId donné', async () => {
      contactModel.findMany.mockResolvedValue([makeRow()]);

      const res = await service.list('co1');

      expect(contactModel.findMany).toHaveBeenCalledWith({
        where: { companyId: 'co1', archivedAt: null },
        orderBy: { name: 'asc' },
        include: { _count: { select: { invoices: true, projects: true } } },
      });
      expect(res).toHaveLength(1);
      expect(res[0]).toMatchObject({ id: 'ct1', companyId: 'co1', name: 'Alice Martin' });
      expect(res[0].createdAt).toBe('2026-01-01T00:00:00.000Z');
      expect(res[0].archivedAt).toBeNull();
    });

    it('retourne un tableau vide si aucun contact', async () => {
      contactModel.findMany.mockResolvedValue([]);

      const res = await service.list('co1');

      expect(res).toEqual([]);
    });

    it("n'ajoute pas archivedAt:null au filtre quand includeArchived=true", async () => {
      contactModel.findMany.mockResolvedValue([]);

      await service.list('co1', true);

      expect(contactModel.findMany).toHaveBeenCalledWith({
        where: { companyId: 'co1' },
        orderBy: { name: 'asc' },
        include: { _count: { select: { invoices: true, projects: true } } },
      });
    });

    it('calcule deletable depuis _count', async () => {
      contactModel.findMany.mockResolvedValue([makeRow({ _count: { invoices: 0, projects: 0 } })]);
      const res = await service.list('co1');
      expect(res[0].deletable).toBe(true);
    });

    it('deletable=false si références présentes', async () => {
      contactModel.findMany.mockResolvedValue([makeRow({ _count: { invoices: 1, projects: 0 } })]);
      const res = await service.list('co1');
      expect(res[0].deletable).toBe(false);
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

    it('inclut _count dans la requête', async () => {
      contactModel.findUnique.mockResolvedValue(makeRow());

      await service.findById('ct1');

      expect(contactModel.findUnique).toHaveBeenCalledWith({
        where: { id: 'ct1' },
        include: { _count: { select: { invoices: true, projects: true } } },
      });
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

    it('supprime quand présent et aucune référence', async () => {
      contactModel.findUnique.mockResolvedValue(makeRow());
      contactModel.delete.mockResolvedValue(makeRow());
      invoiceModel.count.mockResolvedValue(0);
      projectModel.count.mockResolvedValue(0);

      await service.remove('ct1');

      expect(contactModel.delete).toHaveBeenCalledWith({ where: { id: 'ct1' } });
    });

    it('lance ConflictException si référencé par des factures', async () => {
      contactModel.findUnique.mockResolvedValue(makeRow());
      invoiceModel.count.mockResolvedValue(2);
      projectModel.count.mockResolvedValue(0);

      await expect(service.remove('ct1')).rejects.toBeInstanceOf(ConflictException);
      expect(contactModel.delete).not.toHaveBeenCalled();
    });

    it('lance ConflictException si référencé par des projets', async () => {
      contactModel.findUnique.mockResolvedValue(makeRow());
      invoiceModel.count.mockResolvedValue(0);
      projectModel.count.mockResolvedValue(1);

      await expect(service.remove('ct1')).rejects.toBeInstanceOf(ConflictException);
      expect(contactModel.delete).not.toHaveBeenCalled();
    });

    it('le message ConflictException mentionne les comptes', async () => {
      contactModel.findUnique.mockResolvedValue(makeRow());
      invoiceModel.count.mockResolvedValue(3);
      projectModel.count.mockResolvedValue(2);

      const err = await service.remove('ct1').catch((e) => e);
      expect(err).toBeInstanceOf(ConflictException);
      expect((err as ConflictException).message).toContain('3 facture(s)');
      expect((err as ConflictException).message).toContain('2 projet(s)');
    });
  });

  describe('archive', () => {
    it('lance NotFound si absent', async () => {
      contactModel.findUnique.mockResolvedValue(null);

      await expect(service.archive('x')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('met archivedAt à une date', async () => {
      const archived = makeRow({ archivedAt: new Date('2026-05-29T10:00:00.000Z') });
      contactModel.findUnique.mockResolvedValue(makeRow());
      contactModel.update.mockResolvedValue(archived);

      const res = await service.archive('ct1');

      expect(contactModel.update).toHaveBeenCalledWith({
        where: { id: 'ct1' },
        data: { archivedAt: expect.any(Date) },
        include: { _count: { select: { invoices: true, projects: true } } },
      });
      expect(res.archivedAt).toBe('2026-05-29T10:00:00.000Z');
    });
  });

  describe('unarchive', () => {
    it('lance NotFound si absent', async () => {
      contactModel.findUnique.mockResolvedValue(null);

      await expect(service.unarchive('x')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('remet archivedAt à null', async () => {
      contactModel.findUnique.mockResolvedValue(makeRow({ archivedAt: new Date() }));
      contactModel.update.mockResolvedValue(makeRow({ archivedAt: null }));

      const res = await service.unarchive('ct1');

      expect(contactModel.update).toHaveBeenCalledWith({
        where: { id: 'ct1' },
        data: { archivedAt: null },
        include: { _count: { select: { invoices: true, projects: true } } },
      });
      expect(res.archivedAt).toBeNull();
    });
  });
});
