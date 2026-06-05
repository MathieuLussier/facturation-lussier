import type { IssuerProfile, UpsertIssuerRequest } from '@facturation/core';
import { apiFetch, API_BASE } from './api';

export function getIssuer(): Promise<IssuerProfile | null> {
  return apiFetch<IssuerProfile | null>('/issuer');
}

export function upsertIssuer(data: UpsertIssuerRequest): Promise<IssuerProfile> {
  return apiFetch<IssuerProfile>('/issuer', { method: 'PUT', body: JSON.stringify(data) });
}

/** Téléverse le logo de l'entreprise (multipart). Retourne le profil mis à jour. */
export function uploadIssuerLogo(file: File): Promise<IssuerProfile> {
  const formData = new FormData();
  formData.append('logo', file);
  return apiFetch<IssuerProfile>('/issuer/logo', { method: 'POST', body: formData });
}

/** URL publique d'affichage d'un logo téléversé (via le proxy /api → /uploads). */
export function issuerLogoUrl(logoPath: string): string {
  return `${API_BASE}/${logoPath}`;
}
