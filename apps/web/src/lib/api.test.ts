import { describe, expect, it } from 'vitest';
import {
  buildApiPath,
  healthUrl,
  httpErrorMessage,
  refreshDelayMs,
} from './api';

describe('buildApiPath', () => {
  it('préfixe un chemin avec /api', () => {
    expect(buildApiPath('/auth/login')).toBe('/api/auth/login');
  });

  it('gère un chemin sans slash initial', () => {
    expect(buildApiPath('auth/login')).toBe('/api/auth/login');
  });
});

describe('healthUrl', () => {
  it("construit l'URL de sante depuis une base", () => {
    expect(healthUrl('http://localhost:3000')).toBe('http://localhost:3000/health');
  });

  it('supprime le slash final de la base', () => {
    expect(healthUrl('http://localhost:3000/')).toBe('http://localhost:3000/health');
  });

  it('utilise /api par défaut', () => {
    expect(healthUrl()).toBe('/api/health');
  });
});

describe('refreshDelayMs', () => {
  it('retourne (expiresInSec - 60) * 1000', () => {
    expect(refreshDelayMs(3600)).toBe(3540 * 1000);
  });

  it('garantit un minimum de 10 secondes', () => {
    expect(refreshDelayMs(30)).toBe(10 * 1000);
    expect(refreshDelayMs(0)).toBe(10 * 1000);
  });
});

describe('httpErrorMessage', () => {
  it('retourne le message FR pour 401', () => {
    expect(httpErrorMessage(401)).toBe('Non autorisé');
  });

  it('retourne le message FR pour 403', () => {
    expect(httpErrorMessage(403)).toBe('Accès interdit');
  });

  it('retourne le message FR pour 409', () => {
    expect(httpErrorMessage(409)).toBe('Email déjà utilisé');
  });

  it('retourne le message FR pour 429', () => {
    expect(httpErrorMessage(429)).toBe('Trop de tentatives, réessayez plus tard');
  });

  it('retourne un message générique pour les codes inconnus', () => {
    expect(httpErrorMessage(500)).toBe('Erreur HTTP 500');
  });
});
