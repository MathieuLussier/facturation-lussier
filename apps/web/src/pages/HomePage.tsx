import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card } from '@facturation/ui';
import { formatCents, type InvoiceStats } from '@facturation/core';
import { getInvoiceStats } from '../lib/invoices';
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_TONE } from '../lib/invoice-status';
import { useAuth } from '../auth/AuthContext';

const STATUS_ORDER = ['BROUILLON', 'ENVOYEE', 'PAYEE', 'ANNULEE'] as const;

interface MetricProps {
  label: string;
  value: string;
  hint?: string;
  danger?: boolean;
}

function Metric({ label, value, hint, danger }: MetricProps) {
  return (
    <Card padded>
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${danger ? 'text-danger' : 'text-fg'}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export function HomePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const data = await getInvoiceStats();
        if (active) setStats(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Erreur de chargement.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const money = (cents: number | undefined): string => (loading ? '…' : formatCents(cents ?? 0));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg">
          Bonjour, {user?.name ?? user?.email}
        </h1>
        <p className="text-sm text-muted">Tableau de bord</p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {error}
        </div>
      )}

      {/* Indicateurs clés */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Encaissé" value={money(stats?.paidCents)} hint="Factures payées" />
        <Metric label="À recevoir" value={money(stats?.outstandingCents)} hint="Factures envoyées" />
        <Metric
          label="En retard"
          value={money(stats?.overdueCents)}
          hint={stats ? `${stats.overdueCount} facture(s)` : ''}
          danger
        />
        <Metric label="CA du mois" value={money(stats?.currentMonthCents)} hint="Émis ce mois-ci" />
      </div>

      {/* Répartition + dernières factures */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card padded className="lg:col-span-1">
          <h2 className="text-sm font-semibold text-fg">Répartition par statut</h2>
          <ul className="mt-4 space-y-3">
            {STATUS_ORDER.map((s) => (
              <li key={s} className="flex items-center justify-between text-sm">
                <Badge tone={INVOICE_STATUS_TONE[s]}>{INVOICE_STATUS_LABEL[s]}</Badge>
                <span className="font-medium text-fg">{stats?.countByStatus[s] ?? 0}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-fg">Dernières factures</h2>
            <Link to="/invoices" className="text-sm text-brand hover:underline">
              Tout voir
            </Link>
          </div>

          {loading ? (
            <p className="p-4 text-sm text-muted">Chargement…</p>
          ) : !stats || stats.recent.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-muted">Aucune facture pour l'instant.</p>
              <Link
                to="/invoices/new"
                className="mt-3 inline-block text-sm text-brand hover:underline"
              >
                Créer la première facture
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {stats.recent.map((inv) => (
                <li key={inv.id}>
                  <Link
                    to={`/invoices/${inv.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-surface-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-fg">
                        {inv.reference ?? 'Brouillon'} — {inv.client?.companyName ?? '—'}
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
        </Card>
      </div>

      {/* Accès rapides */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { to: '/clients', kicker: 'Répertoire', title: 'Clients' },
          { to: '/invoices/new', kicker: 'Créer', title: 'Nouvelle facture' },
          { to: '/invoices', kicker: 'Historique', title: 'Toutes les factures' },
        ].map((q) => (
          <Link
            key={q.to}
            to={q.to}
            className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Card padded className="transition-colors hover:bg-surface-2">
              <p className="text-sm font-medium text-muted">{q.kicker}</p>
              <p className="mt-1 text-lg font-semibold text-fg">{q.title}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
