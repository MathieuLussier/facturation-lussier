/**
 * Contrat d'authentification partagé entre l'API et le frontend.
 * Aucune dépendance NestJS, Prisma ou toute librairie externe.
 */

// ---------------------------------------------------------------------------
// Rôles
// ---------------------------------------------------------------------------

/** Rôles possibles d'un utilisateur dans l'application. */
export type Role = 'ADMIN' | 'MEMBER';

// ---------------------------------------------------------------------------
// Modèle utilisateur sûr (jamais de hash de mot de passe)
// ---------------------------------------------------------------------------

/**
 * Représentation publique d'un utilisateur.
 * Le champ `passwordHash` n'est JAMAIS inclus dans ce type.
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  /**
   * Calculé serveur (vues ADMIN /users) : suppression définitive possible
   * (l'utilisateur n'a créé aucune facture ni entreprise). Absent ailleurs.
   */
  deletable?: boolean;
}

// ---------------------------------------------------------------------------
// Requêtes et réponses d'authentification
// ---------------------------------------------------------------------------

/** Corps de la requête de connexion. */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Tokens renvoyés après une connexion réussie ou un refresh.
 * L'access token est renvoyé en JSON ; le refresh token est positionné
 * dans un cookie httpOnly par le serveur (absent de ce type).
 */
export interface AuthTokens {
  accessToken: string;
  /** Durée de vie de l'access token en secondes. */
  expiresInSec: number;
}

/** Réponse du endpoint GET /auth/me — identique à AuthUser. */
export type MeResponse = AuthUser;

// ---------------------------------------------------------------------------
// Gestion des utilisateurs (opérations ADMIN)
// ---------------------------------------------------------------------------

/** Corps de la requête de création d'un utilisateur (réservé aux ADMINs). */
export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  role: Role;
}

/**
 * Corps de la requête de mise à jour d'un utilisateur.
 * Tous les champs sont optionnels ; le mot de passe ne peut pas être
 * modifié via cette route (prévoir un endpoint dédié si nécessaire).
 */
export interface UpdateUserRequest {
  email?: string;
  name?: string;
  role?: Role;
  isActive?: boolean;
}

/** Corps de la réinitialisation de mot de passe par un ADMIN. */
export interface ResetPasswordRequest {
  password: string;
}
