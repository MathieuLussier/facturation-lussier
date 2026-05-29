import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, buttonClasses, Card } from '@facturation/ui';
import { formatCents, type Invoice } from '@facturation/core';
import { listInvoices } from '../lib/invoices';
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_TONE } from '../lib/invoice-status';

const PAGE_SIZE = 10;

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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">Factures</h1>
          <p className="text-sm text-muted">Facturation B2B (TPS/TVQ)</p>
        </div>
        <Link to="/invoices/new" className={buttonClasses('primary')}>
          Nouvelle facture
        </Link>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {error}
        </div>
      )}

      <Card>
        {loading && (
          <p className="p-4 text-sm text-muted">Chargement…</p>
        )}

        {!loading && !error && items.length === 0 && (
          <p className="p-4 text-sm text-muted">Aucune facture.</p>
        )}

        {!loading && items.length > 0 && (
          <ul className="divide-y divide-border">
            {items.map((inv) => (
              <li key={inv.id}>
                <Link
                  to={`/invoices/${inv.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-fg">
                      Facture #{inv.number} — {inv.client?.companyName ?? '—'}
                    </p>
                    <p className="text-muted">{inv.issueDate.slice(0, 10)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-medium text-fg">{formatCents(inv.totalCents)}</span>
                    <Badge tone={INVOICE_STATUS_TONE[inv.status]}>
                      {INVOICE_STATUS_LABEL[inv.status]}
                    </Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted">
          <span>
            {total} facture(s) — page {page}/{pageCount}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={loading || page <= 1}
              onClick={() => void fetchPage(page - 1)}
            >
              Précédent
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={loading || page >= pageCount}
              onClick={() => void fetchPage(page + 1)}
            >
              Suivant
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
