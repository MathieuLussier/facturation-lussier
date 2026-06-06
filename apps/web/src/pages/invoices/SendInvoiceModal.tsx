import { useEffect, useState } from 'react';
import { Button, Modal } from '@facturation/ui';
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

function refLabel(invoice: Invoice): string {
  return invoice.reference ?? `#${invoice.number}`;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
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

function PaperclipIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

/** Composeur de courriel pour l'envoi (ou le rappel) d'une facture. */
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
  const sender = invoice.client?.companyName ?? 'Votre entreprise';

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="2xl"
      title={mode === 'send' ? 'Composer le courriel' : 'Composer le rappel'}
    >
      <div className="space-y-3">
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

        {/* En-tête du courriel (façon composeur) */}
        <div className="rounded-lg border border-border">
          <div className="flex items-center gap-3 border-b border-border px-3 py-2">
            <span className="w-20 shrink-0 text-sm text-muted">De</span>
            <span className="truncate text-sm text-fg">{sender}</span>
          </div>
          <div className="flex items-center gap-3 border-b border-border px-3 py-2">
            <label htmlFor="send-to" className="w-20 shrink-0 text-sm text-muted">
              À
            </label>
            <input
              id="send-to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              disabled={submitting}
              placeholder="destinataire@exemple.com"
              className="flex-1 bg-transparent text-sm text-fg placeholder:text-muted focus:outline-none disabled:opacity-50"
            />
          </div>
          <div className="flex items-center gap-3 px-3 py-2">
            <label htmlFor="send-subject" className="w-20 shrink-0 text-sm text-muted">
              Objet
            </label>
            <input
              id="send-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={submitting}
              className="flex-1 bg-transparent text-sm font-medium text-fg focus:outline-none disabled:opacity-50"
            />
          </div>
        </div>

        {/* Corps du message */}
        <textarea
          id="send-body"
          rows={12}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={submitting}
          className="block w-full resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-sm leading-relaxed text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
        />

        {/* Pièces jointes (pastilles à cocher) */}
        <div className="border-t border-border pt-3">
          <div className="flex items-center gap-1.5 text-sm font-medium text-fg">
            <PaperclipIcon />
            Pièces jointes
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm text-fg">
              <span className="max-w-[14rem] truncate">facture-{invoice.reference ?? invoice.number}.pdf</span>
              <span className="text-xs text-muted">PDF · toujours joint</span>
            </span>
            {attachments.map((att) => {
              const checked = selectedIds.includes(att.id);
              return (
                <label
                  key={att.id}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    checked ? 'border-brand bg-brand-soft text-fg' : 'border-border bg-surface text-muted'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleAttachment(att.id)}
                    disabled={submitting}
                    className="h-4 w-4 rounded border-border accent-brand"
                  />
                  <span className="max-w-[12rem] truncate">{att.fileName}</span>
                  <span className="text-xs text-muted">{formatBytes(att.sizeBytes)}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-3">
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
