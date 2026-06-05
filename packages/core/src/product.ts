/**
 * Produit / service du catalogue (lignes de facture réutilisables).
 * Les dates sont sérialisées en chaînes ISO sur le fil.
 */

export interface Product {
  id: string;
  name: string;
  description: string | null;
  unitPriceCents: number;
  /** Unité libre : « heure », « forfait », « unité », etc. */
  unit: string | null;
  isActive: boolean;
  /** Date d'archivage (ISO) ; null si actif. */
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductRequest {
  name: string;
  description?: string | null;
  unitPriceCents: number;
  unit?: string | null;
  isActive?: boolean;
}

export type UpdateProductRequest = Partial<CreateProductRequest>;
