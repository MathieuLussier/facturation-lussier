import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input } from '@facturation/ui';
import type { Client, CreateClientRequest } from '@facturation/core';
import { ApiError } from '../lib/api';
import { createClient, deleteClient, listClients, updateClient } from '../lib/clients';

interface ClientFields {
  companyName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  province: string;
  postalCode: string;
  neq: string;
  contactName: string;
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
  neq: '',
  contactName: '',
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
  { key: 'neq', label: 'NEQ' },
  { key: 'contactName', label: 'Personne-ressource' },
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
    neq: t(f.neq),
    contactName: t(f.contactName),
    notes: t(f.notes),
  };
}

export function ClientsPage() {
  const [items, setItems] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [fields, setFields] = useState<ClientFields>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPage = useCallback(async (p: number, q: string): Promise<void> => {
    setLoading(true);
    setListError('');
    try {
      const res = await listClients({ page: p, pageSize: PAGE_SIZE, search: q });
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
    void fetchPage(1, '');
  }, [fetchPage]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openCreate = () => {
    setEditingId(null);
    setFields(EMPTY);
    setFormError('');
    setShowForm(true);
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
      neq: c.neq ?? '',
      contactName: c.contactName ?? '',
      notes: c.notes ?? '',
    });
    setFormError('');
    setShowForm(true);
  };

  const change = (key: keyof ClientFields, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setFormError('');
    if (!fields.companyName.trim()) {
      setFormError('La raison sociale est requise.');
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
      setShowForm(false);
      setFields(EMPTY);
      await fetchPage(editingId ? page : 1, search);
      setEditingId(null);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (c: Client): Promise<void> => {
    if (!window.confirm(`Supprimer le client « ${c.companyName} » ?`)) return;
    try {
      await deleteClient(c.id);
      await fetchPage(page, search);
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Erreur lors de la suppression.');
    }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand">Clients</h1>
          <p className="text-sm text-gray-500">Entreprises facturées</p>
        </div>
        <Link
          to="/"
          className="text-sm text-brand underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          ← Accueil
        </Link>
      </div>

      <section className="rounded-lg border border-gray-200">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-200 px-4 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void fetchPage(1, search);
            }}
            className="flex items-end gap-2"
          >
            <Input
              id="client-search"
              label="Rechercher"
              type="search"
              placeholder="Raison sociale…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button type="submit" variant="secondary" disabled={loading}>
              Rechercher
            </Button>
          </form>
          <Button onClick={openCreate}>Nouveau client</Button>
        </div>

        {loading && <p className="p-4 text-sm text-gray-500">Chargement…</p>}
        {listError && <p className="p-4 text-sm text-red-600">{listError}</p>}
        {!loading && !listError && items.length === 0 && (
          <p className="p-4 text-sm text-gray-500">Aucun client.</p>
        )}

        {!loading && items.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {items.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">{c.companyName}</p>
                  <p className="truncate text-gray-500">
                    {[c.contactName, c.email, c.city].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="secondary" onClick={() => openEdit(c)}>
                    Modifier
                  </Button>
                  <Button variant="secondary" onClick={() => void remove(c)}>
                    Supprimer
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm text-gray-500">
          <span>
            {total} client(s) — page {page}/{pageCount}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={loading || page <= 1}
              onClick={() => void fetchPage(page - 1, search)}
            >
              Précédent
            </Button>
            <Button
              variant="secondary"
              disabled={loading || page >= pageCount}
              onClick={() => void fetchPage(page + 1, search)}
            >
              Suivant
            </Button>
          </div>
        </div>
      </section>

      {showForm && (
        <section className="rounded-lg border border-gray-200 p-6">
          <h2 className="mb-4 font-semibold">
            {editingId ? 'Modifier le client' : 'Nouveau client'}
          </h2>
          {formError && (
            <div
              role="alert"
              className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {formError}
            </div>
          )}
          <form onSubmit={(e) => void submit(e)} noValidate className="space-y-4">
            <Input
              id="client-companyName"
              label="Raison sociale *"
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
              <label htmlFor="client-notes" className="text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                id="client-notes"
                value={fields.notes}
                onChange={(e) => change('notes', e.target.value)}
                disabled={submitting}
                rows={3}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Créer le client'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                disabled={submitting}
              >
                Annuler
              </Button>
            </div>
          </form>
        </section>
      )}
    </main>
  );
}
