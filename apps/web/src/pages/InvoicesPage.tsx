import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@facturation/ui';
import { formatCents, type Invoice, type InvoiceStatus } from '@facturation/core';
import { listInvoices } from '../lib/invoices';

const PAGE_SIZE = 10;

export const STATUS_LABEL: Record<InvoiceStatus, string> = {
  BROUILLON: 'Brouillon',
  ENVOYEE: 'Envoyée',
  PAYEE: 'Payée',
  ANNULEE: 'Annulée',
};

export const STATUS_CLASS: Record<InvoiceStatus, string> = {
  BROUILLON: 'bg-gray-100 text-gray-600',
  ENVOYEE: 'bg-blue-100 text-blue-700',
  PAYEE: 'bg-green-100 text-green-700',
  ANNULEE: 'bg-red-100 text-red-600',
};

export function InvoicesPage() {
  const [items, setItems] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPage = useCallback(async (p: number): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const res = await listInvoices({ page: p, pageSize: PAGE_SIZE });
      setItems(res.items);
      setTotal(res.total);
      setPage(res.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPage(1);
  }, [fetchPage]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand">Factures</h1>
          <p className="text-sm text-gray-500">Facturation B2B (TPS/TVQ)</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="text-sm text-brand underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            ← Accueil
          </Link>
          <Link
            to="/invoices/new"
            className="inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            Nouvelle facture
          </Link>
        </div>
      </div>

      <section className="rounded-lg border border-gray-200">
        {loading && <p className="p-4 text-sm text-gray-500">Chargement…</p>}
        {error && <p className="p-4 text-sm text-red-600">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className="p-4 text-sm text-gray-500">Aucune facture.</p>
        )}

        {!loading && items.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {items.map((inv) => (
              <li key={inv.id}>
                <Link
                  to={`/invoices/${inv.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">
                      Facture #{inv.number} — {inv.client?.companyName ?? '—'}
                    </p>
                    <p className="text-gray-500">{inv.issueDate.slice(0, 10)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-medium text-gray-900">{formatCents(inv.totalCents)}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[inv.status]}`}
                    >
                      {STATUS_LABEL[inv.status]}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm text-gray-500">
          <span>
            {total} facture(s) — page {page}/{pageCount}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={loading || page <= 1} onClick={() => void fetchPage(page - 1)}>
              Précédent
            </Button>
            <Button
              variant="secondary"
              disabled={loading || page >= pageCount}
              onClick={() => void fetchPage(page + 1)}
            >
              Suivant
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
