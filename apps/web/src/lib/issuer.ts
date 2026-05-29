import type { IssuerProfile, UpsertIssuerRequest } from '@facturation/core';
import { apiFetch } from './api';

export function getIssuer(): Promise<IssuerProfile | null> {
  return apiFetch<IssuerProfile | null>('/issuer');
}

export function upsertIssuer(data: UpsertIssuerRequest): Promise<IssuerProfile> {
  return apiFetch<IssuerProfile>('/issuer', { method: 'PUT', body: JSON.stringify(data) });
}
