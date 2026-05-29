import { describe, expect, it } from 'vitest';
import { buildInvoicesQuery, centsToInput, dollarsToCents } from './invoices';

describe('buildInvoicesQuery', () => {
  it('vide sans paramètre', () => {
    expect(buildInvoicesQuery({})).toBe('');
  });
  it('sérialise page et pageSize', () => {
    expect(buildInvoicesQuery({ page: 3, pageSize: 25 })).toBe('?page=3&pageSize=25');
  });
});

describe('dollarsToCents', () => {
  it('convertit les dollars en cents', () => {
    expect(dollarsToCents('50')).toBe(5000);
    expect(dollarsToCents('50.50')).toBe(5050);
    expect(dollarsToCents('50,75')).toBe(5075);
  });
  it('retourne 0 pour une saisie invalide', () => {
    expect(dollarsToCents('')).toBe(0);
    expect(dollarsToCents('abc')).toBe(0);
  });
});

describe('centsToInput', () => {
  it('formate les cents en dollars à 2 décimales', () => {
    expect(centsToInput(5000)).toBe('50.00');
    expect(centsToInput(12345)).toBe('123.45');
  });
});
