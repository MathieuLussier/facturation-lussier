import type { BadgeTone } from '@facturation/ui';
import type { InvoiceStatus } from '@facturation/core';

/** Libellé FR d'un statut de facture. */
export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  BROUILLON: 'Brouillon',
  ENVOYEE: 'Envoyée',
  PAYEE: 'Payée',
  ANNULEE: 'Annulée',
};

/** Tonalité de badge associée à un statut. */
export const INVOICE_STATUS_TONE: Record<InvoiceStatus, BadgeTone> = {
  BROUILLON: 'neutral',
  ENVOYEE: 'brand',
  PAYEE: 'success',
  ANNULEE: 'danger',
};
