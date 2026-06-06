import { describe, expect, it } from 'vitest';
import { formatPhone, formatPostalCode, isValidPhone, isValidPostalCode } from './format';

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

describe('isValidPhone', () => {
  it('vide → valide (optionnel)', () => {
    expect(isValidPhone('')).toBe(true);
  });
  it('10 chiffres / +1 → valides', () => {
    expect(isValidPhone('(438) 889-4324')).toBe(true);
    expect(isValidPhone('+1 (438) 889-4324')).toBe(true);
  });
  it('partiel → invalide', () => {
    expect(isValidPhone('(438) 889')).toBe(false);
    expect(isValidPhone('+1')).toBe(false);
  });
});

describe('isValidPostalCode', () => {
  it('vide → valide', () => {
    expect(isValidPostalCode('')).toBe(true);
  });
  it('format A1A 1A1 → valide (avec ou sans espace)', () => {
    expect(isValidPostalCode('J0L 1H0')).toBe(true);
    expect(isValidPostalCode('J0L1H0')).toBe(true);
  });
  it('incomplet ou mauvais format → invalide', () => {
    expect(isValidPostalCode('J0L 1')).toBe(false);
    expect(isValidPostalCode('12345')).toBe(false);
  });
});
