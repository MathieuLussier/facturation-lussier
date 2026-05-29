import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Badge, Button, Card, Input, Modal } from '@facturation/ui';
import type { Client, CreateClientRequest } from '@facturation/core';
import { ApiError } from '../lib/api';
import { archiveClient, createClient, deleteClient, listClients, unarchiveClient, updateClient } from '../lib/clients';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/Confirm';

interface ClientFields {
  companyName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  province: string;
  postalCode: string;
  notes: string;
}

const EMPTY: ClientFields = {
  companyName: '',
  email: '',
  phone: '',
  addressLine: '',
  city: '',
  province: 'QC',
  postalCode: '',
  notes: '',
};

const PAGE_SIZE = 10;

const TEXT_FIELDS: { key: keyof ClientFields; label: string; type?: string }[] = [
  { key: 'email', label: 'Courriel', type: 'email' },
  { key: 'phone', label: 'Téléphone' },
  { key: 'addressLine', label: 'Adresse' },
  { key: 'city', label: 'Ville' },
  { key: 'province', label: 'Province' },
  { key: 'postalCode', label: 'Code postal' },
];

function toPayload(f: ClientFields): CreateClientRequest {
  const t = (v: string) => (v.trim() ? v.trim() : undefined);
  return {
    companyName: f.companyName.trim(),
    email: t(f.email),
    phone: t(f.phone),
    addressLine: t(f.addressLine),
    city: t(f.city),
    province: t(f.province),
    postalCode: t(f.postalCode),
    notes: t(f.notes),
  };
}

export function ClientsPage() {
  const { notify } = useToast();
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [fields, setFields] = useState<ClientFields>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPage = useCallback(async (p: number, q: string, archived: boolean): Promise<void> => {
    setLoading(true);
    setListError('');
    try {
      const res = await listClients({ page: p, pageSize: PAGE_SIZE, search: q, includeArchived: archived });
      setItems(res.items);
      setTotal(res.total);
      setPage(res.page);
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPage(1, '', showArchived);
  }, [fetchPage, showArchived]);

  // Ouvre le modal de création si le param ?new est présent
  useEffect(() => {
    if (searchParams.has('new')) {
      setEditingId(null);
      setFields(EMPTY);
      setFormError('');
      setModalOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openCreate = () => {
    setEditingId(null);
    setFields(EMPTY);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditingId(c.id);
    setFields({
      companyName: c.companyName,
      email: c.email ?? '',
      phone: c.phone ?? '',
      addressLine: c.addressLine ?? '',
      city: c.city ?? '',
      province: c.province ?? '',
      postalCode: c.postalCode ?? '',
      notes: c.notes ?? '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
    setEditingId(null);
  };

  const change = (key: keyof ClientFields, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setFormError('');
    if (!fields.companyName.trim()) {
      setFormError('Le nom est requis.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = toPayload(fields);
      if (editingId) {
        await updateClient(editingId, payload);
      } else {
        await createClient(payload);
      }
      setModalOpen(false);
      await fetchPage(editingId ? page : 1, search, showArchived);
      notify(editingId ? 'Client mis à jour' : 'Client créé', 'success');
      setEditingId(null);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (c: Client): Promise<void> => {
    const ok = await confirm({
      message: `Supprimer le client « ${c.companyName} » ?`,
      tone: 'danger',
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    try {
      await deleteClient(c.id);
      await fetchPage(page, search, showArchived);
      notify('Client supprimé', 'success');
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Erreur lors de la suppression.');
    }
  };

  const archive = async (c: Client): Promise<void> => {
    try {
      await archiveClient(c.id);
      await fetchPage(page, search, showArchived);
      notify('Entreprise archivée', 'success');
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Erreur lors de l\'archivage.');
    }
  };

  const unarchive = async (c: Client): Promise<void> => {
    try {
      await unarchiveClient(c.id);
      await fetchPage(page, search, showArchived);
      notify('Entreprise désarchivée', 'success');
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Erreur lors du désarchivage.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">Clients</h1>
          <p className="text-sm text-muted">Entreprises facturées</p>
        </div>
        <Button onClick={openCreate}>Nouveau client</Button>
      </div>

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-4 py-3">
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
          <label className="flex items-center gap-2 text-sm text-fg">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-brand"
            />
            Afficher les archivés
          </label>
        </div>

        {loading && <p className="p-4 text-sm text-muted">Chargement…</p>}

        {listError && (
          <div
            role="alert"
            className="mx-4 mt-4 rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger"
          >
            {listError}
          </div>
        )}

        {!loading && !listError && items.length === 0 && (
          <div className="py-12 text-center">
            <p className="mb-4 text-sm text-muted">Aucun client.</p>
            <Button onClick={openCreate}>Ajouter le premier client</Button>
          </div>
        )}

        {!loading && items.length > 0 && (
          <ul className="divide-y divide-border">
            {items.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/clients/${c.id}`}
                      className="block truncate font-medium text-fg hover:text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      {c.companyName}
                    </Link>
                    {c.archivedAt && <Badge tone="warning">Archivé</Badge>}
                  </div>
                  <p className="truncate text-muted">
                    {[c.email, c.city].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => openEdit(c)}>
                    Modifier
                  </Button>
                  {c.archivedAt ? (
                    <Button variant="secondary" size="sm" onClick={() => void unarchive(c)}>
                      Désarchiver
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => void archive(c)}>
                      Archiver
                    </Button>
                  )}
                  {c.deletable === true && (
                    <Button variant="danger" size="sm" onClick={() => void remove(c)}>
                      Supprimer
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted">
          <span>
            {total} client(s) — page {page}/{pageCount}
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
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Modifier le client' : 'Nouveau client'}
      >
        {formError && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger"
          >
            {formError}
          </div>
        )}

        <form onSubmit={(e) => void submit(e)} noValidate className="space-y-4">
          <Input
            id="client-companyName"
            label="Nom *"
            type="text"
            value={fields.companyName}
            onChange={(e) => change('companyName', e.target.value)}
            disabled={submitting}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {TEXT_FIELDS.map((f) => (
              <Input
                key={f.key}
                id={`client-${f.key}`}
                label={f.label}
                type={f.type ?? 'text'}
                value={fields[f.key]}
                onChange={(e) => change(f.key, e.target.value)}
                disabled={submitting}
              />
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="client-notes" className="text-sm font-medium text-fg">
              Notes
            </label>
            <textarea
              id="client-notes"
              value={fields.notes}
              onChange={(e) => change('notes', e.target.value)}
              disabled={submitting}
              rows={3}
              className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={closeModal}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
