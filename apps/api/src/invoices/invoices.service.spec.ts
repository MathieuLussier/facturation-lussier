import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
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
    issueDate: new Date('2026-02-01T00:00:00.000Z'),
    dueDate: null,
    notes: null,
    subtotalCents: 10000,
    gstCents: 500,
    qstCents: 998,
    totalCents: 11498,
    createdById: 'u1',
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

  it('remove supprime après vérification', async () => {
    const { prisma, invoice } = makePrisma();
    invoice.findUnique.mockResolvedValue(makeInvoiceRow());
    invoice.delete.mockResolvedValue(makeInvoiceRow());
    await new InvoicesService(prisma).remove('inv1');
    expect(invoice.delete).toHaveBeenCalledWith({ where: { id: 'inv1' } });
  });
});
