import type {
  AuthTokens,
  AuthUser,
  CreateUserRequest,
  LoginRequest,
  MeResponse,
  ResetPasswordRequest,
  UpdateUserRequest,
} from '@facturation/core';

// ---------------------------------------------------------------------------
// Fonctions PURES testables (construction d'URL, parsing)
// ---------------------------------------------------------------------------

/** Base de l'API côté client — toujours via le proxy Vite. */
export const API_BASE = '/api';

/** Construit un chemin d'API à partir du préfixe client. Pure, testable. */
export function buildApiPath(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}

/** Construit l'URL du endpoint de santé à partir d'une base. Pure, testable. */
export function healthUrl(baseUrl: string = API_BASE): string {
  return `${baseUrl.replace(/\/$/, '')}/health`;
}

/**
 * Calcule le délai de re-refresh en ms : (expiresInSec - 60) secondes,
 * minimum 10 secondes. Pure, testable.
 */
export function refreshDelayMs(expiresInSec: number): number {
  const delaySec = Math.max(expiresInSec - 60, 10);
  return delaySec * 1000;
}

/**
 * Interprète un code HTTP en message d'erreur lisible. Pure, testable.
 */
export function httpErrorMessage(status: number): string {
  switch (status) {
    case 401:
      return 'Non autorisé';
    case 403:
      return 'Accès interdit';
    case 404:
      return 'Ressource introuvable';
    case 409:
      return 'Email déjà utilisé';
    case 429:
      return 'Trop de tentatives, réessayez plus tard';
    default:
      return `Erreur HTTP ${status}`;
  }
}

// ---------------------------------------------------------------------------
// Gestion de l'access token en mémoire (jamais en localStorage)
// ---------------------------------------------------------------------------

let _accessToken: string | null = null;

export function getAccessToken(): string | null {
  return _accessToken;
}

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

// ---------------------------------------------------------------------------
// apiFetch : fetch authentifié avec auto-refresh sur 401
// ---------------------------------------------------------------------------

/** Erreur métier avec code HTTP. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RefreshFn = () => Promise<string | null>;
let _refreshFn: RefreshFn | null = null;

/** Enregistre la fonction de refresh (appelée depuis AuthProvider). */
export function registerRefreshFn(fn: RefreshFn): void {
  _refreshFn = fn;
}

/**
 * Wrapper fetch authentifié.
 * - Ajoute Authorization: Bearer si un token est en mémoire.
 * - Toujours credentials:'include' pour le cookie httpOnly.
 * - Sur 401 : tente un refresh UNIQUE puis rejoue la requête.
 * - Lance ApiError sur erreur HTTP.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retried = false,
): Promise<T> {
  const url = buildApiPath(path);
  const token = getAccessToken();

  const headers = new Headers(options.headers);
  // Ne pas forcer le Content-Type pour FormData : le navigateur fixe la frontière multipart.
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && !retried && _refreshFn) {
    const newToken = await _refreshFn();
    if (newToken) {
      setAccessToken(newToken);
      return apiFetch<T>(path, options, true);
    }
    setAccessToken(null);
    throw new ApiError(401, httpErrorMessage(401));
  }

  if (!response.ok) {
    // Privilégie le message renvoyé par le serveur (NestJS) si présent.
    let message = httpErrorMessage(response.status);
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) {
        message = body.message.join(', ');
      } else if (typeof body.message === 'string' && body.message.trim()) {
        message = body.message;
      }
    } catch {
      /* pas de corps JSON exploitable */
    }
    throw new ApiError(response.status, message);
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Endpoints Auth
// ---------------------------------------------------------------------------

/** POST /api/auth/login */
export async function login(credentials: LoginRequest): Promise<AuthTokens> {
  return apiFetch<AuthTokens>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

/**
 * POST /api/auth/refresh — ne passe pas par apiFetch car pas de token Bearer.
 * Retourne les tokens si succès, null si 401.
 */
export async function refreshTokens(): Promise<AuthTokens | null> {
  const url = buildApiPath('/auth/refresh');
  try {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.status === 200) {
      return response.json() as Promise<AuthTokens>;
    }
    return null;
  } catch {
    return null;
  }
}

/** POST /api/auth/logout — nécessite un token Bearer. */
export async function logout(): Promise<void> {
  return apiFetch<void>('/auth/logout', { method: 'POST' });
}

/** GET /api/auth/me — retourne l'utilisateur courant. */
export async function me(): Promise<MeResponse> {
  return apiFetch<MeResponse>('/auth/me');
}

// ---------------------------------------------------------------------------
// Endpoints Users (ADMIN uniquement)
// ---------------------------------------------------------------------------

/** GET /api/users */
export async function listUsers(): Promise<AuthUser[]> {
  return apiFetch<AuthUser[]>('/users');
}

/** POST /api/users */
export async function createUser(data: CreateUserRequest): Promise<AuthUser> {
  return apiFetch<AuthUser>('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** GET /api/users/:id */
export async function getUser(id: string): Promise<AuthUser> {
  return apiFetch<AuthUser>(`/users/${id}`);
}

/** PATCH /api/users/:id */
export async function updateUser(id: string, data: UpdateUserRequest): Promise<AuthUser> {
  return apiFetch<AuthUser>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** DELETE /api/users/:id */
export async function deleteUser(id: string): Promise<void> {
  return apiFetch<void>(`/users/${id}`, { method: 'DELETE' });
}

/** PATCH /api/users/:id/password */
export async function resetUserPassword(
  id: string,
  password: ResetPasswordRequest['password'],
): Promise<void> {
  return apiFetch<void>(`/users/${id}/password`, {
    method: 'PATCH',
    body: JSON.stringify({ password } satisfies ResetPasswordRequest),
  });
}
