/**
 * Setup jest : valeurs par défaut d'environnement pour que la suite (dont
 * auth.e2e.spec, qui charge AppModule → validateEnv) démarre SANS `.env`. Les
 * vraies valeurs (CI ou `.env` via dotenv) prennent le dessus si déjà définies.
 *
 * Note : les tests e2e ont tout de même besoin d'un PostgreSQL joignable
 * (DATABASE_URL) ; ce setup ne fait que débloquer le chargement du module.
 */
process.env.NODE_ENV ??= 'test';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-not-for-prod';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-not-for-prod';

export {};
