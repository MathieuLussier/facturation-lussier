import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import type { InvoiceAttachment as DbAttachment } from '@prisma/client';
import type { InvoiceAttachment } from '@facturation/core';
import { PrismaService } from '../../prisma/prisma.service';
import { attachmentAbsPath } from './attachment-storage';

export interface UploadedAttachment {
  fileName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
}

function toAttachment(a: DbAttachment): InvoiceAttachment {
  return {
    id: a.id,
    invoiceId: a.invoiceId,
    fileName: a.fileName,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    createdAt: a.createdAt.toISOString(),
  };
}

@Injectable()
export class InvoiceAttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(invoiceId: string): Promise<InvoiceAttachment[]> {
    await this.ensureInvoice(invoiceId);
    const rows = await this.prisma.client.invoiceAttachment.findMany({
      where: { invoiceId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toAttachment);
  }

  async add(invoiceId: string, file: UploadedAttachment): Promise<InvoiceAttachment[]> {
    await this.ensureInvoice(invoiceId);
    await this.prisma.client.invoiceAttachment.create({
      data: {
        invoiceId,
        fileName: file.fileName,
        storedName: file.storedName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
      },
    });
    return this.list(invoiceId);
  }

  async rename(invoiceId: string, attId: string, fileName: string): Promise<InvoiceAttachment[]> {
    const att = await this.findOwned(invoiceId, attId);
    await this.prisma.client.invoiceAttachment.update({
      where: { id: att.id },
      data: { fileName },
    });
    return this.list(invoiceId);
  }

  async remove(invoiceId: string, attId: string): Promise<InvoiceAttachment[]> {
    const att = await this.findOwned(invoiceId, attId);
    try {
      fs.unlinkSync(attachmentAbsPath(att.storedName));
    } catch {
      /* fichier déjà absent : on ignore */
    }
    await this.prisma.client.invoiceAttachment.delete({ where: { id: att.id } });
    return this.list(invoiceId);
  }

  /** Métadonnées pour le téléchargement authentifié. */
  async getForDownload(
    invoiceId: string,
    attId: string,
  ): Promise<{ absPath: string; fileName: string; mimeType: string }> {
    const att = await this.findOwned(invoiceId, attId);
    return { absPath: attachmentAbsPath(att.storedName), fileName: att.fileName, mimeType: att.mimeType };
  }

  /** Pièces jointes prêtes pour Nodemailer (chemin disque + nom affiché). */
  async filesForEmail(
    invoiceId: string,
  ): Promise<Array<{ filename: string; path: string; contentType: string }>> {
    const rows = await this.prisma.client.invoiceAttachment.findMany({
      where: { invoiceId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((a) => ({
      filename: a.fileName,
      path: attachmentAbsPath(a.storedName),
      contentType: a.mimeType,
    }));
  }

  private async ensureInvoice(invoiceId: string): Promise<void> {
    const inv = await this.prisma.client.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true },
    });
    if (!inv) {
      throw new NotFoundException('Facture introuvable');
    }
  }

  private async findOwned(invoiceId: string, attId: string): Promise<DbAttachment> {
    const att = await this.prisma.client.invoiceAttachment.findUnique({ where: { id: attId } });
    if (!att || att.invoiceId !== invoiceId) {
      throw new NotFoundException('Pièce jointe introuvable');
    }
    return att;
  }
}
