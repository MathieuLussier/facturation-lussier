import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { InvoicePdfService } from './invoice-pdf.service';
import type { IssuerService } from '../issuer/issuer.service';
import type { MailService } from '../mail/mail.service';

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
    reference: null,
    sequenceYear: null,
    sequenceNo: null,
    status: 'BROUILLON',
    clientId: 'cl1',
    projectId: null,
    billingContactId: null,
    issueDate: new Date('2026-02-01T00:00:00.000Z'),
    dueDate: null,
    notes: null,
    paidAt: null,
    paymentMethod: null,
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
  const invoiceLine = { deleteMany: jest.fn() };
  const client = { findUnique: jest.fn() };
  const project = { findUnique: jest.fn() };
  const contact = { findUnique: jest.fn() };
  const executeRaw = jest.fn().mockResolvedValue(1);
  const queryRaw = jest.fn().mockResolvedValue([{ lastNumber: 1 }]);
  // $transaction supporte les deux formes : tableau (Promise.all) et callback interactif.
  const c: Record<string, unknown> = {
    invoice,
    invoiceLine,
    client,
    project,
    contact,
    $executeRaw: executeRaw,
    $queryRaw: queryRaw,
  };
  c.$transaction = jest.fn((arg: unknown) =>
    typeof arg === 'function'
      ? (arg as (tx: unknown) => Promise<unknown>)(c)
      : Promise.all(arg as Promise<unknown>[]),
  );
  return {
    prisma: { client: c } as unknown as PrismaService,
    invoice,
    invoiceLine,
    client,
    project,
    contact,
    executeRaw,
    queryRaw,
  };
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

  // --- Édition de facture ------------------------------------------------

  it('update lève ConflictException si la facture est PAYEE', async () => {
    const { prisma, invoice, invoiceLine } = makePrisma();
    invoice.findUnique.mockResolvedValue(makeInvoiceRow({ status: 'PAYEE', reference: 'FAC-2026-0001' }));
    await expect(
      new InvoicesService(prisma).update('inv1', {
        lines: [{ description: 'a', quantity: 1, unitPriceCents: 1 }],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(invoiceLine.deleteMany).not.toHaveBeenCalled();
  });

  it('update lève ConflictException si la facture est ANNULEE', async () => {
    const { prisma, invoice } = makePrisma();
    invoice.findUnique.mockResolvedValue(makeInvoiceRow({ status: 'ANNULEE', reference: 'FAC-2026-0002' }));
    await expect(
      new InvoicesService(prisma).update('inv1', {
        lines: [{ description: 'a', quantity: 1, unitPriceCents: 1 }],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('update recalcule les totaux et remplace les lignes (BROUILLON)', async () => {
    const { prisma, invoice, invoiceLine, client } = makePrisma();
    invoice.findUnique.mockResolvedValue(makeInvoiceRow({ status: 'BROUILLON' }));
    client.findUnique.mockResolvedValue(makeClientRow());
    invoice.update.mockResolvedValue(makeInvoiceRow({ subtotalCents: 20000 }));

    await new InvoicesService(prisma).update('inv1', {
      lines: [{ description: 'Service', quantity: 2, unitPriceCents: 10000 }],
    });

    expect(invoiceLine.deleteMany).toHaveBeenCalledWith({ where: { invoiceId: 'inv1' } });
    const arg = invoice.update.mock.calls[0][0];
    expect(arg.data.subtotalCents).toBe(20000);
    expect(arg.data.gstCents).toBe(1000);
    expect(arg.data.qstCents).toBe(1995);
    expect(arg.data.totalCents).toBe(22995);
    expect(arg.data.lines.create[0].amountCents).toBe(20000);
  });

  it('update est autorisé pour une facture ENVOYEE', async () => {
    const { prisma, invoice, client } = makePrisma();
    invoice.findUnique.mockResolvedValue(makeInvoiceRow({ status: 'ENVOYEE', reference: 'FAC-2026-0003' }));
    client.findUnique.mockResolvedValue(makeClientRow());
    invoice.update.mockResolvedValue(makeInvoiceRow({ status: 'ENVOYEE', reference: 'FAC-2026-0003' }));
    const res = await new InvoicesService(prisma).update('inv1', {
      lines: [{ description: 'a', quantity: 1, unitPriceCents: 5000 }],
    });
    expect(res.status).toBe('ENVOYEE');
  });

  // --- Paiement (« marquer payée ») --------------------------------------

  it('updateStatus PAYEE exige un mode de paiement', async () => {
    const { prisma, invoice } = makePrisma();
    invoice.findUnique.mockResolvedValue(makeInvoiceRow({ status: 'ENVOYEE', reference: 'FAC-2026-0001' }));
    await expect(
      new InvoicesService(prisma).updateStatus('inv1', 'PAYEE'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(invoice.update).not.toHaveBeenCalled();
  });

  it('updateStatus PAYEE enregistre paidAt + mode', async () => {
    const { prisma, invoice } = makePrisma();
    invoice.findUnique.mockResolvedValue(makeInvoiceRow({ status: 'ENVOYEE', reference: 'FAC-2026-0001' }));
    invoice.update.mockResolvedValue(
      makeInvoiceRow({ status: 'PAYEE', reference: 'FAC-2026-0001', paidAt: new Date('2026-03-01T00:00:00.000Z'), paymentMethod: 'CHEQUE' }),
    );
    const res = await new InvoicesService(prisma).updateStatus('inv1', 'PAYEE', '2026-03-01', 'CHEQUE');
    const arg = invoice.update.mock.calls[0][0];
    expect(arg.data.paymentMethod).toBe('CHEQUE');
    expect(arg.data.paidAt).toBeInstanceOf(Date);
    expect(res.paymentMethod).toBe('CHEQUE');
  });

  it('updateStatus efface paidAt + mode quand on quitte PAYEE', async () => {
    const { prisma, invoice } = makePrisma();
    invoice.findUnique.mockResolvedValue(
      makeInvoiceRow({ status: 'PAYEE', reference: 'FAC-2026-0001', paidAt: new Date(), paymentMethod: 'CHEQUE' }),
    );
    invoice.update.mockResolvedValue(makeInvoiceRow({ status: 'ENVOYEE', reference: 'FAC-2026-0001' }));
    await new InvoicesService(prisma).updateStatus('inv1', 'ENVOYEE');
    const arg = invoice.update.mock.calls[0][0];
    expect(arg.data.paidAt).toBeNull();
    expect(arg.data.paymentMethod).toBeNull();
  });

  // --- Numérotation sans trou --------------------------------------------

  it('updateStatus BROUILLON→ENVOYEE assigne une référence FAC-AAAA-NNNN', async () => {
    const { prisma, invoice, queryRaw } = makePrisma();
    invoice.findUnique.mockResolvedValue(makeInvoiceRow({ status: 'BROUILLON', reference: null }));
    invoice.update.mockResolvedValue(
      makeInvoiceRow({ status: 'ENVOYEE', reference: 'FAC-2026-0001', sequenceYear: 2026, sequenceNo: 1 }),
    );
    const res = await new InvoicesService(prisma).updateStatus('inv1', 'ENVOYEE');
    expect(queryRaw).toHaveBeenCalled();
    const arg = invoice.update.mock.calls[0][0];
    expect(arg.data.reference).toMatch(/^FAC-\d{4}-0001$/);
    expect(arg.data.status).toBe('ENVOYEE');
    expect(res.reference).toBe('FAC-2026-0001');
  });

  it('updateStatus ENVOYEE→PAYEE ne réassigne pas de référence', async () => {
    const { prisma, invoice, queryRaw } = makePrisma();
    invoice.findUnique.mockResolvedValue(makeInvoiceRow({ status: 'ENVOYEE', reference: 'FAC-2026-0001' }));
    invoice.update.mockResolvedValue(makeInvoiceRow({ status: 'PAYEE', reference: 'FAC-2026-0001', paymentMethod: 'VIREMENT' }));
    await new InvoicesService(prisma).updateStatus('inv1', 'PAYEE', undefined, 'VIREMENT');
    expect(queryRaw).not.toHaveBeenCalled();
  });

  // --- Envoi par courriel ------------------------------------------------

  function fakePdf() {
    return { generate: jest.fn().mockResolvedValue(Buffer.from('pdf')) } as unknown as InvoicePdfService;
  }
  function fakeIssuer() {
    return { get: jest.fn().mockResolvedValue(null) } as unknown as IssuerService;
  }
  function fakeMail(configured = true) {
    return {
      isConfigured: configured,
      sendInvoiceEmail: jest.fn().mockResolvedValue(undefined),
    } as unknown as MailService;
  }

  it('sendInvoice finalise un brouillon puis envoie le courriel', async () => {
    const { prisma, invoice } = makePrisma();
    invoice.findUnique.mockResolvedValue(makeInvoiceRow({ status: 'BROUILLON', reference: null }));
    invoice.update.mockResolvedValue(makeInvoiceRow({ status: 'ENVOYEE', reference: 'FAC-2026-0001' }));
    const mail = fakeMail();
    const res = await new InvoicesService(prisma).sendInvoice(
      'inv1',
      { to: 'a@b.com', subject: 'Facture' },
      fakePdf(),
      fakeIssuer(),
      mail,
    );
    expect(res).toEqual({ sent: true, newStatus: 'ENVOYEE' });
    expect(mail.sendInvoiceEmail).toHaveBeenCalledTimes(1);
  });

  it('sendInvoice lève 503 si le courriel n’est pas configuré', async () => {
    const { prisma, invoice } = makePrisma();
    invoice.findUnique.mockResolvedValue(makeInvoiceRow());
    await expect(
      new InvoicesService(prisma).sendInvoice(
        'inv1',
        { to: 'a@b.com', subject: 'S' },
        fakePdf(),
        fakeIssuer(),
        fakeMail(false),
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('sendReminder rejette une facture non ENVOYEE', async () => {
    const { prisma, invoice } = makePrisma();
    invoice.findUnique.mockResolvedValue(makeInvoiceRow({ status: 'BROUILLON' }));
    await expect(
      new InvoicesService(prisma).sendReminder(
        'inv1',
        { to: 'a@b.com', subject: 'Rappel' },
        fakePdf(),
        fakeIssuer(),
        fakeMail(),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
