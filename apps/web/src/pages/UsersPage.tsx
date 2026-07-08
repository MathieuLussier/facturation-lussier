import { useEffect, useState } from 'react';
import { Badge, Button, Card } from '@facturation/ui';
import type { AuthUser } from '@facturation/core';
import { deleteUser, listUsers, updateUser } from '../lib/api';
import { useApiResource } from '../lib/useApiResource';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/Confirm';
import { useAuth } from '../auth/AuthContext';
import { UserFormModal } from './users/UserFormModal';
import { ResetPasswordModal } from './users/ResetPasswordModal';

// ---------------------------------------------------------------------------
// Row-action modal state
// ---------------------------------------------------------------------------

type RowAction =
  | { type: 'edit'; user: AuthUser }
  | { type: 'resetPassword'; user: AuthUser }
  | null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isLastActiveAdmin(user: AuthUser, activeAdminCount: number): boolean {
  return user.role === 'ADMIN' && user.isActive && activeAdminCount <= 1;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UsersPage() {
  const { notify } = useToast();
  const confirm = useConfirm();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<AuthUser[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [rowAction, setRowAction] = useState<RowAction>(null);

  const {
    data,
    loading: loadingUsers,
    error: listError,
    reload: fetchUsers,
  } = useApiResource(() => listUsers(), []);

  // Copie locale éditable : les mutations (activer/supprimer/créer) sont optimistes.
  useEffect(() => {
    if (data) setUsers(data);
  }, [data]);

  // Derived counts
  const activeAdminCount = users.filter((u) => u.role === 'ADMIN' && u.isActive).length;

  // ---------------------------------------------------------------------------
  // Row action handlers
  // ---------------------------------------------------------------------------

  const handleToggleActive = async (user: AuthUser): Promise<void> => {
    try {
      const updated = await updateUser(user.id, { isActive: !user.isActive });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      notify(
        updated.isActive ? `« ${updated.name} » réactivé` : `« ${updated.name} » désactivé`,
        'success',
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur lors de la mise à jour.', 'error');
    }
  };

  const handleDelete = async (user: AuthUser): Promise<void> => {
    const confirmed = await confirm({
      tone: 'danger',
      confirmLabel: 'Supprimer',
      message: `Supprimer l'utilisateur « ${user.name} » ?`,
    });
    if (!confirmed) return;

    try {
      await deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      notify(`Utilisateur « ${user.name} » supprimé`, 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur lors de la suppression.', 'error');
    }
  };

  // ---------------------------------------------------------------------------
  // Modal callbacks
  // ---------------------------------------------------------------------------

  const handleCreated = (created: AuthUser): void => {
    setUsers((prev) => [...prev, created]);
    setCreateOpen(false);
    notify(`Utilisateur « ${created.name} » créé`, 'success');
  };

  const handleUpdated = (updated: AuthUser): void => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    setRowAction(null);
    notify('Utilisateur modifié', 'success');
  };

  const handlePasswordReset = (): void => {
    setRowAction(null);
    notify('Mot de passe réinitialisé', 'success');
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">Utilisateurs</h1>
          <p className="text-sm text-muted">Réservé aux administrateurs</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Nouvel utilisateur</Button>
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-fg">Utilisateurs ({users.length})</h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void fetchUsers()}
            disabled={loadingUsers}
          >
            Actualiser
          </Button>
        </div>

        {loadingUsers && <p className="p-4 text-sm text-muted">Chargement…</p>}

        {listError && (
          <div
            role="alert"
            className="m-4 rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger"
          >
            {listError}
          </div>
        )}

        {!loadingUsers && !listError && users.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-muted">Aucun utilisateur pour l'instant.</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => setCreateOpen(true)}
            >
              Créer le premier utilisateur
            </Button>
          </div>
        )}

        {!loadingUsers && users.length > 0 && (
          <ul className="divide-y divide-border">
            {users.map((u) => {
              const isSelf = u.id === currentUser?.id;
              const lastAdmin = isLastActiveAdmin(u, activeAdminCount);
              const canDeactivate = !isSelf && !lastAdmin;
              const deactivateTitle = isSelf
                ? 'Vous ne pouvez pas désactiver votre propre compte.'
                : lastAdmin
                  ? 'Impossible de désactiver le dernier administrateur actif.'
                  : undefined;

              return (
                <li
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-fg">{u.name}</p>
                    <p className="text-muted">{u.email}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status badges */}
                    <Badge tone={u.role === 'ADMIN' ? 'brand' : 'neutral'}>{u.role}</Badge>
                    <Badge tone={u.isActive ? 'success' : 'danger'}>
                      {u.isActive ? 'Actif' : 'Inactif'}
                    </Badge>

                    {/* Actions */}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setRowAction({ type: 'edit', user: u })}
                    >
                      Modifier
                    </Button>

                    {u.isActive ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={!canDeactivate}
                        title={deactivateTitle}
                        onClick={() => void handleToggleActive(u)}
                      >
                        Désactiver
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void handleToggleActive(u)}
                      >
                        Réactiver
                      </Button>
                    )}

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setRowAction({ type: 'resetPassword', user: u })}
                    >
                      Mot de passe
                    </Button>

                    {u.deletable === true && !isSelf && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => void handleDelete(u)}
                      >
                        Supprimer
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Create modal */}
      <UserFormModal
        mode="create"
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
        onUpdated={() => undefined}
      />

      {/* Edit modal */}
      <UserFormModal
        mode="edit"
        user={rowAction?.type === 'edit' ? rowAction.user : undefined}
        open={rowAction?.type === 'edit'}
        onClose={() => setRowAction(null)}
        onCreated={() => undefined}
        onUpdated={handleUpdated}
      />

      {/* Reset password modal */}
      <ResetPasswordModal
        userId={rowAction?.type === 'resetPassword' ? rowAction.user.id : ''}
        userName={rowAction?.type === 'resetPassword' ? rowAction.user.name : ''}
        open={rowAction?.type === 'resetPassword'}
        onClose={() => setRowAction(null)}
        onSuccess={handlePasswordReset}
      />
    </div>
  );
}
