import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@facturation/ui';
import type { Health } from '@facturation/core';
import { apiFetch } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

type HealthStatus =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'ready'; health: Health };

export function HomePage() {
  const { user, logout } = useAuth();
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({ state: 'loading' });
  const [loggingOut, setLoggingOut] = useState(false);

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

  const handleLogout = async (): Promise<void> => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-bold text-brand">Facturation Lussier</h1>
      <p className="text-sm text-gray-500">Bienvenue, <strong>{user?.name ?? user?.email}</strong></p>

      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span>Rôle : <strong>{user?.role}</strong></span>
        <Link
          to="/clients"
          className="rounded px-2 py-1 text-brand underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          Clients
        </Link>
        {user?.role === 'ADMIN' && (
          <Link
            to="/users"
            className="rounded px-2 py-1 text-brand underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            Gérer les utilisateurs
          </Link>
        )}
      </div>

      <section className="w-full rounded-lg border border-gray-200 p-6">
        <h2 className="mb-3 text-lg font-semibold">État de l&apos;API</h2>
        {healthStatus.state === 'loading' && <p className="text-gray-500">Vérification…</p>}
        {healthStatus.state === 'error' && (
          <p className="text-red-600">API injoignable : {healthStatus.message}</p>
        )}
        {healthStatus.state === 'ready' && (
          <p>
            Statut : <strong>{healthStatus.health.status}</strong> — base de données :{' '}
            <strong>{healthStatus.health.db ? 'connectée' : 'indisponible'}</strong>
          </p>
        )}
      </section>

      <div className="flex gap-3">
        <Button onClick={() => void refreshHealth()} variant="secondary">
          Rafraîchir
        </Button>
        <Button
          onClick={() => void handleLogout()}
          variant="secondary"
          disabled={loggingOut}
        >
          {loggingOut ? 'Déconnexion…' : 'Se déconnecter'}
        </Button>
      </div>
    </main>
  );
}
