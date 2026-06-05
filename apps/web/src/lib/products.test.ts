import { describe, expect, it } from 'vitest';
import { buildProductsQuery } from './products';

describe('buildProductsQuery', () => {
  it('vide sans paramètre', () => {
    expect(buildProductsQuery({})).toBe('');
  });

  it('sérialise page et pageSize', () => {
    expect(buildProductsQuery({ page: 2, pageSize: 10 })).toBe('?page=2&pageSize=10');
  });

  it('inclut la recherche (trim) et les archivés', () => {
    expect(buildProductsQuery({ search: '  consult ', includeArchived: true })).toBe(
      '?search=consult&includeArchived=true',
    );
  });

  it('ignore une recherche vide', () => {
    expect(buildProductsQuery({ search: '   ' })).toBe('');
  });
});
