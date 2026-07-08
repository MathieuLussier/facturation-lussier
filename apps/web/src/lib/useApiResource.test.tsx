// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { useApiResource } from './useApiResource';

// RTL ne s'auto-nettoie pas sans `globals: true` : on démonte entre chaque test.
afterEach(cleanup);

/** Composant sonde : expose l'état du hook dans le DOM. */
function Probe({
  fetcher,
  dep,
}: {
  fetcher: (signal: AbortSignal) => Promise<string>;
  dep: number;
}) {
  const { data, loading, error } = useApiResource(fetcher, [dep]);
  return (
    <div>
      <span data-testid="data">{data ?? ''}</span>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="error">{error ?? ''}</span>
    </div>
  );
}

describe('useApiResource', () => {
  it('expose data après un chargement réussi', async () => {
    const { getByTestId } = render(<Probe dep={1} fetcher={() => Promise.resolve('ok')} />);
    await waitFor(() => expect(getByTestId('data').textContent).toBe('ok'));
    expect(getByTestId('loading').textContent).toBe('false');
    expect(getByTestId('error').textContent).toBe('');
  });

  it('expose un message d’erreur en cas d’échec', async () => {
    const { getByTestId } = render(
      <Probe dep={1} fetcher={() => Promise.reject(new Error('boom'))} />,
    );
    await waitFor(() => expect(getByTestId('error').textContent).toBe('boom'));
    expect(getByTestId('loading').textContent).toBe('false');
  });

  it('une réponse PÉRIMÉE n’écrase pas un état plus récent', async () => {
    // 1re requête (dep=1) lente ; 2e (dep=2) rapide. La lente résout en dernier
    // mais ne doit PAS remplacer le résultat de la rapide.
    let resolveSlow: (v: string) => void = () => {};
    const slow = new Promise<string>((r) => {
      resolveSlow = r;
    });

    const fetcher = vi.fn((_signal: AbortSignal): Promise<string> => {
      return fetcher.mock.calls.length === 1 ? slow : Promise.resolve('rapide');
    });

    const { getByTestId, rerender } = render(<Probe dep={1} fetcher={fetcher} />);
    // Change de dep → 2e requête (rapide) qui résout immédiatement.
    rerender(<Probe dep={2} fetcher={fetcher} />);
    await waitFor(() => expect(getByTestId('data').textContent).toBe('rapide'));

    // La 1re (lente) résout maintenant : elle doit être ignorée.
    await act(async () => {
      resolveSlow('périmé');
      await Promise.resolve();
    });
    expect(getByTestId('data').textContent).toBe('rapide');
  });
});
