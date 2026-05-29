/**
 * Client (entreprise facturée — B2B). Types partagés API ↔ front.
 * Les dates sont sérialisées en chaînes ISO sur le fil.
 */
export interface Client {
  id: string;
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

/** Enveloppe de réponse paginée. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
