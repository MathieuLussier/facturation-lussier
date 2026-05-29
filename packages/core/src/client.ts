/**
 * Client (entreprise OU particulier facturé). Types partagés API ↔ front.
 * Les dates sont sérialisées en chaînes ISO sur le fil.
 */

/** Type de client : société (entreprise) ou particulier (personne). */
export type ClientType = 'COMPANY' | 'INDIVIDUAL';

export interface Client {
  id: string;
  type: ClientType;
  /** Nom : raison sociale (société) ou nom complet (particulier). */
  companyName: string;
  email: string | null;
  phone: string | null;
  addressLine: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  /** Numéro d'entreprise du Québec (NEQ). */
  neq: string | null;
  contactName: string | null;
  notes: string | null;
  /** Date d'archivage (ISO) ; null si actif. */
  archivedAt: string | null;
  /** Calculé serveur : suppression définitive possible (aucune donnée rattachée). */
  deletable?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientRequest {
  /** Défaut COMPANY si absent. */
  type?: ClientType;
  companyName: string;
  email?: string | null;
  phone?: string | null;
  addressLine?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string | null;
  neq?: string | null;
  contactName?: string | null;
  notes?: string | null;
}

export type UpdateClientRequest = Partial<CreateClientRequest>;

/** Catégorie d'une entrée de l'annuaire Clients unifié. */
export type DirectoryKind = 'company' | 'individual' | 'contact';

/**
 * Entrée de l'annuaire Clients unifié (grille) : une entreprise, un particulier
 * ou un contact rattaché à une entreprise.
 */
export interface DirectoryEntry {
  kind: DirectoryKind;
  /** id du Client (company/individual) ou du Contact. */
  id: string;
  name: string;
  subtitle: string | null;
  /** Entreprise parente pour un contact ; null sinon. */
  companyId: string | null;
  archivedAt: string | null;
}

/** Enveloppe de réponse paginée. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
