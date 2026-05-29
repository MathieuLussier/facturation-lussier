import type { Contact, CreateContactRequest, UpdateContactRequest } from '@facturation/core';
import { apiFetch } from './api';

export function listContacts(
  companyId: string,
  opts: { includeArchived?: boolean } = {},
): Promise<Contact[]> {
  const archived = opts.includeArchived ? '&includeArchived=true' : '';
  return apiFetch<Contact[]>(`/contacts?companyId=${encodeURIComponent(companyId)}${archived}`);
}

export function getContact(id: string): Promise<Contact> {
  return apiFetch<Contact>(`/contacts/${id}`);
}

export function createContact(data: CreateContactRequest): Promise<Contact> {
  return apiFetch<Contact>('/contacts', { method: 'POST', body: JSON.stringify(data) });
}

export function updateContact(id: string, data: UpdateContactRequest): Promise<Contact> {
  return apiFetch<Contact>(`/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteContact(id: string): Promise<void> {
  return apiFetch<void>(`/contacts/${id}`, { method: 'DELETE' });
}

export function archiveContact(id: string): Promise<Contact> {
  return apiFetch<Contact>(`/contacts/${id}/archive`, { method: 'PATCH' });
}

export function unarchiveContact(id: string): Promise<Contact> {
  return apiFetch<Contact>(`/contacts/${id}/unarchive`, { method: 'PATCH' });
}
