/**
 * Profil de l'entreprise émettrice (Lussier) — singleton.
 * Sert d'en-tête des factures (coordonnées + numéros de taxe TPS/TVQ).
 */
export interface IssuerProfile {
  id: string;
  legalName: string;
  email: string | null;
  phone: string | null;
  addressLine: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  /** Numéro d'inscription TPS. */
  gstNumber: string | null;
  /** Numéro d'inscription TVQ. */
  qstNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertIssuerRequest {
  legalName: string;
  email?: string | null;
  phone?: string | null;
  addressLine?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string | null;
  gstNumber?: string | null;
  qstNumber?: string | null;
}
