import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as path from 'path';
import * as fs from 'fs';
import {
  formatCents,
  type Invoice,
  type InvoiceStatus,
  type IssuerProfile,
  type PaymentMethod,
} from '@facturation/core';

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  BROUILLON: 'Brouillon',
  ENVOYEE: 'Envoyée',
  PAYEE: 'Payée',
  ANNULEE: 'Annulée',
};

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  VIREMENT: 'Virement bancaire',
  CHEQUE: 'Chèque',
  CARTE: 'Carte',
  COMPTANT: 'Comptant',
  AUTRE: 'Autre',
};

/**
 * Résout le chemin du logo à afficher : logo téléversé de l'émetteur, sinon
 * logo statique compilé, sinon aucun. (PDFKit ne gère que PNG/JPEG.)
 */
function resolveLogoPath(issuer: IssuerProfile | null): string | null {
  if (issuer?.logoPath) {
    const abs = path.isAbsolute(issuer.logoPath)
      ? issuer.logoPath
      : path.join(process.cwd(), issuer.logoPath);
    if (fs.existsSync(abs)) {
      return abs;
    }
  }
  const fallback = path.join(__dirname, 'logo.png');
  return fs.existsSync(fallback) ? fallback : null;
}

/** Une facture ENVOYEE dont l'échéance est dépassée est « en retard ». */
function isOverdue(invoice: Invoice): boolean {
  if (invoice.status !== 'ENVOYEE' || !invoice.dueDate) {
    return false;
  }
  return new Date(invoice.dueDate) < new Date();
}

@Injectable()
export class InvoicePdfService {
  /** Génère le PDF d'une facture (en-tête émetteur + TPS/TVQ, lignes, totaux). */
  generate(invoice: Invoice, issuer: IssuerProfile | null): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    // Logo (haut-droite) — optionnel (logo émetteur téléversé ou statique)
    const logoPath = resolveLogoPath(issuer);
    if (logoPath) {
      try {
        doc.image(logoPath, 497, 50, { width: 48 });
      } catch {
        /* format non supporté / fichier corrompu : on continue sans */
      }
    }

    // En-tête de l'émetteur
    doc.font('Helvetica-Bold').fontSize(18).text(issuer?.legalName ?? 'Lussier Facturation');
    doc.font('Helvetica').fontSize(9).fillColor('#555555');
    const issuerLines = [
      issuer?.addressLine,
      [issuer?.city, issuer?.province, issuer?.postalCode].filter(Boolean).join(', ') || null,
      issuer?.email,
      issuer?.phone,
      issuer?.gstNumber ? `No TPS : ${issuer.gstNumber}` : null,
      issuer?.qstNumber ? `No TVQ : ${issuer.qstNumber}` : null,
    ].filter((l): l is string => Boolean(l));
    issuerLines.forEach((l) => doc.text(l));
    doc.fillColor('#000000');

    // Titre (référence officielle « FAC-AAAA-NNNN » ou « BROUILLON » si non finalisée)
    doc.moveDown(1.2);
    doc.font('Helvetica-Bold').fontSize(16).text(`FACTURE ${invoice.reference ?? 'BROUILLON'}`);
    doc.font('Helvetica').fontSize(9).fillColor('#555555');
    doc.text(`Statut : ${STATUS_LABEL[invoice.status]}`);
    doc.text(`Date d'émission : ${invoice.issueDate.slice(0, 10)}`);
    if (invoice.dueDate) {
      doc.text(`Échéance : ${invoice.dueDate.slice(0, 10)}`);
    }
    if (invoice.status === 'PAYEE' && invoice.paidAt) {
      const mode = invoice.paymentMethod ? ` par ${PAYMENT_METHOD_LABEL[invoice.paymentMethod]}` : '';
      doc.fillColor('#157347').text(`Payée le ${invoice.paidAt.slice(0, 10)}${mode}`).fillColor('#555555');
    }
    if (isOverdue(invoice)) {
      doc
        .font('Helvetica-Bold')
        .fillColor('#cc0000')
        .text('PAIEMENT EN RETARD')
        .font('Helvetica')
        .fillColor('#555555');
    }
    doc.fillColor('#000000');

    // Client
    doc.moveDown(1);
    doc.font('Helvetica-Bold').fontSize(11).text('Facturé à :');
    doc.font('Helvetica').fontSize(10).fillColor('#333333');
    if (invoice.client) {
      const c = invoice.client;
      [
        c.companyName,
        c.contactName,
        c.addressLine,
        [c.city, c.province, c.postalCode].filter(Boolean).join(', ') || null,
        c.email,
      ]
        .filter((l): l is string => Boolean(l))
        .forEach((l) => doc.text(l));
    }

    // Contact de facturation (à l'attention de) + projet
    if (invoice.billingContact) {
      const bc = invoice.billingContact;
      doc.fontSize(9).fillColor('#555555');
      doc.text(`À l'attention de : ${bc.name}${bc.title ? ` (${bc.title})` : ''}`);
    }
    if (invoice.project) {
      doc.fontSize(9).fillColor('#555555');
      doc.text(`Projet : ${invoice.project.name}`);
    }
    doc.fillColor('#000000');

    // Lignes
    doc.moveDown(1.2);
    const headerY = doc.y;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#555555');
    doc.text('Description', 50, headerY, { width: 270 });
    doc.text('Qté', 330, headerY, { width: 50, align: 'right' });
    doc.text('Prix unit.', 390, headerY, { width: 70, align: 'right' });
    doc.text('Montant', 470, headerY, { width: 80, align: 'right' });
    doc.moveTo(50, headerY + 14).lineTo(550, headerY + 14).strokeColor('#cccccc').stroke();
    doc.font('Helvetica').fillColor('#000000');

    let y = headerY + 20;
    invoice.lines.forEach((l) => {
      doc.fontSize(9);
      doc.text(l.description, 50, y, { width: 270 });
      doc.text(String(l.quantity), 330, y, { width: 50, align: 'right' });
      doc.text(formatCents(l.unitPriceCents), 390, y, { width: 70, align: 'right' });
      doc.text(formatCents(l.amountCents), 470, y, { width: 80, align: 'right' });
      y = doc.y + 6;
    });

    // Totaux
    doc.moveTo(330, y + 2).lineTo(550, y + 2).strokeColor('#cccccc').stroke();
    y += 10;
    const totalLine = (label: string, value: string, bold = false): void => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10);
      doc.text(label, 330, y, { width: 120, align: 'right' });
      doc.text(value, 460, y, { width: 90, align: 'right' });
      y = doc.y + 4;
    };
    totalLine('Sous-total', formatCents(invoice.subtotalCents));
    totalLine('TPS (5 %)', formatCents(invoice.gstCents));
    totalLine('TVQ (9,975 %)', formatCents(invoice.qstCents));
    totalLine('Total', formatCents(invoice.totalCents), true);

    if (invoice.notes) {
      doc.font('Helvetica').fillColor('#555555').fontSize(9);
      doc.text(`Notes : ${invoice.notes}`, 50, y + 20, { width: 500 });
    }

    // Mentions légales (Québec) — pied de page
    const legal =
      'Montants en dollars canadiens (CAD). Facture assujettie à la TPS (5 %) et à la TVQ (9,975 %).' +
      (issuer?.legalName ? ` Veuillez libeller votre paiement à l'ordre de ${issuer.legalName}.` : '');
    doc.font('Helvetica').fontSize(8).fillColor('#999999');
    doc.text(legal, 50, doc.page.height - 70, { width: 500, align: 'center' });
    doc.fillColor('#000000');

    doc.end();
    return done;
  }
}
