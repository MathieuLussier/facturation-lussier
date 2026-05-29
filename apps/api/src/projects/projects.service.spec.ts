import 'reflect-metadata';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import type { PrismaService } from '../prisma/prisma.service';

function makeContact(overrides: Record<string, unknown> = {}) {
  return {
    id: 'contact1',
    companyId: 'company1',
    name: 'Jean Dupont',
    email: null,
    phone: null,
    title: null,
    isBillingContact: true,
    notes: null,
    archivedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  };
}

function makeProjectRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    companyId: 'company1',
    name: 'Projet Alpha',
    status: 'ACTIF',
    notes: null,
    archivedAt: null,
    billingContacts: [makeContact()],
    _count: { invoices: 0 },
    createdAt: new Date('2026-02-01T00:00:00.000Z'),
    updatedAt: new Date('2026-02-02T00:00:00.000Z'),
    ...overrides,
  };
}

function makePrisma() {
  const projectModel = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const clientModel = {
    findUnique: jest.fn(),
  };
  const contactModel = {
    findMany: jest.fn(),
  };
  const invoiceModel = {
    count: jest.fn().mockResolvedValue(0),
  };
  const prismaClient = {
    project: projectModel,
    client: clientModel,
    contact: contactModel,
    invoice: invoiceModel,
  };
  return {
    prisma: { client: prismaClient } as unknown as PrismaService,
    projectModel,
    clientModel,
    contactModel,
    invoiceModel,
  };
}

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectModel: ReturnType<typeof makePrisma>['projectModel'];
  let clientModel: ReturnType<typeof makePrisma>['clientModel'];
  let contactModel: ReturnType<typeof makePrisma>['contactModel'];
  let invoiceModel: ReturnType<typeof makePrisma>['invoiceModel'];

  beforeEach(() => {
    const p = makePrisma();
    projectModel = p.projectModel;
    clientModel = p.clientModel;
    contactModel = p.contactModel;
    invoiceModel = p.invoiceModel;
    service = new ProjectsService(p.prisma);
  });

  describe('list', () => {
    it('retourne tous les projets mappés sans filtre', async () => {
      projectModel.findMany.mockResolvedValue([makeProjectRow()]);

      const res = await service.list();

      expect(projectModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { archivedAt: null },
          include: expect.objectContaining({ billingContacts: true }),
        }),
      );
      expect(res).toHaveLength(1);
      expect(res[0]).toMatchObject({ id: 'p1', name: 'Projet Alpha', status: 'ACTIF' });
      expect(res[0].billingContacts).toHaveLength(1);
      expect(res[0].createdAt).toBe('2026-02-01T00:00:00.000Z');
    });

    it('filtre par companyId si fourni', async () => {
      projectModel.findMany.mockResolvedValue([]);

      await service.list('company1');

      expect(projectModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ companyId: 'company1' }) }),
      );
    });

    it('ajoute archivedAt: null au where par défaut', async () => {
      projectModel.findMany.mockResolvedValue([]);

      await service.list();

      expect(projectModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ archivedAt: null }) }),
      );
    });

    it('omet archivedAt du where si includeArchived=true', async () => {
      projectModel.findMany.mockResolvedValue([]);

      await service.list(undefined, true);

      const call = projectModel.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
      expect(call.where).not.toHaveProperty('archivedAt');
    });

    it('inclut _count dans le include', async () => {
      projectModel.findMany.mockResolvedValue([]);

      await service.list();

      expect(projectModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({ _count: { select: { invoices: true } } }),
        }),
      );
    });

    it('expose deletable calculé depuis _count', async () => {
      projectModel.findMany.mockResolvedValue([makeProjectRow({ _count: { invoices: 0 } })]);

      const res = await service.list();

      expect(res[0].deletable).toBe(true);
    });

    it('expose deletable=false si le projet a des factures', async () => {
      projectModel.findMany.mockResolvedValue([makeProjectRow({ _count: { invoices: 3 } })]);

      const res = await service.list();

      expect(res[0].deletable).toBe(false);
    });
  });

  describe('findById', () => {
    it('retourne le projet mappé avec ses billingContacts', async () => {
      projectModel.findUnique.mockResolvedValue(makeProjectRow());

      const res = await service.findById('p1');

      expect(projectModel.findUnique).toHaveBeenCalledWith({
        where: { id: 'p1' },
        include: {
          billingContacts: true,
          _count: { select: { invoices: true } },
        },
      });
      expect(res).toMatchObject({ id: 'p1' });
      expect(res.billingContacts[0]).toMatchObject({ id: 'contact1', name: 'Jean Dupont' });
    });

    it('lance NotFoundException si absent', async () => {
      projectModel.findUnique.mockResolvedValue(null);

      await expect(service.findById('inexistant')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('expose deletable depuis _count', async () => {
      projectModel.findUnique.mockResolvedValue(makeProjectRow({ _count: { invoices: 2 } }));

      const res = await service.findById('p1');

      expect(res.deletable).toBe(false);
    });
  });

  describe('create', () => {
    it('lance NotFoundException si companyId inexistant', async () => {
      clientModel.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ companyId: 'bad', name: 'Projet', billingContactIds: [] }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(projectModel.create).not.toHaveBeenCalled();
    });

    it('crée un projet sans contacts de facturation', async () => {
      clientModel.findUnique.mockResolvedValue({ id: 'company1' });
      projectModel.create.mockResolvedValue(makeProjectRow({ billingContacts: [] }));

      const res = await service.create({
        companyId: 'company1',
        name: 'Projet Alpha',
        billingContactIds: [],
      });

      expect(projectModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ companyId: 'company1', name: 'Projet Alpha' }),
          include: expect.objectContaining({ billingContacts: true }),
        }),
      );
      expect(res.name).toBe('Projet Alpha');
    });

    it('relie les billingContacts valides', async () => {
      clientModel.findUnique.mockResolvedValue({ id: 'company1' });
      contactModel.findMany.mockResolvedValue([makeContact()]);
      projectModel.create.mockResolvedValue(makeProjectRow());

      await service.create({
        companyId: 'company1',
        name: 'Projet Alpha',
        billingContactIds: ['contact1'],
      });

      expect(projectModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            billingContacts: { connect: [{ id: 'contact1' }] },
          }),
        }),
      );
    });

    it('lance BadRequestException si le contact est introuvable', async () => {
      clientModel.findUnique.mockResolvedValue({ id: 'company1' });
      contactModel.findMany.mockResolvedValue([]);

      await expect(
        service.create({ companyId: 'company1', name: 'Projet', billingContactIds: ['bad'] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("lance BadRequestException si le contact n'appartient pas à l'entreprise", async () => {
      clientModel.findUnique.mockResolvedValue({ id: 'company1' });
      contactModel.findMany.mockResolvedValue([makeContact({ companyId: 'autre' })]);

      await expect(
        service.create({
          companyId: 'company1',
          name: 'Projet',
          billingContactIds: ['contact1'],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("lance BadRequestException si le contact n'est pas isBillingContact", async () => {
      clientModel.findUnique.mockResolvedValue({ id: 'company1' });
      contactModel.findMany.mockResolvedValue([makeContact({ isBillingContact: false })]);

      await expect(
        service.create({
          companyId: 'company1',
          name: 'Projet',
          billingContactIds: ['contact1'],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('update', () => {
    it('lance NotFoundException si le projet est absent', async () => {
      projectModel.findUnique.mockResolvedValue(null);

      await expect(service.update('inexistant', { name: 'Nouveau' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(projectModel.update).not.toHaveBeenCalled();
    });

    it('met à jour les champs scalaires', async () => {
      projectModel.findUnique.mockResolvedValue(makeProjectRow());
      projectModel.update.mockResolvedValue(makeProjectRow({ name: 'Nouveau', status: 'TERMINE' }));

      const res = await service.update('p1', { name: 'Nouveau', status: 'TERMINE' });

      expect(projectModel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p1' },
          data: expect.objectContaining({ name: 'Nouveau', status: 'TERMINE' }),
          include: expect.objectContaining({ billingContacts: true }),
        }),
      );
      expect(res.name).toBe('Nouveau');
      expect(res.status).toBe('TERMINE');
    });

    it('utilise { set: ... } pour remplacer les billingContacts', async () => {
      projectModel.findUnique.mockResolvedValue(makeProjectRow());
      contactModel.findMany.mockResolvedValue([makeContact()]);
      projectModel.update.mockResolvedValue(makeProjectRow());

      await service.update('p1', { billingContactIds: ['contact1'] });

      expect(projectModel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            billingContacts: { set: [{ id: 'contact1' }] },
          }),
        }),
      );
    });

    it('valide les billingContacts lors de la mise à jour', async () => {
      projectModel.findUnique.mockResolvedValue(makeProjectRow());
      contactModel.findMany.mockResolvedValue([makeContact({ isBillingContact: false })]);

      await expect(
        service.update('p1', { billingContactIds: ['contact1'] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('remove', () => {
    it('lance NotFoundException si absent (sans appeler delete)', async () => {
      invoiceModel.count.mockResolvedValue(0);
      projectModel.findUnique.mockResolvedValue(null);

      await expect(service.remove('inexistant')).rejects.toBeInstanceOf(NotFoundException);
      expect(projectModel.delete).not.toHaveBeenCalled();
    });

    it('supprime le projet quand présent et sans factures', async () => {
      invoiceModel.count.mockResolvedValue(0);
      projectModel.findUnique.mockResolvedValue(makeProjectRow());
      projectModel.delete.mockResolvedValue(makeProjectRow());

      await service.remove('p1');

      expect(projectModel.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    });

    it('lance ConflictException si le projet a des factures rattachées', async () => {
      invoiceModel.count.mockResolvedValue(3);

      await expect(service.remove('p1')).rejects.toBeInstanceOf(ConflictException);
      expect(projectModel.delete).not.toHaveBeenCalled();
    });

    it('inclut le nombre de factures dans le message ConflictException', async () => {
      invoiceModel.count.mockResolvedValue(2);

      await expect(service.remove('p1')).rejects.toThrow('2 facture(s)');
    });
  });

  describe('archive', () => {
    it('définit archivedAt sur le projet', async () => {
      projectModel.findUnique.mockResolvedValue(makeProjectRow());
      const archivedRow = makeProjectRow({ archivedAt: new Date('2026-05-29T10:00:00.000Z') });
      projectModel.update.mockResolvedValue(archivedRow);

      const res = await service.archive('p1');

      expect(projectModel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p1' },
          data: expect.objectContaining({ archivedAt: expect.any(Date) }),
        }),
      );
      expect(res.archivedAt).toBe('2026-05-29T10:00:00.000Z');
    });

    it('lance NotFoundException si le projet est absent', async () => {
      projectModel.findUnique.mockResolvedValue(null);

      await expect(service.archive('inexistant')).rejects.toBeInstanceOf(NotFoundException);
      expect(projectModel.update).not.toHaveBeenCalled();
    });
  });

  describe('unarchive', () => {
    it('remet archivedAt à null sur le projet', async () => {
      projectModel.findUnique.mockResolvedValue(
        makeProjectRow({ archivedAt: new Date('2026-05-01T00:00:00.000Z') }),
      );
      projectModel.update.mockResolvedValue(makeProjectRow({ archivedAt: null }));

      const res = await service.unarchive('p1');

      expect(projectModel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p1' },
          data: expect.objectContaining({ archivedAt: null }),
        }),
      );
      expect(res.archivedAt).toBeNull();
    });

    it('lance NotFoundException si le projet est absent', async () => {
      projectModel.findUnique.mockResolvedValue(null);

      await expect(service.unarchive('inexistant')).rejects.toBeInstanceOf(NotFoundException);
      expect(projectModel.update).not.toHaveBeenCalled();
    });
  });
});
