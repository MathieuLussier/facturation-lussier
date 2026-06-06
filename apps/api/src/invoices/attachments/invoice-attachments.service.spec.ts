import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { InvoiceAttachmentsService } from './invoice-attachments.service';
import type { PrismaService } from '../../prisma/prisma.service';

function makeRow(over: Record<string, unknown> = {}) {
  return {
    id: 'a1',
    invoiceId: 'inv1',
    fileName: 'scan.pdf',
    storedName: 'uuid-123.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1234,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...over,
  };
}

function makePrisma() {
  const invoice = { findUnique: jest.fn().mockResolvedValue({ id: 'inv1' }) };
  const invoiceAttachment = {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  return {
    prisma: { client: { invoice, invoiceAttachment } } as unknown as PrismaService,
    invoice,
    invoiceAttachment,
  };
}

describe('InvoiceAttachmentsService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('list lève NotFound si la facture est absente', async () => {
    const { prisma, invoice } = makePrisma();
    invoice.findUnique.mockResolvedValue(null);
    await expect(new InvoiceAttachmentsService(prisma).list('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('list retourne les pièces jointes mappées', async () => {
    const { prisma, invoiceAttachment } = makePrisma();
    invoiceAttachment.findMany.mockResolvedValue([makeRow()]);
    const res = await new InvoiceAttachmentsService(prisma).list('inv1');
    expect(res[0]).toMatchObject({ id: 'a1', fileName: 'scan.pdf', sizeBytes: 1234 });
    expect(res[0]).not.toHaveProperty('storedName');
  });

  it('add crée la pièce jointe et retourne la liste', async () => {
    const { prisma, invoiceAttachment } = makePrisma();
    invoiceAttachment.create.mockResolvedValue(makeRow());
    invoiceAttachment.findMany.mockResolvedValue([makeRow()]);
    const res = await new InvoiceAttachmentsService(prisma).add('inv1', {
      fileName: 'scan.pdf',
      storedName: 'uuid-123.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1234,
    });
    expect(invoiceAttachment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ invoiceId: 'inv1', fileName: 'scan.pdf' }) }),
    );
    expect(res).toHaveLength(1);
  });

  it('rename lève NotFound si la pièce jointe appartient à une autre facture', async () => {
    const { prisma, invoiceAttachment } = makePrisma();
    invoiceAttachment.findUnique.mockResolvedValue(makeRow({ invoiceId: 'autre' }));
    await expect(
      new InvoiceAttachmentsService(prisma).rename('inv1', 'a1', 'nouveau.pdf'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(invoiceAttachment.update).not.toHaveBeenCalled();
  });

  it('rename met à jour le nom affiché', async () => {
    const { prisma, invoiceAttachment } = makePrisma();
    invoiceAttachment.findUnique.mockResolvedValue(makeRow());
    invoiceAttachment.update.mockResolvedValue(makeRow({ fileName: 'devis.pdf' }));
    invoiceAttachment.findMany.mockResolvedValue([makeRow({ fileName: 'devis.pdf' })]);
    const res = await new InvoiceAttachmentsService(prisma).rename('inv1', 'a1', 'devis.pdf');
    expect(invoiceAttachment.update).toHaveBeenCalledWith({ where: { id: 'a1' }, data: { fileName: 'devis.pdf' } });
    expect(res[0].fileName).toBe('devis.pdf');
  });

  it('remove supprime la ligne (fichier disque absent : ignoré)', async () => {
    const { prisma, invoiceAttachment } = makePrisma();
    invoiceAttachment.findUnique.mockResolvedValue(makeRow());
    invoiceAttachment.delete.mockResolvedValue(makeRow());
    invoiceAttachment.findMany.mockResolvedValue([]);

    const res = await new InvoiceAttachmentsService(prisma).remove('inv1', 'a1');

    expect(invoiceAttachment.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });
    expect(res).toHaveLength(0);
  });

  it('getForDownload retourne le chemin et le nom affiché', async () => {
    const { prisma, invoiceAttachment } = makePrisma();
    invoiceAttachment.findUnique.mockResolvedValue(makeRow());
    const res = await new InvoiceAttachmentsService(prisma).getForDownload('inv1', 'a1');
    expect(res.fileName).toBe('scan.pdf');
    expect(res.absPath).toContain('uuid-123.pdf');
  });
});
