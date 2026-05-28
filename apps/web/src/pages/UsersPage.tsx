import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input } from '@facturation/ui';
import type { AuthUser, CreateUserRequest, Role } from '@facturation/core';
import { ApiError, createUser, listUsers } from '../lib/api';

// ---------------------------------------------------------------------------
// Formulaire de création d'utilisateur
// ---------------------------------------------------------------------------

interface CreateUserFields {
  email: string;
  name: string;
  password: string;
  role: Role;
}

const INITIAL_FIELDS: CreateUserFields = {
  email: '',
  name: '',
  password: '',
  role: 'MEMBER',
};

function validateCreateForm(fields: CreateUserFields): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!fields.email.trim()) {
    errors.email = 'L\'adresse e-mail est requise.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    errors.email = 'Adresse e-mail invalide.';
  }
  if (!fields.name.trim()) {
    errors.name = 'Le nom est requis.';
  }
  if (fields.password.length < 8) {
    errors.password = 'Le mot de passe doit contenir au moins 8 caractères.';
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export function UsersPage() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [listError, setListError] = useState('');

  const [fields, setFields] = useState<CreateUserFields>(INITIAL_FIELDS);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchUsers = useCallback(async (): Promise<void> => {
    setLoadingUsers(true);
    setListError('');
    try {
      const data = await listUsers();
      setUsers(data);
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Erreur lors du chargement.');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const handleFieldChange = (key: keyof CreateUserFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const errors = validateCreateForm(fields);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const body: CreateUserRequest = {
        email: fields.email.trim(),
        name: fields.name.trim(),
        password: fields.password,
        role: fields.role,
      };
      const created = await createUser(body);
      setUsers((prev) => [...prev, created]);
      setFields(INITIAL_FIELDS);
      setFormSuccess(`Utilisateur « ${created.name} » créé avec succès.`);
      setShowForm(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setFormError('Cette adresse e-mail est déjà utilisée.');
      } else {
        setFormError(err instanceof Error ? err.message : 'Erreur lors de la création.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand">Gestion des utilisateurs</h1>
          <p className="text-sm text-gray-500">Réservé aux administrateurs</p>
        </div>
        <Link
          to="/"
          className="text-sm text-brand underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          ← Accueil
        </Link>
      </div>

      {/* Liste des utilisateurs */}
      <section className="rounded-lg border border-gray-200">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="font-semibold">Utilisateurs ({users.length})</h2>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void fetchUsers()} disabled={loadingUsers}>
              Actualiser
            </Button>
            <Button onClick={() => { setShowForm((v) => !v); setFormError(''); setFormSuccess(''); }}>
              {showForm ? 'Annuler' : 'Nouvel utilisateur'}
            </Button>
          </div>
        </div>

        {loadingUsers && (
          <p className="p-4 text-sm text-gray-500">Chargement…</p>
        )}
        {listError && (
          <p className="p-4 text-sm text-red-600">{listError}</p>
        )}

        {!loadingUsers && !listError && users.length === 0 && (
          <p className="p-4 text-sm text-gray-500">Aucun utilisateur.</p>
        )}

        {!loadingUsers && users.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">{u.name}</p>
                  <p className="text-gray-500">{u.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    u.role === 'ADMIN'
                      ? 'bg-brand/10 text-brand'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {u.role}
                  </span>
                  <span className={`text-xs ${u.isActive ? 'text-green-600' : 'text-red-500'}`}>
                    {u.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Formulaire de création */}
      {showForm && (
        <section className="rounded-lg border border-gray-200 p-6">
          <h2 className="mb-4 font-semibold">Créer un utilisateur</h2>

          {formError && (
            <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <form onSubmit={(e) => { void handleSubmit(e); }} noValidate className="space-y-4">
            <Input
              id="create-name"
              label="Nom complet"
              type="text"
              autoComplete="name"
              placeholder="Alice Dupont"
              value={fields.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              error={fieldErrors.name}
              disabled={submitting}
            />

            <Input
              id="create-email"
              label="Adresse e-mail"
              type="email"
              autoComplete="off"
              placeholder="alice@exemple.com"
              value={fields.email}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              error={fieldErrors.email}
              disabled={submitting}
            />

            <Input
              id="create-password"
              label="Mot de passe"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={fields.password}
              onChange={(e) => handleFieldChange('password', e.target.value)}
              error={fieldErrors.password}
              disabled={submitting}
            />

            <div className="flex flex-col gap-1">
              <label htmlFor="create-role" className="text-sm font-medium text-gray-700">
                Rôle
              </label>
              <select
                id="create-role"
                value={fields.role}
                onChange={(e) => handleFieldChange('role', e.target.value as Role)}
                disabled={submitting}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
              >
                <option value="MEMBER">MEMBER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>

            <Button type="submit" disabled={submitting}>
              {submitting ? 'Création…' : 'Créer l\'utilisateur'}
            </Button>
          </form>
        </section>
      )}

      {formSuccess && (
        <div role="status" className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {formSuccess}
        </div>
      )}
    </main>
  );
}
