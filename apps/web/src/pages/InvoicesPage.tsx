import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, buttonClasses } from '@facturation/ui';
import { Layers, Plus } from 'lucide-react';
import type { Invoice, InvoiceStatus, PaymentMethod } from '@facturation/core';
import {
  archiveInvoice,
  listInvoices,
  unarchiveInvoice,
  updateInvoiceStatus,
} from '../lib/invoices';
import { useApiResource } from '../lib/useApiResource';
import { useToast } from '../components/Toast';
import { InvoiceTable } from './invoices/InvoiceTable';
import { PaymentModal } from '../components/PaymentModal';
import { SendInvoiceModal } from './invoices/SendInvoiceModal';
import type { InvoiceGroupBy } from '../lib/invoice-view';

type FilterChip = InvoiceStatus | 'overdue' | 'all';

const FILTER_CHIPS: Array<{ id: FilterChip; label: string }> = [
  { id: 'all', label: 'Toutes' },
  { id: 'BROUILLON', label: 'Brouillon' },
  { id: 'ENVOYEE', label: 'Envoyée' },
  { id: 'PAYEE', label: 'Payée' },
  { id: 'ANNULEE', label: 'Annulée' },
  { id: 'overdue', label: 'En retard' },
];

export function InvoicesPage() {
  const { notify } = useToast();
  const [items, setItems] = useState<Invoice[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterChip>('all');
  const [groupBy, setGroupBy] = useState<InvoiceGroupBy>('none');
  const [pendingPayeeId, setPendingPayeeId] = useState<string | null>(null);
  const [reminderInvoice, setReminderInvoice] = useState<Invoice | null>(null);

  const { data, loading, error } = useApiResource(() => {
    const status: InvoiceStatus | undefined =
      activeFilter !== 'all' && activeFilter !== 'overdue' ? activeFilter : undefined;
    const overdue = activeFilter === 'overdue' ? true : undefined;
    return listInvoices({ status, overdue, archivedOnly: showArchived, pageSize: 500 });
  }, [activeFilter, showArchived]);

  // Copie locale éditable : les mutations de statut/archivage sont optimistes.
  useEffect(() => {
    if (data) setItems(data.items);
  }, [data]);
  const hitLimit = (data?.items.length ?? 0) === 500;

  const handleFilterClick = (chip: FilterChip): void => {
    setActiveFilter(chip);
  };

  const changeStatus = async (
    id: string,
    status: InvoiceStatus,
    paidAt?: string,
    paymentMethod?: PaymentMethod,
  ): Promise<void> => {
    try {
      const updated = await updateInvoiceStatus(id, status, paidAt, paymentMethod);
      setItems((prev) => prev.map((inv) => (inv.id === id ? updated : inv)));
      notify('Statut mis à jour', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur lors de la mise à jour.', 'error');
    }
  };

  const handlePaymentConfirm = (paidAt: string, paymentMethod: PaymentMethod): void => {
    const id = pendingPayeeId;
    setPendingPayeeId(null);
    if (id) void changeStatus(id, 'PAYEE', paidAt, paymentMethod);
  };

  const toggleArchive = async (inv: Invoice): Promise<void> => {
    try {
      const updated = inv.archivedAt
        ? await unarchiveInvoice(inv.id)
        : await archiveInvoice(inv.id);
      setItems((prev) => prev.map((i) => (i.id === inv.id ? updated : i)));
      notify(inv.archivedAt ? 'Facture désarchivée' : 'Facture archivée', 'success');
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "Erreur lors de l'archivage.",
        'error',
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">Factures</h1>
          <p className="text-sm text-muted">Facturation B2B (TPS/TVQ)</p>
        </div>
        <Link to="/invoices/new" className={buttonClasses('primary')}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nouvelle facture
        </Link>
      </div>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTER_CHIPS.map((chip) => {
            const isActive = activeFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => handleFilterClick(chip.id)}
                className={[
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                  isActive
                    ? 'bg-brand text-brand-fg shadow-sm'
                    : 'border border-border bg-surface text-muted hover:bg-surface-2 hover:text-fg',
                ].join(' ')}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Separator */}
        <span className="hidden h-5 w-px bg-border sm:block" aria-hidden="true" />

        {/* Group-by select */}
        <label className="flex items-center gap-2 text-sm text-muted">
          <Layers className="h-4 w-4" aria-hidden="true" />
          Regrouper par
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as InvoiceGroupBy)}
            className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-fg
                       focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="none">Aucun</option>
            <option value="client">Client</option>
            <option value="status">Statut</option>
            <optgroup label="Date de facturation">
              <option value="issueYear">Année</option>
              <option value="issueQuarter">Trimestre</option>
              <option value="issueMonth">Mois</option>
            </optgroup>
            <optgroup label="Date d'échéance">
              <option value="dueYear">Année</option>
              <option value="dueQuarter">Trimestre</option>
              <option value="dueMonth">Mois</option>
            </optgroup>
          </select>
        </label>

        {/* Show archived */}
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted select-none">
          <input
            id="show-archived"
            type="checkbox"
            className="h-4 w-4 rounded border-border accent-brand"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Archivées seulement
        </label>
      </div>

      {/* Limit notice */}
      {hitLimit && (
        <p className="text-xs text-muted">
          Affichage limité aux 500 plus récentes — affinez les filtres.
        </p>
      )}

      {/* Main card */}
      <Card>
        {loading && <p className="p-4 text-sm text-muted">Chargement…</p>}

        {!loading && !error && items.length === 0 && (
          <div className="py-12 text-center">
            <p className="mb-4 text-sm text-muted">Aucune facture pour le moment.</p>
            <Link to="/invoices/new" className={buttonClasses('primary')}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Créer la première facture
            </Link>
          </div>
        )}

        {!loading && items.length > 0 && (
          <InvoiceTable
            items={items}
            groupBy={groupBy}
            onStatusChange={(id, status) => void changeStatus(id, status)}
            onPayeeRequest={(id) => setPendingPayeeId(id)}
            onSendReminder={(inv) => setReminderInvoice(inv)}
            onToggleArchive={(inv) => void toggleArchive(inv)}
          />
        )}
      </Card>

      <PaymentModal
        open={pendingPayeeId !== null}
        onClose={() => setPendingPayeeId(null)}
        onConfirm={handlePaymentConfirm}
      />
      {reminderInvoice && (
        <SendInvoiceModal
          open
          mode="remind"
          invoice={reminderInvoice}
          onClose={() => setReminderInvoice(null)}
          onSent={() => notify('Rappel envoyé', 'success')}
        />
      )}
    </div>
  );
}
