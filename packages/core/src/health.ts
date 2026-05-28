/**
 * Contrat de santé partagé entre l'API et le frontend.
 * Sert à prouver le câblage de bout en bout (web → api → db) et le partage de types.
 */
export interface Health {
  status: 'ok' | 'degraded';
  /** true si la base de données répond. */
  db: boolean;
}

/** Construit un objet {@link Health} de façon immuable à partir de l'état de la base. */
export function createHealth(dbReachable: boolean): Health {
  return {
    status: dbReachable ? 'ok' : 'degraded',
    db: dbReachable,
  };
}
