import { useEffect, useState } from 'react';
import { Button, Input, Modal } from '@facturation/ui';
import { formatCents, type Invoice } from '@facturation/core';
import { sendInvoice, sendInvoiceReminder } from '../../lib/invoices';

interface SendInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice;
  mode: 'send' | 'remind';
  /** Appelé après un envoi réussi (le parent recharge la facture). */
  onSent: () => void;
}

const TEXTAREA_CLASS =
  'block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50';

function refLabel(invoice: Invoice): string {
  return invoice.reference ?? `#${invoice.number}`;
}

function defaultSendBody(invoice: Invoice): string {
  return (
    `Bonjour,\n\n` +
    `Veuillez trouver ci-joint la facture ${refLabel(invoice)} ` +
    `d'un montant de ${formatCents(invoice.totalCents)}.\n\n` +
    `N'hésitez pas à nous contacter pour toute question.\n\nCordialement`
  );
}

function defaultRemindBody(invoice: Invoice): string {
  const echeance = invoice.dueDate ? ` (échéance : ${invoice.dueDate.slice(0, 10)})` : '';
  return (
    `Bonjour,\n\n` +
    `Nous vous rappelons que la facture ${refLabel(invoice)} ` +
    `d'un montant de ${formatCents(invoice.totalCents)} est toujours en attente de règlement${echeance}.\n\n` +
    `Merci de régulariser cette situation.\n\nCordialement`
  );
}

/** Modale d'envoi (ou de rappel) d'une facture par courriel. */
export function SendInvoiceModal({ open, onClose, invoice, mode, onSent }: SendInvoiceModalProps) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const attachments = invoice.attachments ?? [];

  useEffect(() => {
    if (!open) return;
    const ref = refLabel(invoice);
    setTo(invoice.billingContact?.email ?? invoice.client?.email ?? '');
    setSubject(mode === 'send' ? `Facture ${ref}` : `Rappel — Facture ${ref}`);
    setBody(mode === 'send' ? defaultSendBody(invoice) : defaultRemindBody(invoice));
    // Toutes les pièces jointes cochées par défaut.
    setSelectedIds((invoice.attachments ?? []).map((a) => a.id));
    setError('');
  }, [open, invoice, mode]);

  const toggleAttachment = (id: string): void =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async (): Promise<void> => {
    if (!to.trim()) {
      setError('Saisissez une adresse courriel de destinataire.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload = { to: to.trim(), subject, body, attachmentIds: selectedIds };
      if (mode === 'send') {
        await sendInvoice(invoice.id, payload);
      } else {
        await sendInvoiceReminder(invoice.id, payload);
      }
      onSent();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi du courriel.");
    } finally {
      setSubmitting(false);
    }
  };

  const noEmail = !invoice.billingContact?.email && !invoice.client?.email;

  return (
    <Modal open={open} onClose={onClose} title={mode === 'send' ? 'Envoyer la facture' : 'Envoyer un rappel'}>
      <div className="space-y-4">
        {noEmail && (
          <p className="rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-sm text-warning">
            Ce client n'a pas d'adresse courriel. Saisissez-en une ci-dessous.
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <Input
          id="send-to"
          label="Destinataire (courriel)"
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          disabled={submitting}
        />
        <Input
          id="send-subject"
          label="Objet"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={submitting}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="send-body" className="text-sm font-medium text-fg">
            Message
          </label>
          <textarea
            id="send-body"
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={submitting}
            className={TEXTAREA_CLASS}
          />
        </div>

        {attachments.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-fg">Pièces jointes</span>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {attachments.map((att) => (
                <li key={att.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <input
                    id={`send-att-${att.id}`}
                    type="checkbox"
                    checked={selectedIds.includes(att.id)}
                    onChange={() => toggleAttachment(att.id)}
                    disabled={submitting}
                    className="h-4 w-4 rounded border-border accent-brand"
                  />
                  <label
                    htmlFor={`send-att-${att.id}`}
                    className="min-w-0 flex-1 cursor-pointer truncate text-fg"
                  >
                    {att.fileName}
                  </label>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted">Le PDF de la facture est toujours joint.</p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button variant="primary" onClick={() => void submit()} disabled={submitting}>
            {submitting ? 'Envoi…' : 'Envoyer'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
