import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Button, Input, Card, Badge } from '@facturation/ui';
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
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">Utilisateurs</h1>
          <p className="text-sm text-muted">Réservé aux administrateurs</p>
        </div>
        <Button
          onClick={() => {
            setShowForm((v) => !v);
            setFormError('');
            setFormSuccess('');
          }}
        >
          {showForm ? 'Annuler' : 'Nouvel utilisateur'}
        </Button>
      </div>

      {/* Message de succès */}
      {formSuccess && (
        <div role="status" className="rounded-lg border border-success/40 bg-success-soft px-4 py-3 text-sm text-success">
          {formSuccess}
        </div>
      )}

      {/* Liste des utilisateurs */}
      <Card>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-fg">
            Utilisateurs ({users.length})
          </h2>
          <Button variant="secondary" size="sm" onClick={() => void fetchUsers()} disabled={loadingUsers}>
            Actualiser
          </Button>
        </div>

        {loadingUsers && (
          <p className="p-4 text-sm text-muted">Chargement…</p>
        )}

        {listError && (
          <div role="alert" className="m-4 rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
            {listError}
          </div>
        )}

        {!loadingUsers && !listError && users.length === 0 && (
          <p className="p-4 text-sm text-muted">Aucun utilisateur.</p>
        )}

        {!loadingUsers && users.length > 0 && (
          <ul className="divide-y divide-border">
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-fg">{u.name}</p>
                  <p className="text-muted">{u.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={u.role === 'ADMIN' ? 'brand' : 'neutral'}>
                    {u.role}
                  </Badge>
                  <Badge tone={u.isActive ? 'success' : 'danger'}>
                    {u.isActive ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Formulaire de création */}
      {showForm && (
        <Card padded>
          <h2 className="mb-4 text-sm font-semibold text-fg">Créer un utilisateur</h2>

          {formError && (
            <div role="alert" className="mb-4 rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
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
              <label htmlFor="create-role" className="text-sm font-medium text-fg">
                Rôle
              </label>
              <select
                id="create-role"
                value={fields.role}
                onChange={(e) => handleFieldChange('role', e.target.value as Role)}
                disabled={submitting}
                className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
              >
                <option value="MEMBER">MEMBER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>

            <Button type="submit" disabled={submitting}>
              {submitting ? 'Création…' : 'Créer l\'utilisateur'}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
