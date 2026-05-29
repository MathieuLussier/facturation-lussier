import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@facturation/ui';
import { formatCents, type Invoice, type InvoiceStatus } from '@facturation/core';
import {
  deleteInvoice,
  downloadInvoicePdf,
  getInvoice,
  updateInvoiceStatus,
} from '../lib/invoices';
import { STATUS_CLASS, STATUS_LABEL } from './InvoicesPage';

const STATUSES: InvoiceStatus[] = ['BROUILLON', 'ENVOYEE', 'PAYEE', 'ANNULEE'];

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      setInvoice(await getInvoice(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const changeStatus = async (status: InvoiceStatus): Promise<void> => {
    if (!id) return;
    setBusy(true);
    try {
      setInvoice(await updateInvoiceStatus(id, status));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du changement de statut.');
    } finally {
      setBusy(false);
    }
  };

  const downloadPdf = async (): Promise<void> => {
    if (!invoice) return;
    try {
      await downloadInvoicePdf(invoice.id, invoice.number);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du téléchargement du PDF.');
    }
  };

  const remove = async (): Promise<void> => {
    if (!id || !window.confirm('Supprimer cette facture ?')) return;
    setBusy(true);
    try {
      await deleteInvoice(id);
      navigate('/invoices');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression.');
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand">
          {invoice ? `Facture #${invoice.number}` : 'Facture'}
        </h1>
        <Link
          to="/invoices"
          className="text-sm text-brand underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          ← Factures
        </Link>
      </div>

      {loading && <p className="text-sm text-gray-500">Chargement…</p>}
      {error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {invoice && (
        <>
          <section className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-gray-200 p-6">
            <div className="text-sm">
              <p className="font-medium text-gray-900">{invoice.client?.companyName ?? '—'}</p>
              {invoice.client?.email && <p className="text-gray-500">{invoice.client.email}</p>}
              <p className="mt-2 text-gray-500">Émise le {invoice.issueDate.slice(0, 10)}</p>
              {invoice.dueDate && (
                <p className="text-gray-500">Échéance : {invoice.dueDate.slice(0, 10)}</p>
              )}
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLASS[invoice.status]}`}
            >
              {STATUS_LABEL[invoice.status]}
            </span>
          </section>

          <section className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Description</th>
                  <th className="px-4 py-2 text-right font-medium">Qté</th>
                  <th className="px-4 py-2 text-right font-medium">Prix unit.</th>
                  <th className="px-4 py-2 text-right font-medium">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-2">{l.description}</td>
                    <td className="px-4 py-2 text-right">{l.quantity}</td>
                    <td className="px-4 py-2 text-right">{formatCents(l.unitPriceCents)}</td>
                    <td className="px-4 py-2 text-right">{formatCents(l.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="ml-auto max-w-xs space-y-1 p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Sous-total</dt>
                <dd>{formatCents(invoice.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">TPS (5 %)</dt>
                <dd>{formatCents(invoice.gstCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">TVQ (9,975 %)</dt>
                <dd>{formatCents(invoice.qstCents)}</dd>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold">
                <dt>Total</dt>
                <dd>{formatCents(invoice.totalCents)}</dd>
              </div>
            </dl>
          </section>

          {invoice.notes && (
            <section className="rounded-lg border border-gray-200 p-4 text-sm text-gray-600">
              {invoice.notes}
            </section>
          )}

          <section className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-500">Statut :</span>
              {STATUSES.map((s) => (
                <Button
                  key={s}
                  variant="secondary"
                  disabled={busy || s === invoice.status}
                  onClick={() => void changeStatus(s)}
                >
                  {STATUS_LABEL[s]}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button disabled={busy} onClick={() => void downloadPdf()}>
                Télécharger le PDF
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => void remove()}>
                Supprimer
              </Button>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
