import { type FormEvent, useState } from 'react';
import { Button, Card, Input, Modal } from '@facturation/ui';
import type { Client, ClientType, UpdateClientRequest } from '@facturation/core';
import { ApiError } from '../../lib/api';
import { updateClient } from '../../lib/clients';
import { useToast } from '../../components/Toast';

interface InfosTabProps {
  client: Client;
  onUpdated: (c: Client) => void;
}

const INFOS_FIELDS: { key: keyof UpdateClientRequest; label: string; type?: string }[] = [
  { key: 'email', label: 'Courriel', type: 'email' },
  { key: 'phone', label: 'Téléphone' },
  { key: 'addressLine', label: 'Adresse' },
  { key: 'city', label: 'Ville' },
  { key: 'province', label: 'Province' },
  { key: 'postalCode', label: 'Code postal' },
];

const TYPE_LABELS: Record<ClientType, string> = {
  COMPANY: 'Société',
  INDIVIDUAL: 'Particulier',
};

interface EditFields extends UpdateClientRequest {
  type: ClientType;
}

export function InfosTab({ client, onUpdated }: InfosTabProps) {
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fields, setFields] = useState<EditFields>({ type: client.type });

  const openEdit = () => {
    setFields({
      type: client.type,
      companyName: client.companyName,
      email: client.email ?? '',
      phone: client.phone ?? '',
      addressLine: client.addressLine ?? '',
      city: client.city ?? '',
      province: client.province ?? '',
      postalCode: client.postalCode ?? '',
      notes: client.notes ?? '',
    });
    setFormError('');
    setOpen(true);
  };

  const change = (key: keyof EditFields, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!String(fields.companyName ?? '').trim()) {
      setFormError('Le nom est requis.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const updated = await updateClient(client.id, fields);
      onUpdated(updated);
      setOpen(false);
      notify('Client mis à jour', 'success');
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  };

  const row = (label: string, value: string | null | undefined) =>
    value ? (
      <div key={label}>
        <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
        <dd className="mt-0.5 text-sm text-fg">{value}</dd>
      </div>
    ) : null;

  return (
    <>
      <Card padded>
        <div className="flex items-start justify-between gap-4">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {row('Nom', client.companyName)}
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">Type</dt>
              <dd className="mt-0.5 text-sm text-fg">{TYPE_LABELS[client.type]}</dd>
            </div>
            {row('Courriel', client.email)}
            {row('Téléphone', client.phone)}
            {row('Adresse', client.addressLine)}
            {row('Ville', client.city)}
            {row('Province', client.province)}
            {row('Code postal', client.postalCode)}
            {row('Notes', client.notes)}
          </dl>
          <Button variant="secondary" size="sm" onClick={openEdit}>
            Modifier
          </Button>
        </div>
      </Card>

      <Modal open={open} onClose={() => !submitting && setOpen(false)} title="Modifier le client">
        {formError && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger"
          >
            {formError}
          </div>
        )}
        <form onSubmit={(e) => void submit(e)} noValidate className="space-y-4">
          {/* Segmented toggle Société / Particulier */}
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-fg">Type</span>
            <div className="inline-flex rounded-lg border border-border">
              {(['COMPANY', 'INDIVIDUAL'] as ClientType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={submitting}
                  onClick={() => change('type', t)}
                  className={[
                    'flex-1 px-4 py-2 text-sm font-medium transition-colors first:rounded-l-lg last:rounded-r-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50',
                    fields.type === t
                      ? 'bg-brand text-white'
                      : 'bg-surface text-muted hover:text-fg',
                  ].join(' ')}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <Input
            id="info-companyName"
            label="Nom *"
            value={String(fields.companyName ?? '')}
            onChange={(e) => change('companyName', e.target.value)}
            disabled={submitting}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {INFOS_FIELDS.map((f) => (
              <Input
                key={f.key}
                id={`info-${f.key}`}
                label={f.label}
                type={f.type ?? 'text'}
                value={String(fields[f.key] ?? '')}
                onChange={(e) => change(f.key, e.target.value)}
                disabled={submitting}
              />
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="info-notes" className="text-sm font-medium text-fg">
              Notes
            </label>
            <textarea
              id="info-notes"
              value={String(fields.notes ?? '')}
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
