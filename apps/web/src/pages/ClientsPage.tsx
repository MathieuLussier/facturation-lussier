import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Badge, Button, Input } from '@facturation/ui';
import type { DirectoryEntry } from '@facturation/core';
import { getClientsDirectory } from '../lib/clients';
import { useToast } from '../components/Toast';
import { EntityIcon } from '../components/EntityIcon';
import { ClientCreateModal } from './clients/ClientCreateModal';

const PAGE_SIZE = 24;

function DirectoryCard({ entry, onClick }: { entry: DirectoryEntry; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group flex w-full flex-col items-start gap-2 rounded-xl border border-border bg-surface p-4 text-left shadow-sm',
        'transition-all duration-150',
        'hover:border-brand/40 hover:shadow-md hover:ring-1 hover:ring-brand/20',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        entry.archivedAt ? 'opacity-70' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Icône + badge archivé */}
      <div className="flex w-full items-start justify-between gap-2">
        <span
          className={[
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            entry.kind === 'company'
              ? 'bg-brand-soft text-brand'
              : 'bg-surface-2 text-muted group-hover:text-fg',
          ].join(' ')}
        >
          <EntityIcon kind={entry.kind} className="h-5 w-5" />
        </span>
        {entry.archivedAt && (
          <Badge tone="warning" className="shrink-0">
            Archivé
          </Badge>
        )}
      </div>

      {/* Nom */}
      <p className="w-full truncate text-sm font-medium text-fg leading-snug group-hover:text-brand">
        {entry.name}
      </p>

      {/* Sous-titre */}
      {entry.subtitle ? (
        <p className="w-full truncate text-xs text-muted">{entry.subtitle}</p>
      ) : (
        <p className="w-full truncate text-xs text-muted/40 italic">
          {entry.kind === 'contact' ? 'Contact' : entry.kind === 'individual' ? 'Particulier' : 'Société'}
        </p>
      )}
    </button>
  );
}

export function ClientsPage() {
  const { notify } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState<DirectoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const fetchPage = useCallback(
    async (p: number, q: string, archived: boolean): Promise<void> => {
      setLoading(true);
      setListError('');
      try {
        const res = await getClientsDirectory({
          page: p,
          pageSize: PAGE_SIZE,
          search: q,
          includeArchived: archived,
        });
        setItems(res.items);
        setTotal(res.total);
        setPage(res.page);
      } catch (err) {
        setListError(err instanceof Error ? err.message : 'Erreur de chargement.');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void fetchPage(1, '', showArchived);
  }, [fetchPage, showArchived]);

  // Ouvre le modal de création si le param ?new est présent
  useEffect(() => {
    if (searchParams.has('new')) {
      setModalOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleCardClick = (entry: DirectoryEntry) => {
    if (entry.kind === 'contact' && entry.companyId) {
      void navigate(`/clients/${entry.companyId}?tab=contacts`);
    } else {
      void navigate(`/clients/${entry.id}`);
    }
  };

  const handleCreated = () => {
    setModalOpen(false);
    void fetchPage(1, search, showArchived);
    notify('Client créé', 'success');
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">Clients</h1>
          <p className="text-sm text-muted">Entreprises, particuliers et contacts</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>Nouveau client</Button>
      </div>

      {/* Barre de filtres */}
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void fetchPage(1, search, showArchived);
          }}
          className="flex items-end gap-2"
        >
          <Input
            id="client-search"
            label="Rechercher"
            type="search"
            placeholder="Nom…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit" variant="secondary" size="sm" disabled={loading}>
            Rechercher
          </Button>
        </form>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-fg select-none">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-brand"
          />
          Afficher les archivés
        </label>
      </div>

      {/* États : chargement / erreur / vide */}
      {loading && (
        <p className="py-6 text-center text-sm text-muted">Chargement…</p>
      )}

      {!loading && listError && (
        <div
          role="alert"
          className="rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {listError}
        </div>
      )}

      {!loading && !listError && items.length === 0 && (
        <div className="py-16 text-center">
          <p className="mb-4 text-sm text-muted">Aucun résultat.</p>
          <Button onClick={() => setModalOpen(true)}>Ajouter le premier client</Button>
        </div>
      )}

      {/* Grille de cartes */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((entry) => (
            <DirectoryCard
              key={`${entry.kind}-${entry.id}`}
              entry={entry}
              onClick={() => handleCardClick(entry)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && items.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted shadow-sm">
          <span>
            {total} entrée{total !== 1 ? 's' : ''} — page {page}/{pageCount}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={loading || page <= 1}
              onClick={() => void fetchPage(page - 1, search, showArchived)}
            >
              Précédent
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={loading || page >= pageCount}
              onClick={() => void fetchPage(page + 1, search, showArchived)}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* Modal de création */}
      <ClientCreateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
        onError={(msg) => setListError(msg)}
      />
    </div>
  );
}
