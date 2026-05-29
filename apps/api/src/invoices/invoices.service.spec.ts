import 'reflect-metadata';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import type { PrismaService } from '../prisma/prisma.service';

function makeClientRow() {
  return {
    id: 'cl1',
    companyName: 'Acme',
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
    archivedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function makeInvoiceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv1',
    number: 1,
    status: 'BROUILLON',
    clientId: 'cl1',
    projectId: null,
    billingContactId: null,
    issueDate: new Date('2026-02-01T00:00:00.000Z'),
    dueDate: null,
    notes: null,
    subtotalCents: 10000,
    gstCents: 500,
    qstCents: 998,
    totalCents: 11498,
    createdById: 'u1',
    archivedAt: null,
    createdAt: new Date('2026-02-01T00:00:00.000Z'),
    updatedAt: new Date('2026-02-01T00:00:00.000Z'),
    client: makeClientRow(),
    lines: [
      {
        id: 'l1',
        invoiceId: 'inv1',
        description: 'Service',
        quantity: 1,
        unitPriceCents: 10000,
        amountCents: 10000,
        position: 0,
      },
    ],
    ...overrides,
  };
}

function makePrisma() {
  const invoice = {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    groupBy: jest.fn(),
    aggregate: jest.fn(),
  };
  const client = { findUnique: jest.fn() };
  const c = { invoice, client, $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)) };
  return { prisma: { client: c } as unknown as PrismaService, invoice, client };
}

describe('InvoicesService', () => {
  it('stats agrège les montants et compte par statut', async () => {
    const { prisma, invoice } = makePrisma();
    invoice.count
      .mockResolvedValueOnce(0) // BROUILLON
      .mockResolvedValueOnce(1) // ENVOYEE
      .mockResolvedValueOnce(2) // PAYEE
      .mockResolvedValueOnce(0); // ANNULEE
    invoice.aggregate
      .mockResolvedValueOnce({ _sum: { totalCents: 11498 } })
      .mockResolvedValueOnce({ _sum: { totalCents: 5000 } })
      .mockResolvedValueOnce({ _sum: { totalCents: 5000 }, _count: { _all: 1 } })
      .mockResolvedValueOnce({ _sum: { totalCents: 16498 } });
    invoice.findMany.mockResolvedValue([makeInvoiceRow()]);

    const res = await new InvoicesService(prisma).stats();

    expect(res.paidCents).toBe(11498);
    expect(res.outstandingCents).toBe(5000);
    expect(res.overdueCents).toBe(5000);
    expect(res.overdueCount).toBe(1);
    expect(res.currentMonthCents).toBe(16498);
    expect(res.countByStatus.PAYEE).toBe(2);
    expect(res.countByStatus.ENVOYEE).toBe(1);
    expect(res.countByStatus.BROUILLON).toBe(0);
    expect(res.recent).toHaveLength(1);
  });

  it('create calcule les totaux côté serveur et crée les lignes', async () => {
    const { prisma, invoice, client } = makePrisma();
    client.findUnique.mockResolvedValue(makeClientRow());
    invoice.create.mockResolvedValue(makeInvoiceRow());

    const res = await new InvoicesService(prisma).create(
      { clientId: 'cl1', lines: [{ description: 'Service', quantity: 1, unitPriceCents: 10000 }] },
      'u1',
    );

    const arg = invoice.create.mock.calls[0][0];
    expect(arg.data.subtotalCents).toBe(10000);
    expect(arg.data.gstCents).toBe(500);
    expect(arg.data.qstCents).toBe(998);
    expect(arg.data.totalCents).toBe(11498);
    expect(arg.data.lines.create[0].amountCents).toBe(10000);
    expect(res.totalCents).toBe(11498);
    expect(res.lines).toHaveLength(1);
    expect(res.client?.companyName).toBe('Acme');
  });

  it('create lève NotFound si le client est absent', async () => {
    const { prisma, invoice, client } = makePrisma();
    client.findUnique.mockResolvedValue(null);
    await expect(
      new InvoicesService(prisma).create(
        { clientId: 'x', lines: [{ description: 'a', quantity: 1, unitPriceCents: 1 }] },
        'u1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(invoice.create).not.toHaveBeenCalled();
  });

  it('findById lève NotFound si absente', async () => {
    const { prisma, invoice } = makePrisma();
    invoice.findUnique.mockResolvedValue(null);
    await expect(new InvoicesService(prisma).findById('x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findById mappe la facture (dates ISO, lignes, client)', async () => {
    const { prisma, invoice } = makePrisma();
    invoice.findUnique.mockResolvedValue(makeInvoiceRow());
    const res = await new InvoicesService(prisma).findById('inv1');
    expect(res.issueDate).toBe('2026-02-01T00:00:00.000Z');
    expect(res.lines[0].description).toBe('Service');
    expect(res.client?.companyName).toBe('Acme');
  });

  it('list retourne une page mappée', async () => {
    const { prisma, invoice } = makePrisma();
    invoice.findMany.mockResolvedValue([makeInvoiceRow()]);
    invoice.count.mockResolvedValue(1);
    const res = await new InvoicesService(prisma).list({});
    expect(res.total).toBe(1);
    expect(res.items[0].number).toBe(1);
  });

  it('updateStatus met à jour après vérification d’existence', async () => {
    const { prisma, invoice } = makePrisma();
    invoice.findUnique.mockResolvedValue(makeInvoiceRow());
    invoice.update.mockResolvedValue(makeInvoiceRow({ status: 'ENVOYEE' }));
    const res = await new InvoicesService(prisma).updateStatus('inv1', 'ENVOYEE');
    expect(invoice.update).toHaveBeenCalled();
    expect(res.status).toBe('ENVOYEE');
  });

  it('remove supprime quand la facture est BROUILLON', async () => {
    const { prisma, invoice } = makePrisma();
    invoice.findUnique.mockResolvedValue(makeInvoiceRow({ status: 'BROUILLON' }));
    invoice.delete.mockResolvedValue(makeInvoiceRow());
    await new InvoicesService(prisma).remove('inv1');
    expect(invoice.delete).toHaveBeenCalledWith({ where: { id: 'inv1' } });
  });

  it("remove lève ConflictException si la facture n'est pas BROUILLON", async () => {
    const { prisma, invoice } = makePrisma();
    invoice.findUnique.mockResolvedValue(makeInvoiceRow({ status: 'ENVOYEE' }));
    await expect(new InvoicesService(prisma).remove('inv1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(invoice.delete).not.toHaveBeenCalled();
  });

  it('archive positionne archivedAt et retourne la facture', async () => {
    const { prisma, invoice } = makePrisma();
    const archived = makeInvoiceRow({ archivedAt: new Date('2026-03-01T00:00:00.000Z') });
    invoice.findUnique.mockResolvedValue(makeInvoiceRow());
    invoice.update.mockResolvedValue(archived);
    const res = await new InvoicesService(prisma).archive('inv1');
    const call = invoice.update.mock.calls[0][0];
    expect(call.data.archivedAt).toBeInstanceOf(Date);
    expect(res.archivedAt).toBe('2026-03-01T00:00:00.000Z');
  });

  it('unarchive efface archivedAt et retourne la facture', async () => {
    const { prisma, invoice } = makePrisma();
    invoice.findUnique.mockResolvedValue(makeInvoiceRow({ archivedAt: new Date() }));
    invoice.update.mockResolvedValue(makeInvoiceRow({ archivedAt: null }));
    const res = await new InvoicesService(prisma).unarchive('inv1');
    const call = invoice.update.mock.calls[0][0];
    expect(call.data.archivedAt).toBeNull();
    expect(res.archivedAt).toBeNull();
  });

  it('list filtre archivedAt: null par défaut', async () => {
    const { prisma, invoice } = makePrisma();
    invoice.findMany.mockResolvedValue([makeInvoiceRow()]);
    invoice.count.mockResolvedValue(1);
    await new InvoicesService(prisma).list({});
    const [findManyCall, countCall] = invoice.findMany.mock.calls[0][0]
      ? [invoice.findMany.mock.calls[0][0], invoice.count.mock.calls[0][0]]
      : [null, null];
    expect(findManyCall?.where).toEqual({ archivedAt: null });
    expect(countCall?.where).toEqual({ archivedAt: null });
  });

  it('list omet le filtre archivedAt quand includeArchived est vrai', async () => {
    const { prisma, invoice } = makePrisma();
    invoice.findMany.mockResolvedValue([makeInvoiceRow()]);
    invoice.count.mockResolvedValue(1);
    await new InvoicesService(prisma).list({ includeArchived: true });
    const findManyArg = invoice.findMany.mock.calls[0][0];
    expect(findManyArg?.where?.archivedAt).toBeUndefined();
  });

  it('list filtre par statut', async () => {
    const { prisma, invoice } = makePrisma();
    invoice.findMany.mockResolvedValue([]);
    invoice.count.mockResolvedValue(0);
    await new InvoicesService(prisma).list({ status: 'ENVOYEE' });
    expect(invoice.findMany.mock.calls[0][0]?.where).toMatchObject({ status: 'ENVOYEE' });
  });

  it('list overdue = envoyées dont l’échéance est dépassée', async () => {
    const { prisma, invoice } = makePrisma();
    invoice.findMany.mockResolvedValue([]);
    invoice.count.mockResolvedValue(0);
    await new InvoicesService(prisma).list({ overdue: true });
    const where = invoice.findMany.mock.calls[0][0]?.where as {
      status?: string;
      dueDate?: { lt?: Date };
    };
    expect(where.status).toBe('ENVOYEE');
    expect(where.dueDate?.lt).toBeInstanceOf(Date);
  });

  it('toInvoice: deletable est vrai pour BROUILLON, faux sinon', async () => {
    const { prisma, invoice } = makePrisma();
    invoice.findUnique.mockResolvedValue(makeInvoiceRow({ status: 'BROUILLON' }));
    const brouillon = await new InvoicesService(prisma).findById('inv1');
    expect(brouillon.deletable).toBe(true);

    invoice.findUnique.mockResolvedValue(makeInvoiceRow({ status: 'ENVOYEE' }));
    const envoyee = await new InvoicesService(prisma).findById('inv1');
    expect(envoyee.deletable).toBe(false);
  });

  it('stats: recent porte archivedAt: null, les agrégats non', async () => {
    const { prisma, invoice } = makePrisma();
    invoice.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0);
    invoice.aggregate
      .mockResolvedValueOnce({ _sum: { totalCents: 0 } })
      .mockResolvedValueOnce({ _sum: { totalCents: 0 } })
      .mockResolvedValueOnce({ _sum: { totalCents: 0 }, _count: { _all: 0 } })
      .mockResolvedValueOnce({ _sum: { totalCents: 0 } });
    invoice.findMany.mockResolvedValue([]);

    await new InvoicesService(prisma).stats();

    const recentArg = invoice.findMany.mock.calls[0][0];
    expect(recentArg.where).toEqual({ archivedAt: null });

    // Les agrégats count/aggregate ne doivent pas filtrer archivedAt
    const payeeAggCall = invoice.aggregate.mock.calls[0][0];
    expect(payeeAggCall.where).not.toHaveProperty('archivedAt');
  });
});
