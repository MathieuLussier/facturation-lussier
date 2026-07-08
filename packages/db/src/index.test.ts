import { describe, it, expect } from 'vitest';
import { prisma } from './index';

/**
 * L'instanciation de PrismaClient est paresseuse (aucune connexion tant qu'aucune
 * requête n'est émise), donc ces tests ne nécessitent pas de base.
 */
describe('@facturation/db', () => {
  it('exporte un singleton prisma exposant l’API client', () => {
    expect(prisma).toBeDefined();
    // On évite toBeInstanceOf (le proxy Prisma fait déboucler la sérialisation) :
    // on vérifie la présence des méthodes du client.
    expect(typeof prisma.$connect).toBe('function');
    expect(typeof prisma.$disconnect).toBe('function');
    expect(typeof prisma.$transaction).toBe('function');
  });

  it('réutilise le même singleton entre imports (cache global hors production)', async () => {
    const again = (await import('./index')).prisma;
    expect(again).toBe(prisma);
  });
});
