import type { Client } from './client';

export type InvoiceStatus = 'BROUILLON' | 'ENVOYEE' | 'PAYEE' | 'ANNULEE';

/** Taux de taxes du Québec. */
export const GST_RATE = 0.05; // TPS
export const QST_RATE = 0.09975; // TVQ

export interface InvoiceTotals {
  subtotalCents: number;
  gstCents: number;
  qstCents: number;
  totalCents: number;
}

export interface InvoiceLine {
  id: string;
  description: string;
  /** Quantité (peut être décimale, ex. des heures). */
  quantity: number;
  unitPriceCents: number;
  amountCents: number;
}

export interface Invoice extends InvoiceTotals {
  id: string;
  number: number;
  status: InvoiceStatus;
  clientId: string;
  /** Présent dans le détail / la liste. */
  client?: Client;
  issueDate: string;
  dueDate: string | null;
  notes: string | null;
  lines: InvoiceLine[];
  createdAt: string;
  updatedAt: string;
}

/** Agrégats pour le tableau de bord. */
export interface InvoiceStats {
  /** Encaissé (factures PAYÉE). */
  paidCents: number;
  /** À recevoir (factures ENVOYÉE, en attente de paiement). */
  outstandingCents: number;
  /** En retard (ENVOYÉE dont l'échéance est passée). */
  overdueCents: number;
  overdueCount: number;
  /** Chiffre d'affaires émis durant le mois courant (hors ANNULÉE). */
  currentMonthCents: number;
  countByStatus: Record<InvoiceStatus, number>;
  /** Dernières factures (avec client). */
  recent: Invoice[];
}

export interface CreateInvoiceLineInput {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export interface CreateInvoiceRequest {
  clientId: string;
  issueDate?: string;
  dueDate?: string | null;
  notes?: string | null;
  lines: CreateInvoiceLineInput[];
}

export interface UpdateInvoiceStatusRequest {
  status: InvoiceStatus;
}

/** Montant d'une ligne en cents (arrondi au cent le plus proche). */
export function computeLineAmountCents(quantity: number, unitPriceCents: number): number {
  return Math.round(quantity * unitPriceCents);
}

/**
 * Calcule les totaux d'une facture (Québec : TPS 5 % et TVQ 9,975 %,
 * toutes deux appliquées sur le sous-total, sans composition). Tout en cents entiers.
 */
export function computeInvoiceTotals(
  lines: ReadonlyArray<{ quantity: number; unitPriceCents: number }>,
): InvoiceTotals {
  const subtotalCents = lines.reduce(
    (sum, l) => sum + computeLineAmountCents(l.quantity, l.unitPriceCents),
    0,
  );
  const gstCents = Math.round(subtotalCents * GST_RATE);
  const qstCents = Math.round(subtotalCents * QST_RATE);
  return {
    subtotalCents,
    gstCents,
    qstCents,
    totalCents: subtotalCents + gstCents + qstCents,
  };
}

/** Formate un montant en cents vers une chaîne « 1 234,56 $ » (locale fr-CA). */
export function formatCents(cents: number): string {
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(cents / 100);
}
