import { describe, expect, it } from 'vitest';
import { buildClientsQuery } from './clients';

describe('buildClientsQuery', () => {
  it('retourne une chaîne vide sans paramètre', () => {
    expect(buildClientsQuery({})).toBe('');
  });

  it('sérialise page, pageSize et search', () => {
    expect(buildClientsQuery({ page: 2, pageSize: 10, search: 'acme' })).toBe(
      '?page=2&pageSize=10&search=acme',
    );
  });

  it('ignore une recherche vide ou en espaces', () => {
    expect(buildClientsQuery({ search: '   ' })).toBe('');
  });
});
