import { describe, expect, it } from 'vitest';
import { buildProductsQuery } from './products';

describe('buildProductsQuery', () => {
  it('vide sans paramètre', () => {
    expect(buildProductsQuery({})).toBe('');
  });

  it('sérialise page et pageSize', () => {
    expect(buildProductsQuery({ page: 2, pageSize: 10 })).toBe('?page=2&pageSize=10');
  });

  it('inclut la recherche (trim) et archivedOnly', () => {
    expect(buildProductsQuery({ search: '  consult ', archivedOnly: true })).toBe(
      '?search=consult&archivedOnly=true',
    );
  });

  it('ignore une recherche vide', () => {
    expect(buildProductsQuery({ search: '   ' })).toBe('');
  });
});
