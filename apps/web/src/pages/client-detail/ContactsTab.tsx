import { type FormEvent, useState } from 'react';
import { Badge, Button, Card, Input, Modal } from '@facturation/ui';
import type { Contact, CreateContactRequest } from '@facturation/core';
import { ApiError } from '../../lib/api';
import {
  archiveContact,
  createContact,
  deleteContact,
  unarchiveContact,
  updateContact,
} from '../../lib/contacts';
import { formatPhone } from '../../lib/format';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/Confirm';

interface ContactFields {
  name: string;
  email: string;
  phone: string;
  title: string;
  isBillingContact: boolean;
  notes: string;
}

const EMPTY_CONTACT: ContactFields = {
  name: '',
  email: '',
  phone: '',
  title: '',
  isBillingContact: false,
  notes: '',
};

function contactPayload(f: ContactFields, companyId: string): CreateContactRequest {
  const trim = (v: string): string | null => (v.trim() ? v.trim() : null);
  return {
    companyId,
    name: f.name.trim(),
    email: trim(f.email),
    phone: trim(f.phone),
    title: trim(f.title),
    isBillingContact: f.isBillingContact,
    notes: trim(f.notes),
  };
}

interface ContactsTabProps {
  companyId: string;
  contacts: Contact[];
  showArchived: boolean;
  onToggleArchived: () => void;
  onRefresh: () => void;
}

export function ContactsTab({
  companyId,
  contacts,
  showArchived,
  onToggleArchived,
  onRefresh,
}: ContactsTabProps) {
  const { notify } = useToast();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fields, setFields] = useState<ContactFields>(EMPTY_CONTACT);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setFields(EMPTY_CONTACT);
    setFormError('');
    setOpen(true);
  };

  const openEdit = (c: Contact) => {
    setEditingId(c.id);
    setFields({
      name: c.name,
      email: c.email ?? '',
      phone: c.phone ?? '',
      title: c.title ?? '',
      isBillingContact: c.isBillingContact,
      notes: c.notes ?? '',
    });
    setFormError('');
    setOpen(true);
  };

  const change = <K extends keyof ContactFields>(key: K, value: ContactFields[K]) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!fields.name.trim()) {
      setFormError('Le nom est requis.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const payload = contactPayload(fields, companyId);
      if (editingId) {
        const { companyId: _cid, ...updatePayload } = payload;
        await updateContact(editingId, updatePayload);
      } else {
        await createContact(payload);
      }
      setOpen(false);
      onRefresh();
      notify(editingId ? 'Contact mis à jour' : 'Contact créé', 'success');
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (c: Contact): Promise<void> => {
    const ok = await confirm({
      message: `Supprimer le contact « ${c.name} » ?`,
      tone: 'danger',
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    try {
      await deleteContact(c.id);
      onRefresh();
      notify('Contact supprimé', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur lors de la suppression.', 'error');
    }
  };

  const archive = async (c: Contact): Promise<void> => {
    try {
      await archiveContact(c.id);
      onRefresh();
      notify('Contact archivé', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur lors de l\'archivage.', 'error');
    }
  };

  const unarchive = async (c: Contact): Promise<void> => {
    try {
      await unarchiveContact(c.id);
      onRefresh();
      notify('Contact désarchivé', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur lors du désarchivage.', 'error');
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted">{contacts.length} contact(s)</p>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted select-none">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={onToggleArchived}
              className="h-4 w-4 rounded border-border accent-brand"
            />
            Afficher les archivés
          </label>
        </div>
        <Button size="sm" onClick={openCreate}>
          Nouveau contact
        </Button>
      </div>

      <Card className="mt-3">
        {contacts.length === 0 ? (
          <div className="py-12 text-center">
            <p className="mb-4 text-sm text-muted">Aucun contact pour cette entreprise.</p>
            <Button onClick={openCreate}>Ajouter le premier contact</Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {contacts.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-fg">{c.name}</span>
                    {c.isBillingContact && <Badge tone="brand">Facturation</Badge>}
                    {c.archivedAt && <Badge tone="warning">Archivé</Badge>}
                  </div>
                  <p className="truncate text-muted">
                    {[c.title, c.email, c.phone].filter(Boolean).join(' · ') || '—'}
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
      </Card>

      <Modal
        open={open}
        onClose={() => !submitting && setOpen(false)}
        title={editingId ? 'Modifier le contact' : 'Nouveau contact'}
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
            id="contact-name"
            label="Nom *"
            value={fields.name}
            onChange={(e) => change('name', e.target.value)}
            disabled={submitting}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="contact-email"
              label="Courriel"
              type="email"
              value={fields.email}
              onChange={(e) => change('email', e.target.value)}
              disabled={submitting}
            />
            <Input
              id="contact-phone"
              label="Téléphone"
              value={fields.phone}
              onChange={(e) => change('phone', formatPhone(e.target.value))}
              disabled={submitting}
            />
          </div>
          <Input
            id="contact-title"
            label="Fonction"
            value={fields.title}
            onChange={(e) => change('title', e.target.value)}
            disabled={submitting}
          />
          <div className="flex items-center gap-2">
            <input
              id="contact-billing"
              type="checkbox"
              checked={fields.isBillingContact}
              onChange={(e) => change('isBillingContact', e.target.checked)}
              disabled={submitting}
              className="h-4 w-4 rounded border-border accent-brand disabled:opacity-50"
            />
            <label htmlFor="contact-billing" className="select-none text-sm text-fg">
              Contact de facturation
            </label>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="contact-notes" className="text-sm font-medium text-fg">
              Notes
            </label>
            <textarea
              id="contact-notes"
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
