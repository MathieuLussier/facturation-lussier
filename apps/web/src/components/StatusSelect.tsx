import { useEffect, useRef, useState } from 'react';
import { Badge } from '@facturation/ui';
import type { InvoiceStatus } from '@facturation/core';
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_TONE } from '../lib/invoice-status';

const STATUSES: InvoiceStatus[] = ['BROUILLON', 'ENVOYEE', 'PAYEE', 'ANNULEE'];

interface StatusSelectProps {
  value: InvoiceStatus;
  onChange: (status: InvoiceStatus) => void;
  /** Intercepte le passage à PAYEE (pour saisir date + mode de paiement). */
  onPayeeRequest?: () => void;
  disabled?: boolean;
}

/**
 * Pastille de statut cliquable façon « apps modernes » : le badge ouvre un
 * menu déroulant pour changer le statut. Utilisable en liste et en détail.
 */
export function StatusSelect({ value, onChange, onPayeeRequest, disabled }: StatusSelectProps) {
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

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex items-center gap-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
      >
        <Badge tone={INVOICE_STATUS_TONE[value]}>{INVOICE_STATUS_LABEL[value]}</Badge>
        <span aria-hidden="true" className="text-xs text-muted">
          ▾
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-20 mt-1 min-w-40 rounded-lg border border-border bg-surface p-1 shadow-lg"
        >
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              role="option"
              aria-selected={s === value}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                if (s === value) return;
                if (s === 'PAYEE' && onPayeeRequest) {
                  onPayeeRequest();
                } else {
                  onChange(s);
                }
              }}
              className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-surface-2 ${
                s === value ? 'text-brand' : 'text-fg'
              }`}
            >
              {INVOICE_STATUS_LABEL[s]}
              {s === value && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
