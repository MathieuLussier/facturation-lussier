import { describe, expect, it } from 'vitest';
import { computeInvoiceTotals, computeLineAmountCents, formatCents } from './invoice';

describe('computeLineAmountCents', () => {
  it('arrondit quantité × prix unitaire au cent', () => {
    expect(computeLineAmountCents(2.5, 4000)).toBe(10000);
    expect(computeLineAmountCents(1.333, 100)).toBe(133);
  });
});

describe('computeInvoiceTotals', () => {
  it('applique TPS 5 % et TVQ 9,975 % sur le sous-total', () => {
    expect(computeInvoiceTotals([{ quantity: 1, unitPriceCents: 10000 }])).toEqual({
      subtotalCents: 10000,
      gstCents: 500,
      qstCents: 998, // round(997.5)
      totalCents: 11498,
    });
  });

  it('somme plusieurs lignes (dont quantités décimales)', () => {
    const t = computeInvoiceTotals([
      { quantity: 2, unitPriceCents: 5000 },
      { quantity: 0.5, unitPriceCents: 10000 },
    ]);
    expect(t.subtotalCents).toBe(15000);
    expect(t.gstCents).toBe(750);
    expect(t.qstCents).toBe(1496); // round(1496.25)
    expect(t.totalCents).toBe(17246);
  });

  it('retourne des zéros sans ligne', () => {
    expect(computeInvoiceTotals([])).toEqual({
      subtotalCents: 0,
      gstCents: 0,
      qstCents: 0,
      totalCents: 0,
    });
  });
});

describe('formatCents', () => {
  it('formate un montant en devise canadienne', () => {
    expect(formatCents(11498)).toContain('114,98');
  });
});
