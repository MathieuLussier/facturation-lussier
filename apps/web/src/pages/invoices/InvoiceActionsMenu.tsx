import { type ReactNode, useEffect, useRef, useState } from 'react';
import type { Invoice, InvoiceStatus } from '@facturation/core';
import { INVOICE_STATUS_LABEL } from '../../lib/invoice-status';

const STATUSES: InvoiceStatus[] = ['BROUILLON', 'ENVOYEE', 'PAYEE', 'ANNULEE'];

interface InvoiceActionsMenuProps {
  invoice: Invoice;
  busy?: boolean;
  onSetStatus: (status: InvoiceStatus) => void;
  onRequestPayee: () => void;
  onEdit: () => void;
  onSend: () => void;
  onRemind: () => void;
  onDownloadPdf: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
}

function GearIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface-2 ${
        danger ? 'text-danger' : 'text-fg'
      }`}
    >
      {children}
    </button>
  );
}

/** Menu d'actions (engrenage) d'une facture : statut + actions. */
export function InvoiceActionsMenu({
  invoice,
  busy,
  onSetStatus,
  onRequestPayee,
  onEdit,
  onSend,
  onRemind,
  onDownloadPdf,
  onToggleArchive,
  onDelete,
}: InvoiceActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const run = (fn: () => void) => (): void => {
    setOpen(false);
    fn();
  };

  const onStatusClick = (status: InvoiceStatus) => (): void => {
    setOpen(false);
    if (status === invoice.status) return;
    if (status === 'PAYEE') onRequestPayee();
    else onSetStatus(status);
  };

  const canSend = invoice.status === 'BROUILLON' || invoice.status === 'ENVOYEE';

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Actions"
        onClick={() => setOpen((v) => !v)}
        className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
      >
        <GearIcon />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-border bg-surface p-1 shadow-lg"
        >
          <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted">Statut</p>
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              role="menuitemradio"
              aria-checked={s === invoice.status}
              disabled={s === invoice.status}
              onClick={onStatusClick(s)}
              className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-surface-2 disabled:cursor-default ${
                s === invoice.status ? 'font-medium text-brand' : 'text-fg'
              }`}
            >
              {INVOICE_STATUS_LABEL[s]}
              {s === invoice.status && <span aria-hidden="true">✓</span>}
            </button>
          ))}

          <div className="my-1 h-px bg-border" />

          {invoice.editable && <MenuItem onClick={run(onEdit)}>Modifier</MenuItem>}
          {canSend && <MenuItem onClick={run(onSend)}>Envoyer par courriel</MenuItem>}
          {invoice.status === 'ENVOYEE' && <MenuItem onClick={run(onRemind)}>Envoyer un rappel</MenuItem>}
          <MenuItem onClick={run(onDownloadPdf)}>Télécharger le PDF</MenuItem>
          <MenuItem onClick={run(onToggleArchive)}>
            {invoice.archivedAt ? 'Désarchiver' : 'Archiver'}
          </MenuItem>
          {invoice.deletable && (
            <MenuItem onClick={run(onDelete)} danger>
              Supprimer
            </MenuItem>
          )}
        </div>
      )}
    </div>
  );
}
