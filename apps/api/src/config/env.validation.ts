/**
 * Validation des variables d'environnement requises au démarrage.
 * L'application refuse de démarrer si l'une d'elles est manquante.
 */

const REQUIRED_VARS = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
] as const;

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const missing: string[] = [];

  for (const key of REQUIRED_VARS) {
    const value = config[key];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Variables d'environnement manquantes : ${missing.join(', ')}. ` +
      "Vérifiez votre fichier .env.",
    );
  }

  // Validation de format des variables optionnelles (valeurs par défaut sinon).
  const cookieSecure = config['COOKIE_SECURE'];
  if (cookieSecure !== undefined && cookieSecure !== 'true' && cookieSecure !== 'false') {
    throw new Error("COOKIE_SECURE doit valoir 'true' ou 'false'.");
  }

  for (const ttlKey of ['ACCESS_TTL', 'REFRESH_TTL'] as const) {
    const raw = config[ttlKey];
    if (raw !== undefined) {
      const seconds = Number(raw);
      if (!Number.isInteger(seconds) || seconds <= 0) {
        throw new Error(`${ttlKey} doit être un entier positif (secondes).`);
      }
    }
  }

  return config;
}
