import { describe, expect, it } from 'vitest';
import type { Invoice } from '@facturation/core';
import {
  formatInvoiceNumber,
  formatInvoiceRef,
  groupInvoices,
  relativeDueLabel,
} from './invoice-view';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInvoice(overrides: Partial<Invoice> & { id: string }): Invoice {
  return {
    id: overrides.id,
    number: overrides.number ?? 1,
    reference: overrides.reference ?? null,
    sequenceYear: overrides.sequenceYear ?? null,
    sequenceNo: overrides.sequenceNo ?? null,
    status: overrides.status ?? 'BROUILLON',
    clientId: overrides.clientId ?? 'client-1',
    client: overrides.client,
    projectId: null,
    billingContactId: null,
    issueDate: overrides.issueDate ?? '2024-01-15',
    dueDate: overrides.dueDate ?? null,
    notes: null,
    archivedAt: null,
    paidAt: overrides.paidAt ?? null,
    paymentMethod: overrides.paymentMethod ?? null,
    subtotalCents: overrides.subtotalCents ?? 10000,
    gstCents: overrides.gstCents ?? 500,
    qstCents: overrides.qstCents ?? 997,
    totalCents: overrides.totalCents ?? 11497,
    lines: [],
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  };
}

const TODAY = new Date(2024, 2, 15); // 2024-03-15 (month is 0-based)

// ---------------------------------------------------------------------------
// formatInvoiceNumber
// ---------------------------------------------------------------------------

describe('formatInvoiceNumber', () => {
  it('pads to 4 digits', () => {
    expect(formatInvoiceNumber(1)).toBe('FAC-0001');
  });

  it('handles 2-digit numbers', () => {
    expect(formatInvoiceNumber(42)).toBe('FAC-0042');
  });

  it('handles 4-digit numbers without extra padding', () => {
    expect(formatInvoiceNumber(1000)).toBe('FAC-1000');
  });

  it('handles numbers greater than 4 digits', () => {
    expect(formatInvoiceNumber(10000)).toBe('FAC-10000');
  });
});

// ---------------------------------------------------------------------------
// formatInvoiceRef
// ---------------------------------------------------------------------------

describe('formatInvoiceRef', () => {
  it('retourne la référence officielle si présente', () => {
    expect(formatInvoiceRef(makeInvoice({ id: 'i1', reference: 'FAC-2026-0001' }))).toBe('FAC-2026-0001');
  });

  it('retourne « Brouillon » sans référence', () => {
    expect(formatInvoiceRef(makeInvoice({ id: 'i1', reference: null }))).toBe('Brouillon');
  });
});

// ---------------------------------------------------------------------------
// relativeDueLabel
// ---------------------------------------------------------------------------

describe('relativeDueLabel', () => {
  it('returns em dash for null dueDate', () => {
    const result = relativeDueLabel(null, 'BROUILLON', TODAY);
    expect(result).toEqual({ text: '—', overdue: false });
  });

  it("returns aujourd'hui for today's date", () => {
    const result = relativeDueLabel('2024-03-15', 'ENVOYEE', TODAY);
    expect(result).toEqual({ text: "aujourd'hui", overdue: false });
  });

  it('returns future label for date in the future', () => {
    const result = relativeDueLabel('2024-03-16', 'ENVOYEE', TODAY);
    expect(result).toEqual({ text: 'dans 1 jour', overdue: false });
  });

  it('uses plural for multiple future days', () => {
    const result = relativeDueLabel('2024-03-20', 'BROUILLON', TODAY);
    expect(result).toEqual({ text: 'dans 5 jours', overdue: false });
  });

  it('marks ENVOYEE past-due as overdue (red)', () => {
    const result = relativeDueLabel('2024-03-14', 'ENVOYEE', TODAY);
    expect(result).toEqual({ text: 'il y a 1 jour', overdue: true });
  });

  it('marks BROUILLON past-due as overdue', () => {
    const result = relativeDueLabel('2024-03-10', 'BROUILLON', TODAY);
    expect(result).toEqual({ text: 'il y a 5 jours', overdue: true });
  });

  it('does NOT mark PAYEE past-due as overdue', () => {
    const result = relativeDueLabel('2024-03-01', 'PAYEE', TODAY);
    expect(result).toEqual({ text: 'il y a 14 jours', overdue: false });
  });

  it('does NOT mark ANNULEE past-due as overdue', () => {
    const result = relativeDueLabel('2024-02-01', 'ANNULEE', TODAY);
    expect(result.overdue).toBe(false);
  });

  it('uses singular for 1 day past', () => {
    const result = relativeDueLabel('2024-03-14', 'ENVOYEE', TODAY);
    expect(result.text).toBe('il y a 1 jour');
  });

  it('uses plural for multiple days past', () => {
    const result = relativeDueLabel('2024-03-13', 'ENVOYEE', TODAY);
    expect(result.text).toBe('il y a 2 jours');
  });
});

// ---------------------------------------------------------------------------
// groupInvoices
// ---------------------------------------------------------------------------

describe('groupInvoices', () => {
  const baseClient = {
    email: null,
    phone: null,
    addressLine: null,
    city: null,
    province: null,
    postalCode: null,
    country: null,
    neq: null,
    contactName: null,
    notes: null,
    archivedAt: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const inv1 = makeInvoice({
    id: 'i1',
    clientId: 'c1',
    client: { ...baseClient, id: 'c1', companyName: 'Acme Corp', type: 'COMPANY' },
    status: 'ENVOYEE',
    issueDate: '2024-03-10',
    subtotalCents: 10000,
    totalCents: 11497,
  });
  const inv2 = makeInvoice({
    id: 'i2',
    clientId: 'c2',
    client: { ...baseClient, id: 'c2', companyName: 'Beta Inc', type: 'COMPANY' },
    status: 'PAYEE',
    issueDate: '2024-02-05',
    subtotalCents: 5000,
    totalCents: 5748,
  });
  const inv3 = makeInvoice({
    id: 'i3',
    clientId: 'c1',
    client: { ...baseClient, id: 'c1', companyName: 'Acme Corp', type: 'COMPANY' },
    status: 'BROUILLON',
    issueDate: '2024-03-20',
    subtotalCents: 3000,
    totalCents: 3449,
  });

  it('none → single group with all invoices', () => {
    const groups = groupInvoices([inv1, inv2, inv3], 'none');
    expect(groups).toHaveLength(1);
    const [g0] = groups;
    expect(g0!.invoices).toHaveLength(3);
    expect(g0!.key).toBe('');
  });

  it('none → sums all subtotals and totals', () => {
    const groups = groupInvoices([inv1, inv2, inv3], 'none');
    const [g0] = groups;
    expect(g0!.subtotalCents).toBe(18000);
    expect(g0!.totalCents).toBe(20694);
  });

  describe('by client', () => {
    it('produces correct group count', () => {
      const groups = groupInvoices([inv1, inv2, inv3], 'client');
      expect(groups).toHaveLength(2);
    });

    it('groups c1 invoices together', () => {
      const groups = groupInvoices([inv1, inv2, inv3], 'client');
      const acme = groups.find((g) => g.key === 'c1');
      expect(acme).toBeDefined();
      expect(acme!.invoices).toHaveLength(2);
      expect(acme!.label).toBe('Acme Corp');
    });

    it('sums subtotals per group', () => {
      const groups = groupInvoices([inv1, inv2, inv3], 'client');
      const acme = groups.find((g) => g.key === 'c1')!;
      expect(acme.subtotalCents).toBe(13000);
      expect(acme.totalCents).toBe(14946);
    });

    it('sorts groups by label (fr)', () => {
      const groups = groupInvoices([inv1, inv2, inv3], 'client');
      const [g0, g1] = groups;
      expect(g0!.label).toBe('Acme Corp');
      expect(g1!.label).toBe('Beta Inc');
    });
  });

  describe('by status', () => {
    it('produces correct group count', () => {
      const groups = groupInvoices([inv1, inv2, inv3], 'status');
      expect(groups).toHaveLength(3);
    });

    it('uses INVOICE_STATUS_LABEL for group labels', () => {
      const groups = groupInvoices([inv1, inv2, inv3], 'status');
      const labels = groups.map((g) => g.label);
      expect(labels).toContain('Envoyée');
      expect(labels).toContain('Payée');
      expect(labels).toContain('Brouillon');
    });

    it('respects fixed status order (BROUILLON first, ANNULEE last)', () => {
      const groups = groupInvoices([inv1, inv2, inv3], 'status');
      // Order should be BROUILLON, ENVOYEE, PAYEE
      const [g0, g1, g2] = groups;
      expect(g0!.label).toBe('Brouillon');
      expect(g1!.label).toBe('Envoyée');
      expect(g2!.label).toBe('Payée');
    });
  });

  describe('par mois de facturation (issueMonth)', () => {
    it('produit le bon nombre de groupes', () => {
      const groups = groupInvoices([inv1, inv2, inv3], 'issueMonth');
      expect(groups).toHaveLength(2);
    });

    it('regroupe par clé YYYY-MM', () => {
      const groups = groupInvoices([inv1, inv2, inv3], 'issueMonth');
      const marchGroup = groups.find((g) => g.key === '2024-03');
      expect(marchGroup).toBeDefined();
      expect(marchGroup!.invoices).toHaveLength(2);
    });

    it('trie DESC (plus récent en premier)', () => {
      const groups = groupInvoices([inv1, inv2, inv3], 'issueMonth');
      const [g0, g1] = groups;
      expect(g0!.key).toBe('2024-03');
      expect(g1!.key).toBe('2024-02');
    });

    it('met une majuscule au libellé du mois', () => {
      const groups = groupInvoices([inv1, inv2, inv3], 'issueMonth');
      const march = groups.find((g) => g.key === '2024-03')!;
      expect(march.label.charAt(0)).toBe(march.label.charAt(0).toUpperCase());
      expect(march.label.charAt(0)).not.toBe(march.label.charAt(0).toLowerCase());
    });
  });

  describe('par trimestre de facturation (issueQuarter)', () => {
    it('regroupe Février et Mars dans T1 2024', () => {
      const groups = groupInvoices([inv1, inv2, inv3], 'issueQuarter');
      expect(groups).toHaveLength(1);
      expect(groups[0]!.key).toBe('2024-Q1');
      expect(groups[0]!.label).toBe('T1 2024');
      expect(groups[0]!.invoices).toHaveLength(3);
    });
  });

  describe('par année de facturation (issueYear)', () => {
    it('regroupe tout 2024 ensemble', () => {
      const groups = groupInvoices([inv1, inv2, inv3], 'issueYear');
      expect(groups).toHaveLength(1);
      expect(groups[0]!.key).toBe('2024');
      expect(groups[0]!.label).toBe('2024');
    });
  });

  describe("par date d'échéance (dueMonth)", () => {
    const withDue = makeInvoice({
      id: 'i4',
      clientId: 'c1',
      client: { ...baseClient, id: 'c1', companyName: 'Acme Corp', type: 'COMPANY' },
      issueDate: '2024-03-10',
      dueDate: '2024-05-15',
    });

    it("regroupe les factures sans échéance sous « Sans échéance » (en dernier)", () => {
      const groups = groupInvoices([inv1, inv2, withDue], 'dueMonth');
      const sansEcheance = groups.find((g) => g.key === '');
      expect(sansEcheance).toBeDefined();
      expect(sansEcheance!.label).toBe('Sans échéance');
      expect(sansEcheance!.invoices).toHaveLength(2); // inv1 + inv2 (dueDate null)
      // groupe daté présent
      expect(groups.find((g) => g.key === '2024-05')?.invoices).toHaveLength(1);
      // « Sans échéance » (clé vide) trié en dernier
      expect(groups[groups.length - 1]!.key).toBe('');
    });
  });
});
