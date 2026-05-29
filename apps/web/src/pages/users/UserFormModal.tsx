import { type FormEvent, useEffect, useState } from 'react';
import { Badge, Button, Input, Modal } from '@facturation/ui';
import type { AuthUser, CreateUserRequest, Role, UpdateUserRequest } from '@facturation/core';
import { ApiError, createUser, updateUser } from '../../lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UserFormMode = 'create' | 'edit';

interface UserFormFields {
  email: string;
  name: string;
  password: string;
  role: Role;
}

const INITIAL_FIELDS: UserFormFields = {
  email: '',
  name: '',
  password: '',
  role: 'MEMBER',
};

interface UserFormModalProps {
  mode: UserFormMode;
  /** Required when mode === 'edit' */
  user?: AuthUser;
  open: boolean;
  onClose: () => void;
  onCreated: (user: AuthUser) => void;
  onUpdated: (user: AuthUser) => void;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateFields(
  fields: UserFormFields,
  mode: UserFormMode,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!fields.email.trim()) {
    errors.email = "L'adresse e-mail est requise.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    errors.email = 'Adresse e-mail invalide.';
  }

  if (!fields.name.trim()) {
    errors.name = 'Le nom est requis.';
  }

  if (mode === 'create' && fields.password.length < 8) {
    errors.password = 'Le mot de passe doit contenir au moins 8 caractères.';
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UserFormModal({
  mode,
  user,
  open,
  onClose,
  onCreated,
  onUpdated,
}: UserFormModalProps) {
  const [fields, setFields] = useState<UserFormFields>(INITIAL_FIELDS);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Prefill when editing
  useEffect(() => {
    if (open && mode === 'edit' && user) {
      setFields({ email: user.email, name: user.name, password: '', role: user.role });
      setFieldErrors({});
      setFormError('');
    } else if (open && mode === 'create') {
      setFields(INITIAL_FIELDS);
      setFieldErrors({});
      setFormError('');
    }
  }, [open, mode, user]);

  const handleChange = (key: keyof UserFormFields, value: string): void => {
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

    const errors = validateFields(fields, mode);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      if (mode === 'create') {
        const body: CreateUserRequest = {
          email: fields.email.trim(),
          name: fields.name.trim(),
          password: fields.password,
          role: fields.role,
        };
        const created = await createUser(body);
        onCreated(created);
      } else if (user) {
        const body: UpdateUserRequest = {
          email: fields.email.trim(),
          name: fields.name.trim(),
          role: fields.role,
        };
        const updated = await updateUser(user.id, body);
        onUpdated(updated);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setFormError('Cette adresse e-mail est déjà utilisée.');
      } else {
        setFormError(
          err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const title = mode === 'create' ? 'Nouvel utilisateur' : "Modifier l'utilisateur";
  const submitLabel =
    mode === 'create'
      ? submitting
        ? 'Création…'
        : "Créer l'utilisateur"
      : submitting
        ? 'Sauvegarde…'
        : 'Enregistrer';

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {formError && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {formError}
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-4">
        <Input
          id="uf-name"
          label="Nom complet"
          type="text"
          autoComplete="name"
          placeholder="Alice Dupont"
          value={fields.name}
          onChange={(e) => handleChange('name', e.target.value)}
          error={fieldErrors.name}
          disabled={submitting}
        />

        <Input
          id="uf-email"
          label="Adresse e-mail"
          type="email"
          autoComplete="off"
          placeholder="alice@exemple.com"
          value={fields.email}
          onChange={(e) => handleChange('email', e.target.value)}
          error={fieldErrors.email}
          disabled={submitting}
        />

        {mode === 'create' && (
          <Input
            id="uf-password"
            label="Mot de passe"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={fields.password}
            onChange={(e) => handleChange('password', e.target.value)}
            error={fieldErrors.password}
            disabled={submitting}
          />
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="uf-role" className="text-sm font-medium text-fg">
            Rôle
          </label>
          <div className="flex items-center gap-3">
            <select
              id="uf-role"
              value={fields.role}
              onChange={(e) => handleChange('role', e.target.value as Role)}
              disabled={submitting}
              className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
            >
              <option value="MEMBER">MEMBER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <Badge tone={fields.role === 'ADMIN' ? 'brand' : 'neutral'}>{fields.role}</Badge>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
