import type {
  CreateInvoiceRequest,
  Invoice,
  InvoiceStatus,
  Paginated,
} from '@facturation/core';
import { ApiError, apiFetch, buildApiPath, getAccessToken, httpErrorMessage } from './api';

export interface ListInvoicesParams {
  page?: number;
  pageSize?: number;
}

/** Query string pour GET /invoices. Pure, testable. */
export function buildInvoicesQuery(params: ListInvoicesParams): string {
  const sp = new URLSearchParams();
  if (params.page) sp.set('page', String(params.page));
  if (params.pageSize) sp.set('pageSize', String(params.pageSize));
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

/** Convertit une saisie en dollars (« 50 », « 50.5 », « 50,50 ») en cents entiers. Pure. */
export function dollarsToCents(input: string): number {
  const n = Number.parseFloat(input.replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/** Cents → saisie en dollars à 2 décimales. Pure. */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function listInvoices(params: ListInvoicesParams = {}): Promise<Paginated<Invoice>> {
  return apiFetch<Paginated<Invoice>>(`/invoices${buildInvoicesQuery(params)}`);
}

export function getInvoice(id: string): Promise<Invoice> {
  return apiFetch<Invoice>(`/invoices/${id}`);
}

export function createInvoice(data: CreateInvoiceRequest): Promise<Invoice> {
  return apiFetch<Invoice>('/invoices', { method: 'POST', body: JSON.stringify(data) });
}

export function updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
  return apiFetch<Invoice>(`/invoices/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function deleteInvoice(id: string): Promise<void> {
  return apiFetch<void>(`/invoices/${id}`, { method: 'DELETE' });
}

/** Télécharge le PDF d'une facture (fetch authentifié → blob → téléchargement navigateur). */
export async function downloadInvoicePdf(id: string, number: number): Promise<void> {
  const token = getAccessToken();
  const res = await fetch(buildApiPath(`/invoices/${id}/pdf`), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  if (!res.ok) {
    throw new ApiError(res.status, httpErrorMessage(res.status));
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `facture-${number}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
