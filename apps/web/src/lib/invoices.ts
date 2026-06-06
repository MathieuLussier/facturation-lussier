import type {
  CreateInvoiceRequest,
  Invoice,
  InvoiceAttachment,
  InvoiceStats,
  InvoiceStatus,
  Paginated,
  PaymentMethod,
  SendInvoiceRequest,
  SendInvoiceResponse,
  UpdateInvoiceRequest,
} from '@facturation/core';
import { ApiError, apiFetch, buildApiPath, getAccessToken, httpErrorMessage } from './api';

export interface ListInvoicesParams {
  page?: number;
  pageSize?: number;
  /** true → afficher uniquement les factures archivées (sinon, uniquement les actives). */
  archivedOnly?: boolean;
  /** Filtrer par statut. */
  status?: InvoiceStatus;
  /** Seulement les factures ENVOYÉE en retard. */
  overdue?: boolean;
}

/** Query string pour GET /invoices. Pure, testable. */
export function buildInvoicesQuery(params: ListInvoicesParams): string {
  const sp = new URLSearchParams();
  if (params.page) sp.set('page', String(params.page));
  if (params.pageSize) sp.set('pageSize', String(params.pageSize));
  if (params.archivedOnly) sp.set('archivedOnly', 'true');
  if (params.status) sp.set('status', params.status);
  if (params.overdue) sp.set('overdue', 'true');
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

export function getInvoiceStats(): Promise<InvoiceStats> {
  return apiFetch<InvoiceStats>('/invoices/stats');
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

/** Édite le contenu d'une facture (BROUILLON ou ENVOYEE). */
export function updateInvoice(id: string, data: UpdateInvoiceRequest): Promise<Invoice> {
  return apiFetch<Invoice>(`/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

/**
 * Change le statut d'une facture. Pour PAYEE, fournir paidAt + paymentMethod
 * (la facture est marquée payée avec date + mode).
 */
export function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus,
  paidAt?: string,
  paymentMethod?: PaymentMethod,
): Promise<Invoice> {
  return apiFetch<Invoice>(`/invoices/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({
      status,
      ...(paidAt ? { paidAt } : {}),
      ...(paymentMethod ? { paymentMethod } : {}),
    }),
  });
}

/** Envoie la facture par courriel (PDF joint). Finalise un brouillon (FAC-AAAA + ENVOYEE). */
export function sendInvoice(id: string, data: SendInvoiceRequest): Promise<SendInvoiceResponse> {
  return apiFetch<SendInvoiceResponse>(`/invoices/${id}/send`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Envoie un rappel de paiement par courriel (facture ENVOYEE). */
export function sendInvoiceReminder(id: string, data: SendInvoiceRequest): Promise<{ sent: boolean }> {
  return apiFetch<{ sent: boolean }>(`/invoices/${id}/remind`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteInvoice(id: string): Promise<void> {
  return apiFetch<void>(`/invoices/${id}`, { method: 'DELETE' });
}

export function archiveInvoice(id: string): Promise<Invoice> {
  return apiFetch<Invoice>(`/invoices/${id}/archive`, { method: 'PATCH' });
}

export function unarchiveInvoice(id: string): Promise<Invoice> {
  return apiFetch<Invoice>(`/invoices/${id}/unarchive`, { method: 'PATCH' });
}

/** Ouvre le PDF d'une facture dans un nouvel onglet (pour impression). */
export async function openInvoicePdf(id: string): Promise<void> {
  // Ouvrir l'onglet de façon synchrone (geste utilisateur) pour éviter le bloqueur de popups.
  const win = window.open('', '_blank');
  const token = getAccessToken();
  const res = await fetch(buildApiPath(`/invoices/${id}/pdf`), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  if (!res.ok) {
    win?.close();
    throw new ApiError(res.status, httpErrorMessage(res.status));
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  if (win) {
    win.location.href = url;
  } else {
    // Popup bloquée : repli sur un téléchargement.
    const a = document.createElement('a');
    a.href = url;
    a.download = `facture-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Télécharge le PDF d'une facture (fetch authentifié → blob → téléchargement navigateur). */
export async function downloadInvoicePdf(id: string, refOrNumber: string | number): Promise<void> {
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
  a.download = `facture-${refOrNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Pièces jointes (les endpoints retournent la liste à jour)
// ---------------------------------------------------------------------------

export function uploadInvoiceAttachment(invoiceId: string, file: File): Promise<InvoiceAttachment[]> {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch<InvoiceAttachment[]>(`/invoices/${invoiceId}/attachments`, {
    method: 'POST',
    body: formData,
  });
}

export function renameInvoiceAttachment(
  invoiceId: string,
  attId: string,
  fileName: string,
): Promise<InvoiceAttachment[]> {
  return apiFetch<InvoiceAttachment[]>(`/invoices/${invoiceId}/attachments/${attId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fileName }),
  });
}

export function deleteInvoiceAttachment(invoiceId: string, attId: string): Promise<InvoiceAttachment[]> {
  return apiFetch<InvoiceAttachment[]>(`/invoices/${invoiceId}/attachments/${attId}`, {
    method: 'DELETE',
  });
}

/** Télécharge une pièce jointe (fetch authentifié → blob → téléchargement). */
export async function downloadInvoiceAttachment(
  invoiceId: string,
  attId: string,
  fileName: string,
): Promise<void> {
  const token = getAccessToken();
  const res = await fetch(buildApiPath(`/invoices/${invoiceId}/attachments/${attId}/download`), {
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
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
