import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  Ban,
  BadgeCheck,
  Bell,
  Check,
  Download,
  FileEdit,
  Pencil,
  Send,
  Settings,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import type { Invoice, InvoiceStatus } from '@facturation/core';
import { INVOICE_STATUS_LABEL } from '../../lib/invoice-status';

const STATUSES: InvoiceStatus[] = ['BROUILLON', 'ENVOYEE', 'PAYEE', 'ANNULEE'];

const STATUS_ICON: Record<InvoiceStatus, LucideIcon> = {
  BROUILLON: FileEdit,
  ENVOYEE: Send,
  PAYEE: BadgeCheck,
  ANNULEE: Ban,
};

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

function MenuItem({
  children,
  onClick,
  danger,
  icon: Icon,
}: {
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
  icon: LucideIcon;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface-2 ${
        danger ? 'text-danger' : 'text-fg'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
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
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-fg transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
      >
        <Settings className="h-4 w-4" aria-hidden="true" />
        Action
        <span aria-hidden="true" className="text-xs text-muted">
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-border bg-surface p-1 shadow-lg"
        >
          <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted">Statut</p>
          {STATUSES.map((s) => {
            const StatusIcon = STATUS_ICON[s];
            const isCurrent = s === invoice.status;
            return (
              <button
                key={s}
                type="button"
                role="menuitemradio"
                aria-checked={isCurrent}
                disabled={isCurrent}
                onClick={onStatusClick(s)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-surface-2 disabled:cursor-default ${
                  isCurrent ? 'font-medium text-brand' : 'text-fg'
                }`}
              >
                <StatusIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="flex-1 text-left">{INVOICE_STATUS_LABEL[s]}</span>
                {isCurrent && <Check className="h-4 w-4" aria-hidden="true" />}
              </button>
            );
          })}

          <div className="my-1 h-px bg-border" />

          {invoice.editable && (
            <MenuItem onClick={run(onEdit)} icon={Pencil}>
              Modifier
            </MenuItem>
          )}
          {canSend && (
            <MenuItem onClick={run(onSend)} icon={Send}>
              Envoyer par courriel
            </MenuItem>
          )}
          {invoice.status === 'ENVOYEE' && (
            <MenuItem onClick={run(onRemind)} icon={Bell}>
              Envoyer un rappel
            </MenuItem>
          )}
          <MenuItem onClick={run(onDownloadPdf)} icon={Download}>
            Télécharger le PDF
          </MenuItem>
          <MenuItem onClick={run(onToggleArchive)} icon={invoice.archivedAt ? ArchiveRestore : Archive}>
            {invoice.archivedAt ? 'Désarchiver' : 'Archiver'}
          </MenuItem>
          {invoice.deletable && (
            <MenuItem onClick={run(onDelete)} danger icon={Trash2}>
              Supprimer
            </MenuItem>
          )}
        </div>
      )}
    </div>
  );
}
