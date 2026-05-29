/** Contact (personne) rattaché à une entreprise. */
export interface Contact {
  id: string;
  companyId: string;
  name: string;
  email: string | null;
  phone: string | null;
  /** Poste / fonction. */
  title: string | null;
  /** true si ce contact est un contact de facturation. */
  isBillingContact: boolean;
  notes: string | null;
  /** Date d'archivage (ISO) ; null si actif. */
  archivedAt: string | null;
  /** Calculé serveur : suppression définitive possible (aucune référence). */
  deletable?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactRequest {
  companyId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  isBillingContact?: boolean;
  notes?: string | null;
}

export type UpdateContactRequest = Partial<Omit<CreateContactRequest, 'companyId'>>;
