import { Fragment } from 'react';
import { Badge } from '@facturation/ui';
import type { InvoiceStatus } from '@facturation/core';

const STAGES: Array<{ value: InvoiceStatus; label: string }> = [
  { value: 'BROUILLON', label: 'Brouillon' },
  { value: 'ENVOYEE', label: 'Envoyée' },
  { value: 'PAYEE', label: 'Payée' },
];

interface InvoiceStatusBarProps {
  status: InvoiceStatus;
  overdue?: boolean;
  archived?: boolean;
}

/** Pipeline de statut façon Odoo : Brouillon › Envoyée › Payée (étape courante mise en avant). */
export function InvoiceStatusBar({ status, overdue, archived }: InvoiceStatusBarProps) {
  if (status === 'ANNULEE') {
    return (
      <div className="flex items-center gap-2">
        <Badge tone="danger">Annulée</Badge>
        {archived && <Badge tone="warning">Archivée</Badge>}
      </div>
    );
  }

  const currentIndex = STAGES.findIndex((s) => s.value === status);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {STAGES.map((s, i) => (
        <Fragment key={s.value}>
          {i > 0 && (
            <span aria-hidden="true" className="text-muted">
              ›
            </span>
          )}
          <span
            className={[
              'rounded-md px-2.5 py-1 text-xs font-medium',
              i === currentIndex
                ? 'bg-brand text-brand-fg'
                : i < currentIndex
                  ? 'bg-brand-soft text-brand'
                  : 'bg-surface-2 text-muted',
            ].join(' ')}
          >
            {s.label}
          </span>
        </Fragment>
      ))}
      {overdue && <Badge tone="danger">En retard</Badge>}
      {archived && <Badge tone="warning">Archivée</Badge>}
    </div>
  );
}
