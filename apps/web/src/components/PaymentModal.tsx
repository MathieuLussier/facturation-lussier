import { useEffect, useState } from 'react';
import { Button, Modal } from '@facturation/ui';
import type { PaymentMethod } from '@facturation/core';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from '../lib/payment-method';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (paidAt: string, paymentMethod: PaymentMethod) => void;
  busy?: boolean;
}

const FIELD_CLASS =
  'block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50';

function todayYmd(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

/** Modale de saisie du paiement (date + mode) lors du passage d'une facture à « Payée ». */
export function PaymentModal({ open, onClose, onConfirm, busy }: PaymentModalProps) {
  const [paidAt, setPaidAt] = useState(todayYmd());
  const [method, setMethod] = useState<PaymentMethod>('VIREMENT');

  useEffect(() => {
    if (open) {
      setPaidAt(todayYmd());
      setMethod('VIREMENT');
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Marquer comme payée">
      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="pay-date" className="text-sm font-medium text-fg">
            Date du paiement
          </label>
          <input
            id="pay-date"
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            disabled={busy}
            className={FIELD_CLASS}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="pay-method" className="text-sm font-medium text-fg">
            Mode de paiement
          </label>
          <select
            id="pay-method"
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            disabled={busy}
            className={FIELD_CLASS}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABEL[m]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button variant="primary" onClick={() => onConfirm(paidAt, method)} disabled={busy || !paidAt}>
            Confirmer le paiement
          </Button>
        </div>
      </div>
    </Modal>
  );
}
