import { type ChangeEvent, type FormEvent, useState } from 'react';
import { Button, Input, Modal } from '@facturation/ui';
import type { ClientType, CreateClientRequest } from '@facturation/core';
import { ApiError } from '../../lib/api';
import { createClient } from '../../lib/clients';
import { CANADA_PROVINCES, formatPhone, formatPostalCode } from '../../lib/format';

const SELECT_CLASS =
  'block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50';

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

const TEXT_FIELDS: { key: keyof ClientFields; label: string; type?: string }[] = [
  { key: 'email', label: 'Courriel', type: 'email' },
  { key: 'phone', label: 'Téléphone' },
  { key: 'addressLine', label: 'Adresse' },
  { key: 'city', label: 'Ville' },
  { key: 'province', label: 'Province' },
  { key: 'postalCode', label: 'Code postal' },
];

function toPayload(f: ClientFields, type: ClientType): CreateClientRequest {
  const t = (v: string) => (v.trim() ? v.trim() : undefined);
  return {
    type,
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

export interface ClientCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  onError: (message: string) => void;
}

/**
 * Modal de création d'un client (société ou particulier).
 * Les actions d'édition / archivage / suppression se font dans la page détail.
 */
export function ClientCreateModal({ open, onClose, onCreated, onError }: ClientCreateModalProps) {
  const [clientType, setClientType] = useState<ClientType>('COMPANY');
  const [fields, setFields] = useState<ClientFields>(EMPTY);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    if (submitting) return;
    setFields(EMPTY);
    setClientType('COMPANY');
    setFormError('');
    onClose();
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
    if (clientType === 'INDIVIDUAL' && !fields.email.trim()) {
      setFormError('Le courriel est requis pour un particulier.');
      return;
    }
    setSubmitting(true);
    try {
      await createClient(toPayload(fields, clientType));
      setFields(EMPTY);
      setClientType('COMPANY');
      onCreated();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur lors de l'enregistrement.";
      setFormError(msg);
      onError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const typeLabel = clientType === 'COMPANY' ? 'Société' : 'Particulier';
  const namePlaceholder = clientType === 'COMPANY' ? 'Raison sociale' : 'Nom complet';

  return (
    <Modal open={open} onClose={handleClose} title="Nouveau client">
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
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-fg">Type</span>
          <div className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
            {(['COMPANY', 'INDIVIDUAL'] as ClientType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setClientType(t)}
                disabled={submitting}
                className={[
                  'flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                  clientType === t
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-muted hover:text-fg disabled:opacity-50',
                ].join(' ')}
              >
                {t === 'COMPANY' ? 'Société' : 'Particulier'}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">{typeLabel} sélectionné(e)</p>
        </div>

        <Input
          id="client-companyName"
          label={`Nom * (${namePlaceholder})`}
          type="text"
          value={fields.companyName}
          onChange={(e) => change('companyName', e.target.value)}
          disabled={submitting}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {TEXT_FIELDS.map((f) => {
            if (f.key === 'province') {
              return (
                <div key="province" className="flex flex-col gap-1.5">
                  <label htmlFor="client-province" className="text-sm font-medium text-fg">
                    Province
                  </label>
                  <select
                    id="client-province"
                    value={fields.province}
                    onChange={(e) => change('province', e.target.value)}
                    disabled={submitting}
                    className={SELECT_CLASS}
                  >
                    {CANADA_PROVINCES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }
            const onChange = (e: ChangeEvent<HTMLInputElement>): void => {
              if (f.key === 'phone') change('phone', formatPhone(e.target.value));
              else if (f.key === 'postalCode') change('postalCode', formatPostalCode(e.target.value));
              else change(f.key, e.target.value);
            };
            return (
              <Input
                key={f.key}
                id={`client-${f.key}`}
                label={f.key === 'email' && clientType === 'INDIVIDUAL' ? 'Courriel *' : f.label}
                type={f.type ?? 'text'}
                value={fields[f.key]}
                onChange={onChange}
                disabled={submitting}
              />
            );
          })}
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
          <Button type="button" variant="secondary" onClick={handleClose} disabled={submitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
