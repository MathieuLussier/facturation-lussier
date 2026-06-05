import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card } from '@facturation/ui';
import { formatCents, type Product } from '@facturation/core';
import {
  archiveProduct,
  deleteProduct,
  listProducts,
  unarchiveProduct,
} from '../lib/products';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/Confirm';
import { ProductFormModal } from './products/ProductFormModal';

const PAGE_SIZE = 20;

export function ProductsPage() {
  const { notify } = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const res = await listProducts({ page, pageSize: PAGE_SIZE, search, includeArchived: showArchived });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [page, search, showArchived]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = (): void => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (product: Product): void => {
    setEditing(product);
    setModalOpen(true);
  };

  const toggleArchive = async (product: Product): Promise<void> => {
    try {
      if (product.archivedAt) await unarchiveProduct(product.id);
      else await archiveProduct(product.id);
      notify(product.archivedAt ? 'Produit désarchivé' : 'Produit archivé', 'success');
      void load();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erreur lors de l'archivage.", 'error');
    }
  };

  const remove = async (product: Product): Promise<void> => {
    if (!(await confirm({ message: `Supprimer « ${product.name} » ?`, tone: 'danger', confirmLabel: 'Supprimer' }))) return;
    try {
      await deleteProduct(product.id);
      notify('Produit supprimé', 'success');
      void load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur lors de la suppression.', 'error');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">Produits et services</h1>
          <p className="text-sm text-muted">Catalogue réutilisable pour les lignes de facture</p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          Nouveau produit
        </Button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="Rechercher un produit…"
          className="w-full max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:w-64"
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted select-none">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border accent-brand"
            checked={showArchived}
            onChange={(e) => {
              setPage(1);
              setShowArchived(e.target.checked);
            }}
          />
          Afficher les archivés
        </label>
      </div>

      <Card>
        {loading && <p className="p-4 text-sm text-muted">Chargement…</p>}

        {!loading && !error && items.length === 0 && (
          <div className="py-12 text-center">
            <p className="mb-4 text-sm text-muted">Aucun produit pour le moment.</p>
            <Button variant="primary" onClick={openCreate}>
              Créer le premier produit
            </Button>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-muted">
                  <th className="px-4 py-2.5">Nom</th>
                  <th className="px-4 py-2.5">Description</th>
                  <th className="px-4 py-2.5 text-right whitespace-nowrap">Prix unitaire</th>
                  <th className="px-4 py-2.5">Unité</th>
                  <th className="px-4 py-2.5">Statut</th>
                  <th className="px-4 py-2.5">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-b border-border">
                    <td className="px-4 py-2.5 font-medium text-fg">{p.name}</td>
                    <td className="px-4 py-2.5 text-muted">{p.description ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-fg">
                      {formatCents(p.unitPriceCents)}
                    </td>
                    <td className="px-4 py-2.5 text-muted">{p.unit ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <Badge tone={p.isActive ? 'success' : 'neutral'}>
                          {p.isActive ? 'Actif' : 'Inactif'}
                        </Badge>
                        {p.archivedAt && <Badge tone="warning">Archivé</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        <Button variant="secondary" size="sm" onClick={() => openEdit(p)}>
                          Modifier
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => void toggleArchive(p)}>
                          {p.archivedAt ? 'Désarchiver' : 'Archiver'}
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => void remove(p)}>
                          Supprimer
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Précédent
          </Button>
          <span className="text-muted">
            Page {page} / {totalPages}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Suivant
          </Button>
        </div>
      )}

      <ProductFormModal
        open={modalOpen}
        product={editing}
        onClose={() => setModalOpen(false)}
        onSaved={() => void load()}
      />
    </div>
  );
}
