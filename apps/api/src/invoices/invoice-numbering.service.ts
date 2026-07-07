import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Invoice } from '@facturation/core';
import { PrismaService } from '../prisma/prisma.service';
import { INCLUDE_FULL, toInvoice } from './invoice-mappers';

/**
 * Numérotation officielle des factures (« FAC-AAAA-NNNN ») sans trou.
 * Isolé de la logique CRUD/envoi : concentre la transaction sérialisable et la
 * compensation.
 */
@Injectable()
export class InvoiceNumberingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Assigne la référence officielle et passe la facture en « Envoyée », dans une
   * transaction sérialisable (numérotation sans trou). IDEMPOTENT : la référence
   * est re-vérifiée À L'INTÉRIEUR de la transaction ; si la facture est déjà
   * numérotée (finalisation concurrente ou rejouée), on retourne son état courant
   * SANS consommer un second numéro.
   */
  async finalizeToEnvoyee(id: string): Promise<Invoice> {
    const year = new Date().getFullYear();
    const row = await this.prisma.client.$transaction(
      async (tx) => {
        const existing = await tx.invoice.findUnique({
          where: { id },
          select: { reference: true },
        });
        if (!existing) {
          throw new NotFoundException('Facture introuvable');
        }
        // Déjà finalisée → idempotent : ne pas ré-attribuer de numéro.
        if (existing.reference !== null) {
          return tx.invoice.findUnique({ where: { id }, include: INCLUDE_FULL });
        }

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
    if (!row) {
      throw new NotFoundException('Facture introuvable');
    }
    return toInvoice(row);
  }

  /**
   * Compensation : ré-ouvre une facture fraîchement finalisée dont l'envoi a
   * échoué (pour ne pas laisser une facture « envoyée » jamais reçue). Rend le
   * numéro au compteur en CAS (uniquement s'il est encore le dernier attribué,
   * pour préserver l'absence de trou dans le cas courant sans concurrence).
   */
  async revertFinalization(
    id: string,
    sequenceYear: number | null,
    sequenceNo: number | null,
  ): Promise<void> {
    await this.prisma.client.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id },
        data: { status: 'BROUILLON', reference: null, sequenceYear: null, sequenceNo: null },
      });
      if (sequenceYear !== null && sequenceNo !== null) {
        await tx.$executeRaw`
          UPDATE invoice_sequences
          SET "lastNumber" = "lastNumber" - 1
          WHERE "year" = ${sequenceYear} AND "lastNumber" = ${sequenceNo}
        `;
      }
    });
  }
}
