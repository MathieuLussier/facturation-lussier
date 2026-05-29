import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Badge } from '@facturation/ui';
import type { Health } from '@facturation/core';
import { apiFetch } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

type HealthStatus =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'ready'; health: Health };

export function HomePage() {
  const { user } = useAuth();
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({ state: 'loading' });

  const refreshHealth = useCallback(async (): Promise<void> => {
    setHealthStatus({ state: 'loading' });
    try {
      const health = await apiFetch<Health>('/health');
      setHealthStatus({ state: 'ready', health });
    } catch (error) {
      setHealthStatus({
        state: 'error',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  }, []);

  useEffect(() => {
    void refreshHealth();
  }, [refreshHealth]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">
            Bonjour, {user?.name ?? user?.email}
          </h1>
          <p className="text-sm text-muted">Tableau de bord</p>
        </div>
      </div>

      <Card padded>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-fg">État de l&apos;API</h2>
          <Button variant="secondary" size="sm" onClick={() => void refreshHealth()}>
            Rafraîchir
          </Button>
        </div>

        <div className="mt-4">
          {healthStatus.state === 'loading' && (
            <p className="text-sm text-muted">Vérification…</p>
          )}
          {healthStatus.state === 'error' && (
            <div
              role="alert"
              className="rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger"
            >
              API injoignable : {healthStatus.message}
            </div>
          )}
          {healthStatus.state === 'ready' && (
            <div className="flex flex-wrap items-center gap-3 text-sm text-fg">
              <span>
                Statut :{' '}
                <strong>{healthStatus.health.status}</strong>
              </span>
              <span className="text-muted">—</span>
              <span className="flex items-center gap-2">
                Base de données :
                <Badge tone={healthStatus.health.db ? 'success' : 'danger'}>
                  {healthStatus.health.db ? 'connectée' : 'indisponible'}
                </Badge>
              </span>
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/clients" className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-xl">
          <Card>
            <div className="p-6 group-hover:bg-surface-2 rounded-xl transition-colors">
              <p className="text-sm font-medium text-muted">Répertoire</p>
              <p className="mt-1 text-lg font-semibold text-fg">Clients</p>
            </div>
          </Card>
        </Link>

        <Link to="/invoices/new" className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-xl">
          <Card>
            <div className="p-6 group-hover:bg-surface-2 rounded-xl transition-colors">
              <p className="text-sm font-medium text-muted">Créer</p>
              <p className="mt-1 text-lg font-semibold text-fg">Nouvelle facture</p>
            </div>
          </Card>
        </Link>

        <Link to="/invoices" className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-xl">
          <Card>
            <div className="p-6 group-hover:bg-surface-2 rounded-xl transition-colors">
              <p className="text-sm font-medium text-muted">Historique</p>
              <p className="mt-1 text-lg font-semibold text-fg">Toutes les factures</p>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
