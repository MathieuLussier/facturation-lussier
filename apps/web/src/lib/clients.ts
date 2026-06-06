import type {
  Client,
  CreateClientRequest,
  DirectoryEntry,
  Paginated,
  UpdateClientRequest,
} from '@facturation/core';
import { apiFetch } from './api';

export interface ListClientsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  /** true → afficher uniquement les clients archivés (sinon, uniquement les actifs). */
  archivedOnly?: boolean;
}

/** Construit la query string pour GET /clients. Pure, testable. */
export function buildClientsQuery(params: ListClientsParams): string {
  const sp = new URLSearchParams();
  if (params.page) sp.set('page', String(params.page));
  if (params.pageSize) sp.set('pageSize', String(params.pageSize));
  if (params.search && params.search.trim()) sp.set('search', params.search.trim());
  if (params.archivedOnly) sp.set('archivedOnly', 'true');
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export function listClients(params: ListClientsParams = {}): Promise<Paginated<Client>> {
  return apiFetch<Paginated<Client>>(`/clients${buildClientsQuery(params)}`);
}

export function getClientsDirectory(params: ListClientsParams = {}): Promise<Paginated<DirectoryEntry>> {
  return apiFetch<Paginated<DirectoryEntry>>(`/clients/directory${buildClientsQuery(params)}`);
}

export function getClient(id: string): Promise<Client> {
  return apiFetch<Client>(`/clients/${id}`);
}

export function createClient(data: CreateClientRequest): Promise<Client> {
  return apiFetch<Client>('/clients', { method: 'POST', body: JSON.stringify(data) });
}

export function updateClient(id: string, data: UpdateClientRequest): Promise<Client> {
  return apiFetch<Client>(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteClient(id: string): Promise<void> {
  return apiFetch<void>(`/clients/${id}`, { method: 'DELETE' });
}

export function archiveClient(id: string): Promise<Client> {
  return apiFetch<Client>(`/clients/${id}/archive`, { method: 'PATCH' });
}

export function unarchiveClient(id: string): Promise<Client> {
  return apiFetch<Client>(`/clients/${id}/unarchive`, { method: 'PATCH' });
}
