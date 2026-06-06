import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';
import { Button, Card, Input } from '@facturation/ui';
import type { UpsertIssuerRequest } from '@facturation/core';
import { ApiError } from '../lib/api';
import { getIssuer, issuerLogoUrl, uploadIssuerLogo, upsertIssuer } from '../lib/issuer';
import {
  CANADA_PROVINCES,
  formatPhone,
  formatPostalCode,
  isValidPhone,
  isValidPostalCode,
} from '../lib/format';
import { useToast } from '../components/Toast';

const SELECT_CLASS =
  'block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50';

interface IssuerFields {
  legalName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  province: string;
  postalCode: string;
  gstNumber: string;
  qstNumber: string;
}

const EMPTY: IssuerFields = {
  legalName: '',
  email: '',
  phone: '',
  addressLine: '',
  city: '',
  province: 'QC',
  postalCode: '',
  gstNumber: '',
  qstNumber: '',
};

const TEXT_FIELDS: { key: keyof IssuerFields; label: string; type?: string }[] = [
  { key: 'email', label: 'Courriel', type: 'email' },
  { key: 'phone', label: 'Téléphone' },
  { key: 'addressLine', label: 'Adresse' },
  { key: 'city', label: 'Ville' },
  { key: 'province', label: 'Province' },
  { key: 'postalCode', label: 'Code postal' },
  { key: 'gstNumber', label: 'Numéro de TPS' },
  { key: 'qstNumber', label: 'Numéro de TVQ' },
];

function toPayload(f: IssuerFields): UpsertIssuerRequest {
  const t = (v: string) => (v.trim() ? v.trim() : undefined);
  return {
    legalName: f.legalName.trim(),
    email: t(f.email),
    phone: t(f.phone),
    addressLine: t(f.addressLine),
    city: t(f.city),
    province: t(f.province),
    postalCode: t(f.postalCode),
    gstNumber: t(f.gstNumber),
    qstNumber: t(f.qstNumber),
  };
}

export function IssuerPage() {
  const { notify } = useToast();
  const [fields, setFields] = useState<IssuerFields>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const issuer = await getIssuer();
        if (active && issuer) {
          setFields({
            legalName: issuer.legalName,
            email: issuer.email ?? '',
            phone: formatPhone(issuer.phone ?? ''),
            addressLine: issuer.addressLine ?? '',
            city: issuer.city ?? '',
            province: issuer.province ?? 'QC',
            postalCode: formatPostalCode(issuer.postalCode ?? ''),
            gstNumber: issuer.gstNumber ?? '',
            qstNumber: issuer.qstNumber ?? '',
          });
          if (issuer.logoPath) setLogoUrl(issuerLogoUrl(issuer.logoPath));
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Erreur de chargement.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const change = (key: keyof IssuerFields, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const updated = await uploadIssuerLogo(file);
      if (updated.logoPath) setLogoUrl(issuerLogoUrl(updated.logoPath));
      notify('Logo mis à jour', 'success');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Erreur lors du téléversement du logo.', 'error');
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  };

  const submit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    if (!fields.legalName.trim()) {
      setError('La raison sociale est requise.');
      return;
    }
    if (!isValidPhone(fields.phone)) {
      setError('Le numéro de téléphone est incomplet.');
      return;
    }
    if (!isValidPostalCode(fields.postalCode)) {
      setError('Le code postal est invalide (format A1A 1A1).');
      return;
    }
    setSubmitting(true);
    try {
      await upsertIssuer(toPayload(fields));
      notify('Profil enregistré', 'success');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erreur lors de l'enregistrement.", 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">Entreprise émettrice</h1>
          <p className="text-sm text-muted">Coordonnées et numéros de taxe — en-tête des factures</p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Chargement…</p>
      ) : (
        <>
        <Card padded>
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger"
            >
              {error}
            </div>
          )}

          <form onSubmit={(e) => void submit(e)} noValidate className="space-y-4">
            <Input
              id="issuer-legalName"
              label="Raison sociale *"
              type="text"
              value={fields.legalName}
              onChange={(e) => change('legalName', e.target.value)}
              disabled={submitting}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {TEXT_FIELDS.map((f) => {
                if (f.key === 'province') {
                  return (
                    <div key="province" className="flex flex-col gap-1.5">
                      <label htmlFor="issuer-province" className="text-sm font-medium text-fg">
                        Province
                      </label>
                      <select
                        id="issuer-province"
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
                    id={`issuer-${f.key}`}
                    label={f.label}
                    type={f.type ?? 'text'}
                    value={fields[f.key]}
                    onChange={onChange}
                    disabled={submitting}
                  />
                );
              })}
            </div>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </form>
        </Card>

        <Card padded>
          <h2 className="text-sm font-semibold text-fg">Logo de la facture</h2>
          <p className="mt-1 text-xs text-muted">PNG ou JPG, 2 Mo maximum. Affiché en en-tête du PDF.</p>
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Logo actuel"
              className="mt-3 max-h-20 rounded-md border border-border bg-surface-2 object-contain p-2"
            />
          )}
          <label className="mt-3 flex flex-col gap-2">
            <span className="text-sm text-muted">Sélectionner un fichier</span>
            <input
              type="file"
              accept="image/png,image/jpeg"
              disabled={logoUploading}
              onChange={(e) => void handleLogoUpload(e)}
              className="text-sm text-fg file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-fg hover:file:opacity-90 disabled:opacity-50"
            />
          </label>
          {logoUploading && <p className="mt-2 text-xs text-muted">Téléversement…</p>}
        </Card>
        </>
      )}
    </div>
  );
}
