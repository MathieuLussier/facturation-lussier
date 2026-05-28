const DEFAULT_API_URL = 'http://localhost:3000';

/** URL de base de l'API, depuis VITE_API_URL ou la valeur par défaut locale. */
export function getApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL;
  return typeof fromEnv === 'string' && fromEnv.length > 0 ? fromEnv : DEFAULT_API_URL;
}

/** Construit l'URL du endpoint de santé à partir d'une base. */
export function healthUrl(baseUrl: string = getApiBaseUrl()): string {
  return `${baseUrl.replace(/\/$/, '')}/health`;
}
