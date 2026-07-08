/**
 * Tests unitaires pour apiFetch, setAccessToken, registerRefreshFn.
 * Teste la logique pure : auto-refresh sur 401, replay unique, ApiError.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  apiFetch,
  apiFetchBlob,
  ApiError,
  setAccessToken,
  getAccessToken,
  registerRefreshFn,
} from './api';

// ---------------------------------------------------------------------------
// Helpers mock fetch
// ---------------------------------------------------------------------------

function makeFetchResponse(status: number, body: unknown = {}, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
    headers: new Headers(headers),
  };
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Reset access token et refresh fn avant chaque test
  setAccessToken(null);
  registerRefreshFn(async () => null);
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// getAccessToken / setAccessToken
// ---------------------------------------------------------------------------

describe('setAccessToken / getAccessToken', () => {
  it('stocke et retourne le token', () => {
    setAccessToken('my-token');
    expect(getAccessToken()).toBe('my-token');
  });

  it('null efface le token', () => {
    setAccessToken('my-token');
    setAccessToken(null);
    expect(getAccessToken()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// apiFetch — cas nominaux
// ---------------------------------------------------------------------------

describe('apiFetch', () => {
  it('retourne les donnees JSON sur 200', async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeFetchResponse(200, { id: '1' }));
    vi.stubGlobal('fetch', mockFetch);

    const result = await apiFetch<{ id: string }>('/auth/me');
    expect(result).toEqual({ id: '1' });
  });

  it('ajoute Authorization Bearer quand token est present', async () => {
    setAccessToken('my-access-token');
    const mockFetch = vi.fn().mockResolvedValue(makeFetchResponse(200, {}));
    vi.stubGlobal('fetch', mockFetch);

    await apiFetch('/auth/me');

    const callArgs = mockFetch.mock.calls[0];
    const headers = callArgs![1].headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer my-access-token');
  });

  it("n'ajoute pas Authorization quand pas de token", async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeFetchResponse(200, {}));
    vi.stubGlobal('fetch', mockFetch);

    await apiFetch('/auth/me');

    const callArgs = mockFetch.mock.calls[0];
    const headers = callArgs![1].headers as Headers;
    expect(headers.get('Authorization')).toBeNull();
  });

  it('utilise credentials include', async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeFetchResponse(200, {}));
    vi.stubGlobal('fetch', mockFetch);

    await apiFetch('/auth/me');

    expect(mockFetch.mock.calls[0]![1].credentials).toBe('include');
  });

  it('construit correctement le chemin API', async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeFetchResponse(200, {}));
    vi.stubGlobal('fetch', mockFetch);

    await apiFetch('/auth/me');

    expect(mockFetch.mock.calls[0]![0]).toBe('/api/auth/me');
  });

  it('retourne undefined sur 204 No Content', async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeFetchResponse(204, undefined));
    vi.stubGlobal('fetch', mockFetch);

    const result = await apiFetch<void>('/auth/logout');
    expect(result).toBeUndefined();
  });

  it('lance ApiError sur 403', async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeFetchResponse(403, { message: 'Forbidden' }));
    vi.stubGlobal('fetch', mockFetch);

    await expect(apiFetch('/users')).rejects.toThrow(ApiError);
  });

  it('ApiError contient le bon status code', async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeFetchResponse(404, {}));
    vi.stubGlobal('fetch', mockFetch);

    try {
      await apiFetch('/users/inexistant');
    } catch (e) {
      expect((e as ApiError).status).toBe(404);
    }
  });
});

// ---------------------------------------------------------------------------
// apiFetch — auto-refresh sur 401
// ---------------------------------------------------------------------------

describe('apiFetch — auto-refresh sur 401', () => {
  it('tente un refresh sur 401 et rejoue la requete si refresh reussit', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(makeFetchResponse(401, {}))  // premier appel : 401
      .mockResolvedValueOnce(makeFetchResponse(200, { id: '1' })); // replay : 200

    vi.stubGlobal('fetch', mockFetch);
    registerRefreshFn(async () => 'new-access-token');

    const result = await apiFetch<{ id: string }>('/auth/me');

    expect(result).toEqual({ id: '1' });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('met a jour le token en memoire apres refresh reussi', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(makeFetchResponse(401, {}))
      .mockResolvedValueOnce(makeFetchResponse(200, {})),
    );

    registerRefreshFn(async () => 'refreshed-token');
    await apiFetch('/auth/me');

    expect(getAccessToken()).toBe('refreshed-token');
  });

  it('lance ApiError 401 si refresh retourne null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeFetchResponse(401, {})));
    registerRefreshFn(async () => null);

    await expect(apiFetch('/auth/me')).rejects.toThrow(ApiError);
  });

  it('efface le token si refresh echoue', async () => {
    setAccessToken('old-token');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeFetchResponse(401, {})));
    registerRefreshFn(async () => null);

    try {
      await apiFetch('/auth/me');
    } catch {
      // Expected
    }

    expect(getAccessToken()).toBeNull();
  });

  it('ne tente le refresh que UNE seule fois (pas de boucle infinie)', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValue(makeFetchResponse(401, {})); // toujours 401

    vi.stubGlobal('fetch', mockFetch);
    registerRefreshFn(async () => 'new-token'); // refresh "reussit" mais API renvoie toujours 401

    await expect(apiFetch('/auth/me')).rejects.toThrow(ApiError);

    // fetch appele exactement 2 fois : original + replay (1 seul refresh)
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('ne tente pas de refresh si retried=true', async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeFetchResponse(401, {}));
    vi.stubGlobal('fetch', mockFetch);

    const refreshFn = vi.fn().mockResolvedValue('new-token');
    registerRefreshFn(refreshFn);

    // Appel avec retried=true — ne doit pas appeler refreshFn
    await expect(apiFetch('/auth/me', {}, true)).rejects.toThrow(ApiError);
    expect(refreshFn).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('ne tente pas de refresh si aucune refreshFn enregistree', async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeFetchResponse(401, {}));
    vi.stubGlobal('fetch', mockFetch);
    registerRefreshFn(null as unknown as () => Promise<string | null>);

    await expect(apiFetch('/auth/me')).rejects.toThrow(ApiError);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// ApiError
// ---------------------------------------------------------------------------

describe('ApiError', () => {
  it('a le bon nom', () => {
    const err = new ApiError(401, 'Non autorise');
    expect(err.name).toBe('ApiError');
  });

  it('expose le status', () => {
    const err = new ApiError(403, 'Interdit');
    expect(err.status).toBe(403);
  });

  it('est une instance de Error', () => {
    const err = new ApiError(500, 'Erreur');
    expect(err).toBeInstanceOf(Error);
  });
});

// ---------------------------------------------------------------------------
// apiFetchBlob — téléchargements binaires avec refresh 401
// ---------------------------------------------------------------------------

function makeBlobResponse(status: number) {
  return {
    ok: status >= 200 && status < 300,
    status,
    blob: vi.fn().mockResolvedValue(new Blob(['pdf'])),
  };
}

describe('apiFetchBlob', () => {
  it('retourne un Blob sur 200', async () => {
    setAccessToken('tok');
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(makeBlobResponse(200));
    const blob = await apiFetchBlob('/invoices/1/pdf');
    expect(blob).toBeInstanceOf(Blob);
  });

  it('sur 401, rafraîchit le token et rejoue la requête', async () => {
    setAccessToken('expired');
    registerRefreshFn(async () => 'fresh-token');
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(makeBlobResponse(401))
      .mockResolvedValueOnce(makeBlobResponse(200));

    const blob = await apiFetchBlob('/invoices/1/pdf');
    expect(blob).toBeInstanceOf(Blob);
    expect(fetch).toHaveBeenCalledTimes(2);
    // Le 2e appel porte le nouveau token.
    const secondCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[1];
    const secondInit = (secondCall?.[1] ?? {}) as { headers?: Record<string, string> };
    expect(secondInit.headers?.Authorization).toBe('Bearer fresh-token');
  });

  it('sur 401 sans refresh possible, lève ApiError(401)', async () => {
    setAccessToken('expired');
    registerRefreshFn(async () => null);
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(makeBlobResponse(401));
    await expect(apiFetchBlob('/invoices/1/pdf')).rejects.toBeInstanceOf(ApiError);
  });
});
