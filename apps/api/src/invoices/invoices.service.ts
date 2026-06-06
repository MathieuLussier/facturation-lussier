import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  Client as DbClient,
  Contact as DbContact,
  Invoice as DbInvoice,
  InvoiceAttachment as DbAttachment,
  InvoiceLine as DbLine,
  Project as DbProject,
} from '@prisma/client';
import {
  computeInvoiceTotals,
  computeLineAmountCents,
  formatCents,
  type Client,
  type Contact,
  type CreateInvoiceRequest,
  type Invoice,
  type InvoiceLine,
  type InvoiceStats,
  type InvoiceStatus,
  type InvoiceAttachment,
  type Paginated,
  type PaymentMethod,
  type Project,
  type ProjectStatus,
  type SendInvoiceRequest,
  type SendInvoiceResponse,
  type UpdateInvoiceRequest,
} from '@facturation/core';
import { PrismaService } from '../prisma/prisma.service';
import { IssuerService } from '../issuer/issuer.service';
import { MailService } from '../mail/mail.service';
import { InvoicePdfService } from './invoice-pdf.service';
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

type DbProjectWithContacts = DbProject & { billingContacts?: DbContact[] };

type InvoiceRow = DbInvoice & {
  lines?: DbLine[];
  attachments?: DbAttachment[];
  client?: DbClient | null;
  project?: DbProjectWithContacts | null;
  billingContact?: DbContact | null;
};

const INCLUDE_FULL = {
  client: true,
  lines: { orderBy: { position: 'asc' as const } },
  attachments: { orderBy: { createdAt: 'asc' as const } },
  project: { include: { billingContacts: true } },
  billingContact: true,
};

function toClient(c: DbClient): Client {
  return {
    id: c.id,
    type: c.type,
    companyName: c.companyName,
    email: c.email,
    phone: c.phone,
    addressLine: c.addressLine,
    city: c.city,
    province: c.province,
    postalCode: c.postalCode,
    country: c.country,
    neq: c.neq,
    contactName: c.contactName,
    notes: c.notes,
    archivedAt: c.archivedAt ? c.archivedAt.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

function toLine(l: DbLine): InvoiceLine {
  return {
    id: l.id,
    description: l.description,
    quantity: l.quantity,
    unitPriceCents: l.unitPriceCents,
    amountCents: l.amountCents,
  };
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

function toContact(c: DbContact): Contact {
  return {
    id: c.id,
    companyId: c.companyId,
    name: c.name,
    email: c.email,
    phone: c.phone,
    title: c.title,
    isBillingContact: c.isBillingContact,
    notes: c.notes,
    archivedAt: c.archivedAt ? c.archivedAt.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

function toProject(p: DbProjectWithContacts): Project {
  return {
    id: p.id,
    companyId: p.companyId,
    name: p.name,
    status: p.status as ProjectStatus,
    notes: p.notes,
    billingContacts: (p.billingContacts ?? []).map(toContact),
    archivedAt: p.archivedAt ? p.archivedAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function toInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    number: row.number,
    reference: row.reference ?? null,
    sequenceYear: row.sequenceYear ?? null,
    sequenceNo: row.sequenceNo ?? null,
    status: row.status as InvoiceStatus,
    clientId: row.clientId,
    client: row.client ? toClient(row.client) : undefined,
    projectId: row.projectId,
    project: row.project ? toProject(row.project) : undefined,
    billingContactId: row.billingContactId,
    billingContact: row.billingContact ? toContact(row.billingContact) : undefined,
    issueDate: row.issueDate.toISOString(),
    dueDate: row.dueDate ? row.dueDate.toISOString() : null,
    notes: row.notes,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    paymentMethod: (row.paymentMethod as PaymentMethod | null) ?? null,
    subtotalCents: row.subtotalCents,
    gstCents: row.gstCents,
    qstCents: row.qstCents,
    totalCents: row.totalCents,
    lines: (row.lines ?? []).map(toLine),
    attachments: row.attachments ? row.attachments.map(toAttachment) : undefined,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    deletable: row.status === 'BROUILLON',
    editable: row.status === 'BROUILLON' || row.status === 'ENVOYEE',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Référence lisible d'une facture pour les courriels (réf. officielle ou n° interne). */
function invoiceRefLabel(invoice: Invoice): string {
  return invoice.reference ?? `#${invoice.number}`;
}

/** Corps par défaut d'un courriel d'envoi de facture (si l'utilisateur n'en saisit pas). */
function defaultSendBody(invoice: Invoice): string {
  return (
    `Bonjour,\n\n` +
    `Veuillez trouver ci-joint la facture ${invoiceRefLabel(invoice)} ` +
    `d'un montant de ${formatCents(invoice.totalCents)}.\n\n` +
    `N'hésitez pas à nous contacter pour toute question.\n\nCordialement`
  );
}

/** Corps par défaut d'un courriel de rappel (facture en attente de paiement). */
function defaultReminderBody(invoice: Invoice): string {
  const echeance = invoice.dueDate ? ` (échéance : ${invoice.dueDate.slice(0, 10)})` : '';
  return (
    `Bonjour,\n\n` +
    `Nous vous rappelons que la facture ${invoiceRefLabel(invoice)} ` +
    `d'un montant de ${formatCents(invoice.totalCents)} est toujours en attente de règlement${echeance}.\n\n` +
    `Merci de régulariser cette situation.\n\nCordialement`
  );
}

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: ListParams): Promise<Paginated<Invoice>> {
    const page = params.page ?? DEFAULT_PAGE;
    const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
    const db = this.prisma.client;
    const where = {
      ...(params.archivedOnly ? { archivedAt: { not: null } } : { archivedAt: null }),
      ...(params.status ? { status: params.status } : {}),
      ...(params.overdue ? { status: 'ENVOYEE' as const, dueDate: { lt: new Date() } } : {}),
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
        where: { status: 'ENVOYEE', dueDate: { lt: now } },
      }),
      db.invoice.aggregate({
        _sum: { totalCents: true },
        where: { status: { not: 'ANNULEE' }, issueDate: { gte: monthStart } },
      }),
      db.invoice.findMany({ where: { archivedAt: null }, orderBy: { number: 'desc' }, take: 5, include: { client: true } }),
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
   * Met à jour le statut d'une facture. Deux responsabilités fusionnées :
   *  - Numérotation : la 1re transition BROUILLON→ENVOYEE assigne la référence
   *    officielle « FAC-AAAA-NNNN » sans trou (compteur transactionnel).
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

    // Champs de paiement selon la cible.
    let paymentData: { paidAt: Date | null; paymentMethod: PaymentMethod | null };
    if (status === 'PAYEE') {
      if (!paymentMethod) {
        throw new BadRequestException('La méthode de paiement est requise pour marquer une facture payée.');
      }
      paymentData = { paidAt: paidAt ? new Date(paidAt) : new Date(), paymentMethod };
    } else {
      paymentData = { paidAt: null, paymentMethod: null };
    }

    // Finalisation (assignation de la référence) à la 1re mise en « Envoyée ».
    const needsNumber =
      status === 'ENVOYEE' && current.status === 'BROUILLON' && current.reference === null;
    if (needsNumber) {
      return this.finalizeToEnvoyee(id);
    }

    const row = await this.prisma.client.invoice.update({
      where: { id },
      data: { status, ...paymentData },
      include: INCLUDE_FULL,
    });
    return toInvoice(row);
  }

  /**
   * Assigne la référence officielle « FAC-AAAA-NNNN » et passe la facture en
   * « Envoyée », dans une transaction sérialisable (numérotation sans trou).
   * Réutilisé par {@link updateStatus} et par l'envoi par courriel.
   */
  async finalizeToEnvoyee(id: string): Promise<Invoice> {
    const year = new Date().getFullYear();
    const row = await this.prisma.client.$transaction(
      async (tx) => {
        await tx.$executeRaw`
          INSERT INTO invoice_sequences ("year", "lastNumber")
          VALUES (${year}, 0)
          ON CONFLICT ("year") DO NOTHING
        `;
        const result = await tx.$queryRaw<Array<{ lastNumber: number }>>`
          UPDATE invoice_sequences
          SET "lastNumber" = "lastNumber" + 1
          WHERE "year" = ${year}
          RETURNING "lastNumber"
        `;
        const sequenceNo = Number(result[0].lastNumber);
        const reference = `FAC-${year}-${String(sequenceNo).padStart(4, '0')}`;
        return tx.invoice.update({
          where: { id },
          data: {
            status: 'ENVOYEE',
            sequenceYear: year,
            sequenceNo,
            reference,
            paidAt: null,
            paymentMethod: null,
          },
          include: INCLUDE_FULL,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
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

  /**
   * Envoie la facture par courriel (PDF en pièce jointe). Si elle est en
   * brouillon, elle est d'abord finalisée (référence officielle + ENVOYEE) pour
   * que le PDF porte le bon numéro. Les services PDF/émetteur/mail sont fournis
   * par le contrôleur (le service factures ne dépend que de Prisma).
   */
  async sendInvoice(
    id: string,
    dto: SendInvoiceRequest,
    pdf: InvoicePdfService,
    issuerService: IssuerService,
    mail: MailService,
  ): Promise<SendInvoiceResponse> {
    if (!mail.isConfigured) {
      throw new ServiceUnavailableException(
        "L'envoi de courriels n'est pas configuré (SMTP). Renseignez les variables SMTP_* dans .env.",
      );
    }
    let invoice = await this.findById(id);
    if (invoice.status === 'BROUILLON') {
      invoice = await this.finalizeToEnvoyee(id);
    }
    const issuer = await issuerService.get();
    const buffer = await pdf.generate(invoice, issuer);
    await mail.sendInvoiceEmail({
      to: dto.to,
      subject: dto.subject,
      body: dto.body && dto.body.trim() ? dto.body : defaultSendBody(invoice),
      pdfBuffer: buffer,
      attachmentName: `facture-${invoice.reference ?? invoice.number}.pdf`,
      extraAttachments: await this.loadEmailAttachments(invoice.id, dto.attachmentIds),
    });
    return { sent: true, newStatus: invoice.status };
  }

  /**
   * Pièces jointes de la facture, prêtes pour Nodemailer (chemin disque + nom affiché).
   * Si `attachmentIds` est fourni, ne joint que celles-là (tableau vide = aucune).
   */
  private async loadEmailAttachments(
    invoiceId: string,
    attachmentIds?: string[],
  ): Promise<Array<{ filename: string; path: string; contentType: string }>> {
    const rows = await this.prisma.client.invoiceAttachment.findMany({
      where: { invoiceId, ...(attachmentIds ? { id: { in: attachmentIds } } : {}) },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((a) => ({
      filename: a.fileName,
      path: attachmentAbsPath(a.storedName),
      contentType: a.mimeType,
    }));
  }

  /** Envoie un rappel de paiement (facture ENVOYEE uniquement ; sans changement de statut). */
  async sendReminder(
    id: string,
    dto: SendInvoiceRequest,
    pdf: InvoicePdfService,
    issuerService: IssuerService,
    mail: MailService,
  ): Promise<{ sent: boolean }> {
    if (!mail.isConfigured) {
      throw new ServiceUnavailableException(
        "L'envoi de courriels n'est pas configuré (SMTP). Renseignez les variables SMTP_* dans .env.",
      );
    }
    const invoice = await this.findById(id);
    if (invoice.status !== 'ENVOYEE') {
      throw new BadRequestException('Seules les factures envoyées peuvent faire l’objet d’un rappel.');
    }
    const issuer = await issuerService.get();
    const buffer = await pdf.generate(invoice, issuer);
    await mail.sendInvoiceEmail({
      to: dto.to,
      subject: dto.subject,
      body: dto.body && dto.body.trim() ? dto.body : defaultReminderBody(invoice),
      pdfBuffer: buffer,
      attachmentName: `facture-${invoice.reference ?? invoice.number}.pdf`,
      extraAttachments: await this.loadEmailAttachments(invoice.id, dto.attachmentIds),
    });
    return { sent: true };
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
    await this.prisma.client.invoice.delete({ where: { id } });
  }
}
