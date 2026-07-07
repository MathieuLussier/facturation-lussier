import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  formatCents,
  type Invoice,
  type SendInvoiceRequest,
  type SendInvoiceResponse,
} from '@facturation/core';
import { PrismaService } from '../prisma/prisma.service';
import { IssuerService } from '../issuer/issuer.service';
import { MailService } from '../mail/mail.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { InvoiceNumberingService } from './invoice-numbering.service';
import { INCLUDE_FULL, toInvoice } from './invoice-mappers';
import { attachmentAbsPath } from './attachments/attachment-storage';

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

/**
 * Envoi de factures / rappels par courriel (PDF en pièce jointe). Dépend de la
 * numérotation (finalise un brouillon avant l'envoi) et compense en cas d'échec.
 */
@Injectable()
export class InvoiceMailingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbering: InvoiceNumberingService,
  ) {}

  private async findInvoice(id: string): Promise<Invoice> {
    const row = await this.prisma.client.invoice.findUnique({
      where: { id },
      include: INCLUDE_FULL,
    });
    if (!row) {
      throw new NotFoundException('Facture introuvable');
    }
    return toInvoice(row);
  }

  /**
   * Envoie la facture par courriel. Un brouillon est d'abord finalisé (référence
   * officielle + ENVOYEE) pour que le PDF porte le bon numéro. Si le PDF/SMTP
   * échoue juste après une finalisation fraîche, on compense (réouverture +
   * numéro rendu) : pas de facture « envoyée » que le client n'a jamais reçue.
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
    let invoice = await this.findInvoice(id);
    const freshlyFinalized = invoice.status === 'BROUILLON';
    if (freshlyFinalized) {
      invoice = await this.numbering.finalizeToEnvoyee(id);
    }

    try {
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
    } catch (err) {
      if (freshlyFinalized) {
        await this.numbering.revertFinalization(id, invoice.sequenceYear, invoice.sequenceNo);
      }
      throw err;
    }
    return { sent: true, newStatus: invoice.status };
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
    const invoice = await this.findInvoice(id);
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
}
