import type { Contact } from './contact';

export type ProjectStatus = 'ACTIF' | 'TERMINE';

/** Projet rattaché à une entreprise, avec ses contacts de facturation. */
export interface Project {
  id: string;
  companyId: string;
  name: string;
  status: ProjectStatus;
  notes: string | null;
  /** Contacts de facturation rattachés au projet (relation plusieurs-à-plusieurs). */
  billingContacts: Contact[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  companyId: string;
  name: string;
  status?: ProjectStatus;
  notes?: string | null;
  /** Ids des contacts de facturation (doivent appartenir à l'entreprise). */
  billingContactIds: string[];
}

export type UpdateProjectRequest = Partial<Omit<CreateProjectRequest, 'companyId'>>;
