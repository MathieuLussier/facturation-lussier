import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  computeInvoiceTotals,
  computeLineAmountCents,
  type CreateInvoiceRequest,
  type Invoice,
  type InvoiceStats,
  type InvoiceStatus,
  type Paginated,
  type PaymentMethod,
  type UpdateInvoiceRequest,
} from '@facturation/core';
import * as fs from 'fs';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceNumberingService } from './invoice-numbering.service';
import { INCLUDE_FULL, toInvoice } from './invoice-mappers';
import { startOfTodayUtc } from './invoice-dates';
import { attachmentAbsPath } from './attachments/attachment-storage';

interface ListParams {
  page?: number;
  pageSize?: number;
  /** true → uniquement les archivées ; sinon → uniquement les actives. */
  archivedOnly?: boolean;
  status?: InvoiceStatus;
  /** Envoyées dont l'échéance est dépassée. */
  overdue?: boolean;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

/**
 * Transitions de statut autorisées (machine à états). Une facture ne peut jamais
 * revenir à BROUILLON une fois numérotée : cela rouvrirait l'édition des montants
 * sous une référence officielle déjà émise. ANNULEE est terminal. PAYEE→ENVOYEE
 * reste permis pour corriger un encaissement marqué par erreur.
 */
const ALLOWED_STATUS_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  BROUILLON: ['ENVOYEE', 'ANNULEE'],
  ENVOYEE: ['PAYEE', 'ANNULEE'],
  PAYEE: ['ENVOYEE', 'ANNULEE'],
  ANNULEE: [],
};

/** Vrai si passer de `from` à `to` est permis (l'idempotence from===to est tolérée). */
function isAllowedStatusTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return from === to || ALLOWED_STATUS_TRANSITIONS[from].includes(to);
}

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbering: InvoiceNumberingService,
  ) {}

  async list(params: ListParams): Promise<Paginated<Invoice>> {
    const page = params.page ?? DEFAULT_PAGE;
    const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
    const db = this.prisma.client;
    const where = {
      ...(params.archivedOnly ? { archivedAt: { not: null } } : { archivedAt: null }),
      ...(params.status ? { status: params.status } : {}),
      ...(params.overdue ? { status: 'ENVOYEE' as const, dueDate: { lt: startOfTodayUtc() } } : {}),
    };

    const [rows, total] = await db.$transaction([
      db.invoice.findMany({
        where,
        orderBy: { number: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { client: true },
      }),
      db.invoice.count({ where }),
    ]);

    return { items: rows.map(toInvoice), total, page, pageSize };
  }

  /** Agrégats pour le tableau de bord. */
  async stats(): Promise<InvoiceStats> {
    const db = this.prisma.client;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      countBrouillon,
      countEnvoyee,
      countPayee,
      countAnnulee,
      paid,
      outstanding,
      overdue,
      month,
      recentRows,
    ] = await db.$transaction([
      db.invoice.count({ where: { status: 'BROUILLON' } }),
      db.invoice.count({ where: { status: 'ENVOYEE' } }),
      db.invoice.count({ where: { status: 'PAYEE' } }),
      db.invoice.count({ where: { status: 'ANNULEE' } }),
      db.invoice.aggregate({ _sum: { totalCents: true }, where: { status: 'PAYEE' } }),
      db.invoice.aggregate({ _sum: { totalCents: true }, where: { status: 'ENVOYEE' } }),
      db.invoice.aggregate({
        _sum: { totalCents: true },
        _count: { _all: true },
        where: { status: 'ENVOYEE', dueDate: { lt: startOfTodayUtc() } },
      }),
      db.invoice.aggregate({
        _sum: { totalCents: true },
        where: { status: { not: 'ANNULEE' }, issueDate: { gte: monthStart } },
      }),
      db.invoice.findMany({
        where: { archivedAt: null },
        orderBy: { number: 'desc' },
        take: 5,
        include: { client: true },
      }),
    ]);

    const countByStatus: Record<InvoiceStatus, number> = {
      BROUILLON: countBrouillon,
      ENVOYEE: countEnvoyee,
      PAYEE: countPayee,
      ANNULEE: countAnnulee,
    };

    return {
      paidCents: paid._sum.totalCents ?? 0,
      outstandingCents: outstanding._sum.totalCents ?? 0,
      overdueCents: overdue._sum.totalCents ?? 0,
      overdueCount: overdue._count._all,
      currentMonthCents: month._sum.totalCents ?? 0,
      countByStatus,
      recent: recentRows.map(toInvoice),
    };
  }

  async findById(id: string): Promise<Invoice> {
    const row = await this.prisma.client.invoice.findUnique({
      where: { id },
      include: INCLUDE_FULL,
    });
    if (!row) {
      throw new NotFoundException('Facture introuvable');
    }
    return toInvoice(row);
  }

  async create(data: CreateInvoiceRequest, createdById: string): Promise<Invoice> {
    const db = this.prisma.client;
    let clientId = data.clientId;

    // Si un projet est fourni, l'entreprise est dérivée du projet.
    if (data.projectId) {
      const project = await db.project.findUnique({ where: { id: data.projectId } });
      if (!project) {
        throw new NotFoundException('Projet introuvable');
      }
      clientId = project.companyId;
    }

    const client = await db.client.findUnique({ where: { id: clientId } });
    if (!client) {
      throw new NotFoundException('Client introuvable');
    }

    // Le contact de facturation (optionnel) doit appartenir à l'entreprise.
    if (data.billingContactId) {
      const contact = await db.contact.findUnique({ where: { id: data.billingContactId } });
      if (!contact || contact.companyId !== clientId) {
        throw new BadRequestException("Le contact de facturation n'appartient pas à l'entreprise");
      }
    }

    const totals = computeInvoiceTotals(data.lines);

    const row = await db.invoice.create({
      data: {
        clientId,
        projectId: data.projectId ?? null,
        billingContactId: data.billingContactId ?? null,
        issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: data.notes ?? null,
        subtotalCents: totals.subtotalCents,
        gstCents: totals.gstCents,
        qstCents: totals.qstCents,
        totalCents: totals.totalCents,
        createdById,
        lines: {
          create: data.lines.map((l, index) => ({
            description: l.description,
            quantity: l.quantity,
            unitPriceCents: l.unitPriceCents,
            amountCents: computeLineAmountCents(l.quantity, l.unitPriceCents),
            position: index,
          })),
        },
      },
      include: INCLUDE_FULL,
    });

    return toInvoice(row);
  }

  /**
   * Met à jour le statut d'une facture. Deux responsabilités :
   *  - Numérotation : la 1re transition BROUILLON→ENVOYEE assigne la référence
   *    officielle (déléguée à {@link InvoiceNumberingService}).
   *  - Paiement : passer à PAYEE enregistre paidAt + mode (requis) ; quitter
   *    PAYEE efface ces champs.
   */
  async updateStatus(
    id: string,
    status: InvoiceStatus,
    paidAt?: string,
    paymentMethod?: PaymentMethod,
  ): Promise<Invoice> {
    const current = await this.findById(id);

    // Machine à états : rejeter toute transition illégale AVANT d'agir
    // (empêche p. ex. de rouvrir en BROUILLON une facture numérotée, ou de
    // marquer PAYEE un brouillon sans référence officielle).
    if (!isAllowedStatusTransition(current.status, status)) {
      throw new ConflictException(
        `Transition de statut interdite : ${current.status} → ${status}.`,
      );
    }

    // Champs de paiement selon la cible.
    let paymentData: { paidAt: Date | null; paymentMethod: PaymentMethod | null };
    if (status === 'PAYEE') {
      if (!paymentMethod) {
        throw new BadRequestException(
          'La méthode de paiement est requise pour marquer une facture payée.',
        );
      }
      paymentData = { paidAt: paidAt ? new Date(paidAt) : new Date(), paymentMethod };
    } else {
      paymentData = { paidAt: null, paymentMethod: null };
    }

    // Finalisation (assignation de la référence) à la 1re mise en « Envoyée ».
    const needsNumber =
      status === 'ENVOYEE' && current.status === 'BROUILLON' && current.reference === null;
    if (needsNumber) {
      return this.numbering.finalizeToEnvoyee(id);
    }

    const row = await this.prisma.client.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ status: InvoiceStatus; reference: string | null }>>`
        SELECT "status", "reference" FROM "invoices" WHERE "id" = ${id} FOR UPDATE
      `;
      if (locked.length === 0) {
        throw new NotFoundException('Facture introuvable');
      }

      const actual = locked[0];
      if (!isAllowedStatusTransition(actual.status, status)) {
        throw new ConflictException(
          `Transition de statut interdite : ${actual.status} → ${status}.`,
        );
      }

      if (status === 'ENVOYEE' && actual.status === 'BROUILLON' && actual.reference === null) {
        throw new ConflictException(
          'La finalisation doit attribuer une référence officielle avant de passer en envoyée.',
        );
      }

      return tx.invoice.update({
        where: { id },
        data: { status, ...paymentData },
        include: INCLUDE_FULL,
      });
    });
    return toInvoice(row);
  }

  /**
   * Édite le contenu d'une facture (client/projet/contact/dates/notes/lignes).
   * Autorisé seulement en BROUILLON ou ENVOYEE ; les totaux sont recalculés et
   * les lignes intégralement remplacées.
   */
  async update(id: string, data: UpdateInvoiceRequest): Promise<Invoice> {
    const current = await this.findById(id);
    if (current.status === 'PAYEE' || current.status === 'ANNULEE') {
      throw new ConflictException('Cette facture ne peut plus être modifiée.');
    }

    const db = this.prisma.client;
    let clientId = current.clientId;

    // Un projet fourni détermine l'entreprise ; sinon on prend le client fourni.
    if (data.projectId) {
      const project = await db.project.findUnique({ where: { id: data.projectId } });
      if (!project) {
        throw new NotFoundException('Projet introuvable');
      }
      clientId = project.companyId;
    } else if (data.clientId) {
      clientId = data.clientId;
    }

    const client = await db.client.findUnique({ where: { id: clientId } });
    if (!client) {
      throw new NotFoundException('Client introuvable');
    }

    if (data.billingContactId) {
      const contact = await db.contact.findUnique({ where: { id: data.billingContactId } });
      if (!contact || contact.companyId !== clientId) {
        throw new BadRequestException("Le contact de facturation n'appartient pas à l'entreprise");
      }
    }

    const totals = computeInvoiceTotals(data.lines);

    const row = await db.$transaction(async (tx) => {
      await tx.invoiceLine.deleteMany({ where: { invoiceId: id } });
      return tx.invoice.update({
        where: { id },
        data: {
          clientId,
          projectId: data.projectId ?? null,
          billingContactId: data.billingContactId ?? null,
          issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          notes: data.notes ?? null,
          subtotalCents: totals.subtotalCents,
          gstCents: totals.gstCents,
          qstCents: totals.qstCents,
          totalCents: totals.totalCents,
          lines: {
            create: data.lines.map((l, index) => ({
              description: l.description,
              quantity: l.quantity,
              unitPriceCents: l.unitPriceCents,
              amountCents: computeLineAmountCents(l.quantity, l.unitPriceCents),
              position: index,
            })),
          },
        },
        include: INCLUDE_FULL,
      });
    });

    return toInvoice(row);
  }

  async archive(id: string): Promise<Invoice> {
    await this.findById(id);
    const row = await this.prisma.client.invoice.update({
      where: { id },
      data: { archivedAt: new Date() },
      include: INCLUDE_FULL,
    });
    return toInvoice(row);
  }

  async unarchive(id: string): Promise<Invoice> {
    await this.findById(id);
    const row = await this.prisma.client.invoice.update({
      where: { id },
      data: { archivedAt: null },
      include: INCLUDE_FULL,
    });
    return toInvoice(row);
  }

  async remove(id: string): Promise<void> {
    const invoice = await this.findById(id);
    if (invoice.status !== 'BROUILLON') {
      throw new ConflictException(
        'Seules les factures en brouillon peuvent être supprimées. Archivez plutôt cette facture.',
      );
    }

    // Récupérer les fichiers des pièces jointes AVANT la cascade DB : la
    // suppression de la facture cascade les lignes invoice_attachments, mais pas
    // les fichiers sur disque → il faut les effacer nous-mêmes (sinon fuite).
    const attachments = await this.prisma.client.invoiceAttachment.findMany({
      where: { invoiceId: id },
      select: { storedName: true },
    });

    await this.prisma.client.invoice.delete({ where: { id } });

    for (const a of attachments) {
      try {
        fs.unlinkSync(attachmentAbsPath(a.storedName));
      } catch {
        /* fichier déjà absent : on ignore */
      }
    }
  }
}
