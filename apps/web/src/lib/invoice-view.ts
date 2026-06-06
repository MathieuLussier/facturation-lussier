import type { Invoice, InvoiceStatus } from '@facturation/core';
import { INVOICE_STATUS_LABEL } from './invoice-status';

/**
 * Référence affichée d'une facture : « FAC-AAAA-NNNN » si finalisée, sinon « Brouillon ».
 * Réexporté depuis @facturation/core (source de vérité partagée API ↔ front).
 */
export { formatInvoiceRef } from '@facturation/core';

/**
 * @deprecated Utiliser {@link formatInvoiceRef}. Formate un numéro interne en « FAC-0001 ».
 * Conservé pour compatibilité (tests).
 */
export function formatInvoiceNumber(n: number): string {
  return `FAC-${String(n).padStart(4, '0')}`;
}

export interface DueLabelResult {
  text: string;
  overdue: boolean;
}

/**
 * Retourne un libellé relatif d'échéance et un indicateur de retard.
 * Compare par jour calendaire (pas par timestamp exact).
 *
 * @param dueDate  ISO date string ou null.
 * @param status   Statut courant de la facture.
 * @param today    Date de référence (facilite les tests — pas de Date.now()).
 */
export function relativeDueLabel(
  dueDate: string | null,
  status: InvoiceStatus,
  today: Date,
): DueLabelResult {
  if (dueDate === null) {
    return { text: '—', overdue: false };
  }

  // Parse the due date at day granularity from the ISO string.
  const parts = dueDate.slice(0, 10).split('-').map(Number);
  const [year, month, day] = parts as [number, number, number];
  const due = new Date(year, month - 1, day);

  const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const diffMs = due.getTime() - todayNorm.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { text: "aujourd'hui", overdue: false };
  }

  if (diffDays > 0) {
    return {
      text: `dans ${diffDays} jour${diffDays > 1 ? 's' : ''}`,
      overdue: false,
    };
  }

  // Past due
  const n = Math.abs(diffDays);
  const isOverdue = status !== 'PAYEE' && status !== 'ANNULEE';
  return {
    text: `il y a ${n} jour${n > 1 ? 's' : ''}`,
    overdue: isOverdue,
  };
}

export type InvoiceGroupBy =
  | 'none'
  | 'client'
  | 'status'
  | 'issueYear'
  | 'issueQuarter'
  | 'issueMonth'
  | 'dueYear'
  | 'dueQuarter'
  | 'dueMonth';

export interface InvoiceGroup {
  key: string;
  label: string;
  invoices: Invoice[];
  subtotalCents: number;
  totalCents: number;
}

const STATUS_ORDER: InvoiceStatus[] = ['BROUILLON', 'ENVOYEE', 'PAYEE', 'ANNULEE'];

type DateField = 'issueDate' | 'dueDate';
type Granularity = 'year' | 'quarter' | 'month';

/** Configuration des regroupements par date (champ + granularité). */
const DATE_GROUPS: Partial<Record<InvoiceGroupBy, { field: DateField; gran: Granularity }>> = {
  issueYear: { field: 'issueDate', gran: 'year' },
  issueQuarter: { field: 'issueDate', gran: 'quarter' },
  issueMonth: { field: 'issueDate', gran: 'month' },
  dueYear: { field: 'dueDate', gran: 'year' },
  dueQuarter: { field: 'dueDate', gran: 'quarter' },
  dueMonth: { field: 'dueDate', gran: 'month' },
};

/**
 * Clé (triable) + libellé d'un regroupement par date selon la granularité.
 * Date absente (échéance non définie) → clé vide (triée en dernier) + « Sans échéance ».
 */
function dateGroupKeyLabel(dateStr: string | null, gran: Granularity): { key: string; label: string } {
  if (!dateStr) {
    return { key: '', label: 'Sans échéance' };
  }
  const [y, m] = dateStr.slice(0, 10).split('-').map(Number) as [number, number];
  if (gran === 'year') {
    return { key: String(y), label: String(y) };
  }
  if (gran === 'quarter') {
    const q = Math.ceil(m / 3);
    return { key: `${y}-Q${q}`, label: `T${q} ${y}` };
  }
  const raw = new Intl.DateTimeFormat('fr-CA', { month: 'long', year: 'numeric' }).format(
    new Date(y, m - 1, 1),
  );
  return { key: `${y}-${String(m).padStart(2, '0')}`, label: raw.charAt(0).toUpperCase() + raw.slice(1) };
}

/** Clé + libellé d'un regroupement pour une facture donnée. */
function groupKeyLabel(inv: Invoice, by: InvoiceGroupBy): { key: string; label: string } {
  if (by === 'client') {
    return { key: inv.clientId, label: inv.client?.companyName ?? '—' };
  }
  if (by === 'status') {
    return { key: inv.status, label: INVOICE_STATUS_LABEL[inv.status] };
  }
  const cfg = DATE_GROUPS[by];
  if (cfg) {
    return dateGroupKeyLabel(cfg.field === 'issueDate' ? inv.issueDate : inv.dueDate, cfg.gran);
  }
  return { key: '', label: '' };
}

function sumGroup(invoices: Invoice[]): { subtotalCents: number; totalCents: number } {
  return invoices.reduce(
    (acc, inv) => ({
      subtotalCents: acc.subtotalCents + inv.subtotalCents,
      totalCents: acc.totalCents + inv.totalCents,
    }),
    { subtotalCents: 0, totalCents: 0 },
  );
}

/** Regroupe une liste de factures selon le critère choisi. */
export function groupInvoices(items: Invoice[], by: InvoiceGroupBy): InvoiceGroup[] {
  if (by === 'none') {
    const sums = sumGroup(items);
    return [{ key: '', label: '', invoices: items, ...sums }];
  }

  const map = new Map<string, { label: string; invoices: Invoice[] }>();

  for (const inv of items) {
    const { key, label } = groupKeyLabel(inv, by);
    const existing = map.get(key);
    if (existing) {
      existing.invoices.push(inv);
    } else {
      map.set(key, { label, invoices: [inv] });
    }
  }

  const groups: InvoiceGroup[] = [];
  for (const [key, { label, invoices }] of map.entries()) {
    groups.push({ key, label, invoices, ...sumGroup(invoices) });
  }

  if (by === 'client') {
    groups.sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  } else if (by === 'status') {
    groups.sort(
      (a, b) =>
        STATUS_ORDER.indexOf(a.key as InvoiceStatus) - STATUS_ORDER.indexOf(b.key as InvoiceStatus),
    );
  } else {
    // Regroupements par date : du plus récent au plus ancien ; « Sans échéance » (clé vide) en dernier.
    groups.sort((a, b) => b.key.localeCompare(a.key));
  }

  return groups;
}
