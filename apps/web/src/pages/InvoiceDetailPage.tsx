import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, Card } from '@facturation/ui';
import { formatCents, type Invoice, type InvoiceStatus } from '@facturation/core';
import {
  deleteInvoice,
  downloadInvoicePdf,
  getInvoice,
  updateInvoiceStatus,
} from '../lib/invoices';
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_TONE } from '../lib/invoice-status';

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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">
            {invoice ? `Facture #${invoice.number}` : 'Facture'}
          </h1>
        </div>
        <Link
          to="/invoices"
          className="text-sm text-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          ← Factures
        </Link>
      </div>

      {loading && <p className="text-sm text-muted">Chargement…</p>}

      {error && (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {invoice && (
        <>
          <Card padded>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="text-sm space-y-1">
                <p className="font-medium text-fg">{invoice.client?.companyName ?? '—'}</p>
                {invoice.client?.email && (
                  <p className="text-muted">{invoice.client.email}</p>
                )}
                <p className="mt-2 text-muted">Émise le {invoice.issueDate.slice(0, 10)}</p>
                {invoice.dueDate && (
                  <p className="text-muted">Échéance : {invoice.dueDate.slice(0, 10)}</p>
                )}
              </div>
              <Badge tone={INVOICE_STATUS_TONE[invoice.status]}>
                {INVOICE_STATUS_LABEL[invoice.status]}
              </Badge>
            </div>
          </Card>

          <Card>
            <div className="overflow-hidden rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-left text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 text-right font-medium">Qté</th>
                    <th className="px-4 py-3 text-right font-medium">Prix unit.</th>
                    <th className="px-4 py-3 text-right font-medium">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoice.lines.map((l) => (
                    <tr key={l.id} className="text-fg">
                      <td className="px-4 py-3">{l.description}</td>
                      <td className="px-4 py-3 text-right">{l.quantity}</td>
                      <td className="px-4 py-3 text-right">{formatCents(l.unitPriceCents)}</td>
                      <td className="px-4 py-3 text-right">{formatCents(l.amountCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <dl className="ml-auto max-w-xs space-y-1 p-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Sous-total</dt>
                  <dd className="text-fg">{formatCents(invoice.subtotalCents)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">TPS (5 %)</dt>
                  <dd className="text-fg">{formatCents(invoice.gstCents)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">TVQ (9,975 %)</dt>
                  <dd className="text-fg">{formatCents(invoice.qstCents)}</dd>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-semibold">
                  <dt className="text-fg">Total</dt>
                  <dd className="text-fg">{formatCents(invoice.totalCents)}</dd>
                </div>
              </dl>
            </div>
          </Card>

          {invoice.notes && (
            <Card padded>
              <p className="text-sm text-muted">{invoice.notes}</p>
            </Card>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted">Statut :</span>
              {STATUSES.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant="secondary"
                  disabled={busy || s === invoice.status}
                  onClick={() => void changeStatus(s)}
                >
                  {INVOICE_STATUS_LABEL[s]}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="primary" disabled={busy} onClick={() => void downloadPdf()}>
                Télécharger le PDF
              </Button>
              <Button variant="danger" disabled={busy} onClick={() => void remove()}>
                Supprimer
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
