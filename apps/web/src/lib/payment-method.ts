import type { PaymentMethod } from '@facturation/core';

/** Modes de paiement, dans l'ordre d'affichage. */
export const PAYMENT_METHODS: PaymentMethod[] = ['VIREMENT', 'CHEQUE', 'CARTE', 'COMPTANT', 'AUTRE'];

/** Libellés français des modes de paiement. */
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  VIREMENT: 'Virement bancaire',
  CHEQUE: 'Chèque',
  CARTE: 'Carte',
  COMPTANT: 'Comptant',
  AUTRE: 'Autre',
};
