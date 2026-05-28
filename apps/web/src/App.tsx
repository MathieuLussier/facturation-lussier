import { useCallback, useEffect, useState } from 'react';
import { Button } from '@facturation/ui';
import type { Health } from '@facturation/core';
import { healthUrl } from './lib/api';

type Status =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'ready'; health: Health };

export function App() {
  const [status, setStatus] = useState<Status>({ state: 'loading' });

  const refresh = useCallback(async (): Promise<void> => {
    setStatus({ state: 'loading' });
    try {
      const response = await fetch(healthUrl());
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const health = (await response.json()) as Health;
      setStatus({ state: 'ready', health });
    } catch (error) {
      setStatus({
        state: 'error',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-bold text-brand">Facturation Lussier</h1>
      <p className="text-sm text-gray-500">Squelette du monorepo — câblage web → api → db.</p>

      <section className="w-full rounded-lg border border-gray-200 p-6">
        <h2 className="mb-3 text-lg font-semibold">État de l&apos;API</h2>
        {status.state === 'loading' && <p>Vérification…</p>}
        {status.state === 'error' && (
          <p className="text-red-600">API injoignable : {status.message}</p>
        )}
        {status.state === 'ready' && (
          <p>
            Statut : <strong>{status.health.status}</strong> — base de données :{' '}
            <strong>{status.health.db ? 'connectée' : 'indisponible'}</strong>
          </p>
        )}
      </section>

      <Button onClick={() => void refresh()}>Rafraîchir</Button>
    </main>
  );
}
