import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Input } from '@facturation/ui';
import {
  computeInvoiceTotals,
  computeLineAmountCents,
  formatCents,
  type Client,
  type Contact,
  type CreateInvoiceRequest,
  type Project,
} from '@facturation/core';
import { ApiError } from '../lib/api';
import { listClients } from '../lib/clients';
import { listContacts } from '../lib/contacts';
import { listProjects } from '../lib/projects';
import { createInvoice, dollarsToCents } from '../lib/invoices';

interface LineDraft {
  description: string;
  quantity: string;
  unitPrice: string;
}

const EMPTY_LINE: LineDraft = { description: '', quantity: '1', unitPrice: '0' };
const SELECT_CLASS =
  'block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50';

function parseQty(v: string): number {
  return Number.parseFloat(v.replace(',', '.')) || 0;
}

export function InvoiceFormPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [companyContacts, setCompanyContacts] = useState<Contact[]>([]);

  const [projectId, setProjectId] = useState('');
  const [clientId, setClientId] = useState('');
  const [billingContactId, setBillingContactId] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([{ ...EMPTY_LINE }]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [cRes, pRes] = await Promise.all([listClients({ pageSize: 100 }), listProjects()]);
        setClients(cRes.items);
        setProjects(pRes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement.');
      }
    })();
  }, []);

  const selectedProject = projectId ? (projects.find((p) => p.id === projectId) ?? null) : null;
  const effectiveClientId = selectedProject ? selectedProject.companyId : clientId;

  // Sans projet : charge les contacts de l'entreprise choisie pour proposer ses contacts de facturation.
  useEffect(() => {
    if (selectedProject || !clientId) {
      setCompanyContacts([]);
      return;
    }
    let active = true;
    void (async () => {
      try {
        const cs = await listContacts(clientId);
        if (active) setCompanyContacts(cs);
      } catch {
        if (active) setCompanyContacts([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [clientId, selectedProject]);

  const billingContactOptions: Contact[] = selectedProject
    ? selectedProject.billingContacts
    : companyContacts.filter((c) => c.isBillingContact);

  const companyName = (id: string): string =>
    clients.find((c) => c.id === id)?.companyName ?? '—';

  const totals = computeInvoiceTotals(
    lines.map((l) => ({ quantity: parseQty(l.quantity), unitPriceCents: dollarsToCents(l.unitPrice) })),
  );

  const onProjectChange = (id: string): void => {
    setProjectId(id);
    setBillingContactId('');
    if (id) setClientId('');
  };

  const setLine = (i: number, key: keyof LineDraft, value: string) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [key]: value } : l)));
  const addLine = () => setLines((prev) => [...prev, { ...EMPTY_LINE }]);
  const removeLine = (i: number) =>
    setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

  const submit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    if (!effectiveClientId) {
      setError('Sélectionnez un projet ou une entreprise.');
      return;
    }
    if (lines.some((l) => !l.description.trim())) {
      setError('Chaque ligne doit avoir une description.');
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateInvoiceRequest = {
        clientId: effectiveClientId,
        projectId: projectId || undefined,
        billingContactId: billingContactId || undefined,
        notes: notes.trim() || undefined,
        issueDate: issueDate ? new Date(issueDate).toISOString() : undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        lines: lines.map((l) => ({
          description: l.description.trim(),
          quantity: parseQty(l.quantity),
          unitPriceCents: dollarsToCents(l.unitPrice),
        })),
      };
      const inv = await createInvoice(payload);
      navigate(`/invoices/${inv.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur lors de la création.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Nouvelle facture</h1>
        <Link
          to="/invoices"
          className="text-sm text-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          ← Factures
        </Link>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <form onSubmit={(e) => void submit(e)} noValidate className="space-y-6">
        {/* Projet / entreprise / contact / dates */}
        <Card padded>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="inv-project" className="text-sm font-medium text-fg">
                Projet
              </label>
              <select
                id="inv-project"
                value={projectId}
                onChange={(e) => onProjectChange(e.target.value)}
                disabled={submitting}
                className={SELECT_CLASS}
              >
                <option value="">— Aucun projet —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {companyName(p.companyId)}
                  </option>
                ))}
              </select>
            </div>

            {selectedProject ? (
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-fg">Entreprise</span>
                <p className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-muted">
                  {companyName(selectedProject.companyId)} (depuis le projet)
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <label htmlFor="inv-client" className="text-sm font-medium text-fg">
                  Entreprise *
                </label>
                <select
                  id="inv-client"
                  value={clientId}
                  onChange={(e) => {
                    setClientId(e.target.value);
                    setBillingContactId('');
                  }}
                  disabled={submitting}
                  className={SELECT_CLASS}
                >
                  <option value="">— Sélectionner —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label htmlFor="inv-contact" className="text-sm font-medium text-fg">
                Contact de facturation
              </label>
              <select
                id="inv-contact"
                value={billingContactId}
                onChange={(e) => setBillingContactId(e.target.value)}
                disabled={submitting || billingContactOptions.length === 0}
                className={SELECT_CLASS}
              >
                <option value="">— Aucun —</option>
                {billingContactOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.title ? ` (${c.title})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <Input
              id="inv-issueDate"
              label="Date d'émission"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              disabled={submitting}
            />
            <Input
              id="inv-dueDate"
              label="Échéance"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={submitting}
            />
          </div>
        </Card>

        {/* Lignes */}
        <Card padded>
          <h2 className="mb-4 text-sm font-semibold text-fg">Lignes</h2>
          <div className="space-y-3">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 items-end gap-2">
                <div className="col-span-6">
                  <Input
                    id={`line-desc-${i}`}
                    label={i === 0 ? 'Description' : ''}
                    type="text"
                    value={l.description}
                    onChange={(e) => setLine(i, 'description', e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    id={`line-qty-${i}`}
                    label={i === 0 ? 'Qté' : ''}
                    type="text"
                    inputMode="decimal"
                    value={l.quantity}
                    onChange={(e) => setLine(i, 'quantity', e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    id={`line-price-${i}`}
                    label={i === 0 ? 'Prix unit. ($)' : ''}
                    type="text"
                    inputMode="decimal"
                    value={l.unitPrice}
                    onChange={(e) => setLine(i, 'unitPrice', e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div className="col-span-2 flex items-center justify-between gap-1 pb-2">
                  <span className="text-sm text-muted">
                    {formatCents(computeLineAmountCents(parseQty(l.quantity), dollarsToCents(l.unitPrice)))}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    disabled={submitting || lines.length <= 1}
                    aria-label="Retirer la ligne"
                    className="text-muted hover:text-danger disabled:opacity-30"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Button type="button" variant="secondary" size="sm" onClick={addLine} disabled={submitting}>
              + Ajouter une ligne
            </Button>
          </div>
        </Card>

        {/* Totaux */}
        <Card padded>
          <dl className="ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Sous-total</dt>
              <dd className="text-fg">{formatCents(totals.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">TPS (5 %)</dt>
              <dd className="text-fg">{formatCents(totals.gstCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">TVQ (9,975 %)</dt>
              <dd className="text-fg">{formatCents(totals.qstCents)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold">
              <dt className="text-fg">Total</dt>
              <dd className="text-fg">{formatCents(totals.totalCents)}</dd>
            </div>
          </dl>
        </Card>

        {/* Notes */}
        <Card padded>
          <div className="flex flex-col gap-1">
            <label htmlFor="inv-notes" className="text-sm font-medium text-fg">
              Notes
            </label>
            <textarea
              id="inv-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
              rows={2}
              className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
            />
          </div>
        </Card>

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Création…' : 'Créer la facture'}
        </Button>
      </form>
    </div>
  );
}
