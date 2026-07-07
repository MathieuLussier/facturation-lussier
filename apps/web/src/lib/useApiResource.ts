import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';

/**
 * État renvoyé par {@link useApiResource}.
 */
export interface ApiResource<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Relance manuellement la requête (ex. après une mutation). */
  reload: () => void;
}

/**
 * Hook de chargement de ressource : encapsule le trio data/loading/error et,
 * surtout, garantit qu'une réponse **périmée** ne peut jamais écraser un état
 * plus récent. À chaque changement de `deps` (ou appel `reload`), la requête
 * précédente est neutralisée (drapeau `active`) et son `AbortSignal` est abandonné.
 *
 * Le `fetcher` reçoit un `AbortSignal` : les fonctions d'API qui le propagent à
 * `fetch` annulent réellement la requête réseau ; les autres bénéficient au
 * minimum de la garde anti-réponse-périmée.
 *
 * @example
 * const { data, loading, error, reload } = useApiResource(
 *   (signal) => listInvoices({ page }, signal),
 *   [page],
 * );
 */
export function useApiResource<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList,
): ApiResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  // Le fetcher change à chaque rendu ; on le lit via une ref pour ne relancer
  // que sur `deps`/`reload`, jamais sur l'identité de la fonction.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetcherRef.current(controller.signal).then(
      (result) => {
        if (!active) return;
        setData(result);
        setLoading(false);
      },
      (err: unknown) => {
        // Requête neutralisée/annulée : ne pas toucher l'état.
        if (!active || controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Erreur de chargement.');
        setLoading(false);
      },
    );

    return () => {
      active = false;
      controller.abort();
    };
    // Le fetcher est lu via fetcherRef : on ne relance que sur `deps`/`reload`.
  }, [...deps, reloadTick]);

  const reload = useCallback(() => setReloadTick((t) => t + 1), []);

  return { data, loading, error, reload };
}
