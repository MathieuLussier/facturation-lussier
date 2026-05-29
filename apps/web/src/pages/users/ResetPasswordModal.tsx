import { type FormEvent, useEffect, useState } from 'react';
import { Button, Input, Modal } from '@facturation/ui';
import { resetUserPassword } from '../../lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ResetPasswordModalProps {
  userId: string;
  userName: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ResetPasswordModal({
  userId,
  userName,
  open,
  onClose,
  onSuccess,
}: ResetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setPassword('');
      setPasswordError('');
      setFormError('');
    }
  }, [open]);

  const handlePasswordChange = (value: string): void => {
    setPassword(value);
    if (passwordError) setPasswordError('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setFormError('');

    if (password.length < 8) {
      setPasswordError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setSubmitting(true);
    try {
      await resetUserPassword(userId, password);
      onSuccess();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Erreur lors de la réinitialisation.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Réinitialiser le mot de passe`}
    >
      <p className="mb-4 text-sm text-muted">
        Nouveau mot de passe pour{' '}
        <span className="font-medium text-fg">« {userName} »</span>.
      </p>

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
          id="rp-password"
          label="Nouveau mot de passe"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => handlePasswordChange(e.target.value)}
          error={passwordError}
          disabled={submitting}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Réinitialisation…' : 'Réinitialiser'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
