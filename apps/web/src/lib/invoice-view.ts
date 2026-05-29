import type { Invoice, InvoiceStatus } from '@facturation/core';
import { INVOICE_STATUS_LABEL } from './invoice-status';

/** Formate un numéro de facture en « FAC-0001 ». */
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

export type InvoiceGroupBy = 'none' | 'client' | 'status' | 'month';

export interface InvoiceGroup {
  key: string;
  label: string;
  invoices: Invoice[];
  subtotalCents: number;
  totalCents: number;
}

const STATUS_ORDER: InvoiceStatus[] = ['BROUILLON', 'ENVOYEE', 'PAYEE', 'ANNULEE'];

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

  const map = new Map<string, Invoice[]>();

  for (const inv of items) {
    let key: string;
    if (by === 'client') {
      key = inv.clientId;
    } else if (by === 'status') {
      key = inv.status;
    } else {
      // month
      key = inv.issueDate.slice(0, 7);
    }
    const existing = map.get(key);
    if (existing) {
      existing.push(inv);
    } else {
      map.set(key, [inv]);
    }
  }

  const groups: InvoiceGroup[] = [];

  for (const [key, groupItems] of map.entries()) {
    let label: string;
    if (by === 'client') {
      label = groupItems[0]?.client?.companyName ?? '—';
    } else if (by === 'status') {
      label = INVOICE_STATUS_LABEL[key as InvoiceStatus];
    } else {
      // month — capitalize first letter
      const monthParts = key.split('-').map(Number) as [number, number];
      const [y, m] = monthParts;
      const raw = new Intl.DateTimeFormat('fr-CA', {
        month: 'long',
        year: 'numeric',
      }).format(new Date(y, m - 1, 1));
      label = raw.charAt(0).toUpperCase() + raw.slice(1);
    }

    const sums = sumGroup(groupItems);
    groups.push({ key, label, invoices: groupItems, ...sums });
  }

  // Sort groups
  if (by === 'client') {
    groups.sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  } else if (by === 'status') {
    groups.sort(
      (a, b) =>
        STATUS_ORDER.indexOf(a.key as InvoiceStatus) -
        STATUS_ORDER.indexOf(b.key as InvoiceStatus),
    );
  } else {
    // month DESC (recent first)
    groups.sort((a, b) => b.key.localeCompare(a.key));
  }

  return groups;
}
