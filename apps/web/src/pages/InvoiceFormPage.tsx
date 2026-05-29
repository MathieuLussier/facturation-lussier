import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input } from '@facturation/ui';
import {
  computeInvoiceTotals,
  computeLineAmountCents,
  formatCents,
  type Client,
  type CreateInvoiceRequest,
} from '@facturation/core';
import { ApiError } from '../lib/api';
import { listClients } from '../lib/clients';
import { createInvoice, dollarsToCents } from '../lib/invoices';

interface LineDraft {
  description: string;
  quantity: string;
  unitPrice: string;
}

const EMPTY_LINE: LineDraft = { description: '', quantity: '1', unitPrice: '0' };

function parseQty(v: string): number {
  return Number.parseFloat(v.replace(',', '.')) || 0;
}

export function InvoiceFormPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([{ ...EMPTY_LINE }]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await listClients({ pageSize: 100 });
        setClients(res.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement des clients.');
      }
    })();
  }, []);

  const totals = computeInvoiceTotals(
    lines.map((l) => ({ quantity: parseQty(l.quantity), unitPriceCents: dollarsToCents(l.unitPrice) })),
  );

  const setLine = (i: number, key: keyof LineDraft, value: string) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [key]: value } : l)));
  const addLine = () => setLines((prev) => [...prev, { ...EMPTY_LINE }]);
  const removeLine = (i: number) =>
    setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

  const submit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    if (!clientId) {
      setError('Sélectionnez un client.');
      return;
    }
    if (lines.some((l) => !l.description.trim())) {
      setError('Chaque ligne doit avoir une description.');
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateInvoiceRequest = {
        clientId,
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
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand">Nouvelle facture</h1>
        <Link
          to="/invoices"
          className="text-sm text-brand underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          ← Factures
        </Link>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={(e) => void submit(e)} noValidate className="space-y-6">
        <section className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 p-6 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="inv-client" className="text-sm font-medium text-gray-700">
              Client *
            </label>
            <select
              id="inv-client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={submitting}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
            >
              <option value="">— Sélectionner —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
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
        </section>

        <section className="rounded-lg border border-gray-200 p-6">
          <h2 className="mb-4 font-semibold">Lignes</h2>
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
                  <span className="text-sm text-gray-700">
                    {formatCents(computeLineAmountCents(parseQty(l.quantity), dollarsToCents(l.unitPrice)))}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    disabled={submitting || lines.length <= 1}
                    aria-label="Retirer la ligne"
                    className="text-gray-400 hover:text-red-600 disabled:opacity-30"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Button type="button" variant="secondary" onClick={addLine} disabled={submitting}>
              + Ajouter une ligne
            </Button>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 p-6">
          <dl className="ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Sous-total</dt>
              <dd>{formatCents(totals.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">TPS (5 %)</dt>
              <dd>{formatCents(totals.gstCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">TVQ (9,975 %)</dt>
              <dd>{formatCents(totals.qstCents)}</dd>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold">
              <dt>Total</dt>
              <dd>{formatCents(totals.totalCents)}</dd>
            </div>
          </dl>
        </section>

        <div className="flex flex-col gap-1">
          <label htmlFor="inv-notes" className="text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            id="inv-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitting}
            rows={2}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
          />
        </div>

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Création…' : 'Créer la facture'}
        </Button>
      </form>
    </main>
  );
}
