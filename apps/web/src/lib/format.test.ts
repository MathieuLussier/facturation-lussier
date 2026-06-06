import { describe, expect, it } from 'vitest';
import { formatPhone, formatPostalCode } from './format';

describe('formatPhone', () => {
  it('formate 10 chiffres', () => {
    expect(formatPhone('4388894324')).toBe('(438) 889-4324');
  });
  it('ajoute +1 quand le numéro commence par 1', () => {
    expect(formatPhone('14388894324')).toBe('+1 (438) 889-4324');
  });
  it('formate une saisie partielle', () => {
    expect(formatPhone('438')).toBe('(438');
    expect(formatPhone('438889')).toBe('(438) 889');
  });
  it('ignore les caractères non numériques déjà présents', () => {
    expect(formatPhone('(438) 889-4324')).toBe('(438) 889-4324');
  });
  it('tronque au-delà de 10 chiffres (sans indicatif)', () => {
    expect(formatPhone('43888943249999')).toBe('(438) 889-4324');
  });
});

describe('formatPostalCode', () => {
  it('met en majuscules et ajoute une espace', () => {
    expect(formatPostalCode('j0l1h0')).toBe('J0L 1H0');
  });
  it('gère une saisie partielle', () => {
    expect(formatPostalCode('j0l')).toBe('J0L');
    expect(formatPostalCode('j0l1')).toBe('J0L 1');
  });
  it('retire les caractères invalides et tronque à 6', () => {
    expect(formatPostalCode('J0L 1H0 99')).toBe('J0L 1H0');
  });
});
