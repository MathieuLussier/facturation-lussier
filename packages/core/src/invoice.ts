import type { Client } from './client';
import type { Contact } from './contact';
import type { Project } from './project';

export type InvoiceStatus = 'BROUILLON' | 'ENVOYEE' | 'PAYEE' | 'ANNULEE';

/** Mode d'encaissement enregistré au moment de marquer une facture payée. */
export type PaymentMethod = 'VIREMENT' | 'CHEQUE' | 'CARTE' | 'COMPTANT' | 'AUTRE';

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

/** Pièce jointe d'une facture (jointe au courriel d'envoi). */
export interface InvoiceAttachment {
  id: string;
  invoiceId: string;
  /** Nom affiché, éditable. */
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface Invoice extends InvoiceTotals {
  id: string;
  /** Numéro interne (SERIAL) — sert de clé de tri, non affiché. */
  number: number;
  /** Référence officielle « FAC-AAAA-NNNN » (null tant que brouillon). */
  reference: string | null;
  sequenceYear: number | null;
  sequenceNo: number | null;
  status: InvoiceStatus;
  clientId: string;
  /** Présent dans le détail / la liste. */
  client?: Client;
  projectId: string | null;
  project?: Project;
  billingContactId: string | null;
  billingContact?: Contact;
  issueDate: string;
  dueDate: string | null;
  notes: string | null;
  /** Date d'archivage (ISO) ; null si actif. */
  archivedAt: string | null;
  /** Encaissement (« marquer payée ») : date ISO + mode. Null hors statut PAYEE. */
  paidAt: string | null;
  paymentMethod: PaymentMethod | null;
  /** Calculé serveur : supprimable seulement si statut BROUILLON. */
  deletable?: boolean;
  /** Calculé serveur : modifiable seulement en BROUILLON ou ENVOYEE. */
  editable?: boolean;
  lines: InvoiceLine[];
  /** Pièces jointes (présentes dans le détail). */
  attachments?: InvoiceAttachment[];
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
  projectId?: string | null;
  billingContactId?: string | null;
  issueDate?: string;
  dueDate?: string | null;
  notes?: string | null;
  lines: CreateInvoiceLineInput[];
}

/**
 * Édition du contenu d'une facture (BROUILLON ou ENVOYEE). Les lignes sont
 * toujours remplacées intégralement ; les totaux sont recalculés côté serveur.
 */
export interface UpdateInvoiceRequest {
  clientId?: string;
  projectId?: string | null;
  billingContactId?: string | null;
  issueDate?: string;
  dueDate?: string | null;
  notes?: string | null;
  lines: CreateInvoiceLineInput[];
}

export interface UpdateInvoiceStatusRequest {
  status: InvoiceStatus;
  /** Requis (avec paymentMethod) lorsque status === 'PAYEE'. */
  paidAt?: string;
  paymentMethod?: PaymentMethod;
}

/** Envoi (ou rappel) d'une facture par courriel. */
export interface SendInvoiceRequest {
  to: string;
  subject: string;
  body?: string;
}

export interface SendInvoiceResponse {
  sent: boolean;
  /** Statut après envoi (la facture passe de BROUILLON à ENVOYEE). */
  newStatus?: InvoiceStatus;
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

/**
 * Référence affichée d'une facture : « FAC-AAAA-NNNN » si finalisée,
 * sinon « Brouillon » (facture non encore envoyée, sans numéro officiel).
 */
export function formatInvoiceRef(invoice: Pick<Invoice, 'reference'>): string {
  return invoice.reference ?? 'Brouillon';
}
