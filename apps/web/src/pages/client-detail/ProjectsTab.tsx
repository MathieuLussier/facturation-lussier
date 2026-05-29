import { type FormEvent, useState } from 'react';
import { Badge, Button, Card, Input, Modal, type BadgeTone } from '@facturation/ui';
import type { Contact, CreateProjectRequest, Project, ProjectStatus } from '@facturation/core';
import { ApiError } from '../../lib/api';
import { createProject, deleteProject, updateProject } from '../../lib/projects';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/Confirm';

interface ProjectFields {
  name: string;
  status: ProjectStatus;
  notes: string;
  billingContactIds: string[];
}

const EMPTY_PROJECT: ProjectFields = {
  name: '',
  status: 'ACTIF',
  notes: '',
  billingContactIds: [],
};

const STATUS_LABEL: Record<ProjectStatus, string> = { ACTIF: 'Actif', TERMINE: 'Terminé' };
const statusTone = (s: ProjectStatus): BadgeTone => (s === 'ACTIF' ? 'brand' : 'neutral');

interface ProjectsTabProps {
  companyId: string;
  projects: Project[];
  billingContacts: Contact[];
  onRefresh: () => void;
}

export function ProjectsTab({ companyId, projects, billingContacts, onRefresh }: ProjectsTabProps) {
  const { notify } = useToast();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fields, setFields] = useState<ProjectFields>(EMPTY_PROJECT);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setFields(EMPTY_PROJECT);
    setFormError('');
    setOpen(true);
  };

  const openEdit = (p: Project) => {
    setEditingId(p.id);
    setFields({
      name: p.name,
      status: p.status,
      notes: p.notes ?? '',
      billingContactIds: p.billingContacts.map((c) => c.id),
    });
    setFormError('');
    setOpen(true);
  };

  const toggleContact = (id: string) =>
    setFields((prev) => ({
      ...prev,
      billingContactIds: prev.billingContactIds.includes(id)
        ? prev.billingContactIds.filter((x) => x !== id)
        : [...prev.billingContactIds, id],
    }));

  const submit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!fields.name.trim()) {
      setFormError('Le nom du projet est requis.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const trim = (v: string): string | null => (v.trim() ? v.trim() : null);
      const payload: CreateProjectRequest = {
        companyId,
        name: fields.name.trim(),
        status: fields.status,
        notes: trim(fields.notes),
        billingContactIds: fields.billingContactIds,
      };
      if (editingId) {
        const { companyId: _cid, ...updatePayload } = payload;
        await updateProject(editingId, updatePayload);
      } else {
        await createProject(payload);
      }
      setOpen(false);
      onRefresh();
      notify(editingId ? 'Projet mis à jour' : 'Projet créé', 'success');
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (p: Project): Promise<void> => {
    const ok = await confirm({
      message: `Supprimer le projet « ${p.name} » ?`,
      tone: 'danger',
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    try {
      await deleteProject(p.id);
      onRefresh();
      notify('Projet supprimé', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur lors de la suppression.', 'error');
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{projects.length} projet(s)</p>
        <Button size="sm" onClick={openCreate}>
          Nouveau projet
        </Button>
      </div>

      <Card className="mt-3">
        {projects.length === 0 ? (
          <div className="py-12 text-center">
            <p className="mb-4 text-sm text-muted">Aucun projet pour cette entreprise.</p>
            <Button onClick={openCreate}>Ajouter le premier projet</Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {projects.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-fg">{p.name}</span>
                    <Badge tone={statusTone(p.status)}>{STATUS_LABEL[p.status]}</Badge>
                  </div>
                  {p.billingContacts.length > 0 && (
                    <p className="truncate text-muted">
                      {p.billingContacts.map((c) => c.name).join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => openEdit(p)}>
                    Modifier
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => void remove(p)}>
                    Supprimer
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => !submitting && setOpen(false)}
        title={editingId ? 'Modifier le projet' : 'Nouveau projet'}
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
            id="project-name"
            label="Nom *"
            value={fields.name}
            onChange={(e) => setFields((prev) => ({ ...prev, name: e.target.value }))}
            disabled={submitting}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="project-status" className="text-sm font-medium text-fg">
              Statut
            </label>
            <select
              id="project-status"
              value={fields.status}
              onChange={(e) =>
                setFields((prev) => ({ ...prev, status: e.target.value as ProjectStatus }))
              }
              disabled={submitting}
              className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
            >
              <option value="ACTIF">Actif</option>
              <option value="TERMINE">Terminé</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="project-notes" className="text-sm font-medium text-fg">
              Notes
            </label>
            <textarea
              id="project-notes"
              value={fields.notes}
              onChange={(e) => setFields((prev) => ({ ...prev, notes: e.target.value }))}
              disabled={submitting}
              rows={3}
              className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
            />
          </div>
          {billingContacts.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-fg">
                Contacts de facturation
              </legend>
              <div className="space-y-2">
                {billingContacts.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <input
                      id={`proj-bc-${c.id}`}
                      type="checkbox"
                      checked={fields.billingContactIds.includes(c.id)}
                      onChange={() => toggleContact(c.id)}
                      disabled={submitting}
                      className="h-4 w-4 rounded border-border accent-brand disabled:opacity-50"
                    />
                    <label htmlFor={`proj-bc-${c.id}`} className="select-none text-sm text-fg">
                      {c.name}
                      {c.title ? <span className="ml-1 text-muted">— {c.title}</span> : null}
                    </label>
                  </div>
                ))}
              </div>
            </fieldset>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
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
    </>
  );
}
