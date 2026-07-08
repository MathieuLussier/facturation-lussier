import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Card } from '@facturation/ui';
import {
  formatCents,
  type Invoice,
  type InvoiceAttachment as InvoiceAttachmentType,
  type InvoiceStatus,
  type PaymentMethod,
} from '@facturation/core';
import {
  archiveInvoice,
  deleteInvoice,
  downloadInvoicePdf,
  fetchInvoicePdfBlob,
  getInvoice,
  openInvoicePdf,
  unarchiveInvoice,
  updateInvoiceStatus,
  uploadInvoiceAttachment,
} from '../lib/invoices';
import { ArrowLeft, Loader2, Pencil, Printer, ScanLine, Send } from 'lucide-react';
import { useApiResource } from '../lib/useApiResource';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/Confirm';
import { PaymentModal } from '../components/PaymentModal';
import { SendInvoiceModal } from './invoices/SendInvoiceModal';
import { InvoiceActionsMenu } from './invoices/InvoiceActionsMenu';
import { InvoiceAttachments } from './invoices/InvoiceAttachments';
import { InvoiceStatusBar } from './invoices/InvoiceStatusBar';
import { PAYMENT_METHOD_LABEL } from '../lib/payment-method';
import {
  isDesktopPrintAvailable,
  isDesktopScanAvailable,
  printPdfViaDesktop,
} from '../lib/desktop-scan';
import { ScanDialog } from './invoices/ScanDialog';

/** Une facture ENVOYEE dont l'échéance est dépassée est « en retard ». */
function isOverdue(invoice: Invoice): boolean {
  if (invoice.status !== 'ENVOYEE' || !invoice.dueDate) return false;
  return new Date(invoice.dueDate) < new Date();
}

/** Ruban d'angle (façon Odoo) selon l'état de la facture. */
function ribbonFor(invoice: Invoice): { label: string; cls: string } | null {
  if (invoice.status === 'PAYEE') return { label: 'PAYÉ', cls: 'bg-success' };
  if (invoice.status === 'ANNULEE') return { label: 'ANNULÉ', cls: 'bg-danger' };
  if (isOverdue(invoice)) return { label: 'EN RETARD', cls: 'bg-warning' };
  return null;
}

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [busy, setBusy] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [sendModal, setSendModal] = useState<{ open: boolean; mode: 'send' | 'remind' }>({
    open: false,
    mode: 'send',
  });
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);

  const {
    data: invoiceData,
    loading,
    error,
    reload: load,
  } = useApiResource(
    () => (id ? getInvoice(id) : Promise.reject(new Error('Facture introuvable'))),
    [id],
  );

  // Copie locale éditable : statut/pièces jointes/archivage sont mis à jour en place.
  useEffect(() => {
    if (invoiceData) setInvoice(invoiceData);
  }, [invoiceData]);

  const changeStatus = async (
    status: InvoiceStatus,
    paidAt?: string,
    paymentMethod?: PaymentMethod,
  ): Promise<void> => {
    if (!id) return;
    setBusy(true);
    try {
      setInvoice(await updateInvoiceStatus(id, status, paidAt, paymentMethod));
      notify('Statut mis à jour', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur lors du changement de statut.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handlePaymentConfirm = (paidAt: string, paymentMethod: PaymentMethod): void => {
    setPaymentModalOpen(false);
    void changeStatus('PAYEE', paidAt, paymentMethod);
  };

  // App de bureau : dialogue d'impression natif (aperçu + choix imprimante). Sinon : ouverture du PDF.
  const imprimer = async (): Promise<void> => {
    if (!invoice) return;
    try {
      if (isDesktopPrintAvailable()) {
        const blob = await fetchInvoicePdfBlob(invoice.id);
        await printPdfViaDesktop(blob);
      } else {
        await openInvoicePdf(invoice.id);
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erreur lors de l'impression.", 'error');
    }
  };

  const downloadPdf = async (): Promise<void> => {
    if (!invoice) return;
    try {
      await downloadInvoicePdf(invoice.id, invoice.reference ?? invoice.number);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur lors du téléchargement du PDF.', 'error');
    }
  };

  const attachScannedFile = async (file: File): Promise<void> => {
    if (!invoice) return;
    setScanning(true);
    try {
      const list = await uploadInvoiceAttachment(invoice.id, file);
      setInvoice((prev) => (prev ? { ...prev, attachments: list } : prev));
      notify('Document ajouté en pièce jointe', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erreur lors de l'ajout du document.", 'error');
    } finally {
      setScanning(false);
    }
  };

  // App de bureau : dialogue de numérisation (choix scanner + aperçu). Sinon : sélecteur de fichier / caméra.
  const scanner = (): void => {
    if (isDesktopScanAvailable()) {
      setScanDialogOpen(true);
    } else {
      scanInputRef.current?.click();
    }
  };

  const handleScanFile = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) await attachScannedFile(file);
  };

  const remove = async (): Promise<void> => {
    if (!id) return;
    if (!(await confirm({ message: 'Supprimer cette facture ?', tone: 'danger', confirmLabel: 'Supprimer' }))) return;
    setBusy(true);
    try {
      await deleteInvoice(id);
      notify('Facture supprimée', 'success');
      navigate('/invoices');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur lors de la suppression.', 'error');
      setBusy(false);
    }
  };

  const toggleArchive = async (): Promise<void> => {
    if (!invoice) return;
    setBusy(true);
    try {
      const updated = invoice.archivedAt
        ? await unarchiveInvoice(invoice.id)
        : await archiveInvoice(invoice.id);
      setInvoice(updated);
      notify(invoice.archivedAt ? 'Facture désarchivée' : 'Facture archivée', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erreur lors de l'archivage.", 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleAttachmentsChange = (list: InvoiceAttachmentType[]): void => {
    setInvoice((prev) => (prev ? { ...prev, attachments: list } : prev));
  };

  const canSend = invoice !== null && (invoice.status === 'BROUILLON' || invoice.status === 'ENVOYEE');
  const ribbon = invoice ? ribbonFor(invoice) : null;
  const client = invoice?.client;
  const cityLine = client
    ? [client.city, client.province, client.postalCode].filter(Boolean).join(' ')
    : '';

  return (
    <div className="space-y-4">
      {/* Barre d'outils façon Odoo — retour à gauche, actions à droite */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <Link
          to="/invoices"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Factures
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {invoice?.editable && (
            <Button variant="secondary" disabled={busy} onClick={() => navigate(`/invoices/${invoice.id}/edit`)}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Modifier
            </Button>
          )}
          {canSend && invoice && (
            <Button variant="primary" disabled={busy} onClick={() => setSendModal({ open: true, mode: 'send' })}>
              <Send className="h-4 w-4" aria-hidden="true" />
              Envoyer par courriel
            </Button>
          )}
          {invoice && (
            <>
              <Button variant="secondary" disabled={busy} onClick={() => void imprimer()}>
                <Printer className="h-4 w-4" aria-hidden="true" />
                Imprimer
              </Button>
              <Button variant="secondary" disabled={busy || scanning} onClick={() => void scanner()}>
                {scanning ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ScanLine className="h-4 w-4" aria-hidden="true" />
                )}
                {scanning ? 'Numérisation…' : 'Scanner'}
              </Button>
              <input
                ref={scanInputRef}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => void handleScanFile(e)}
              />
              <InvoiceActionsMenu
                invoice={invoice}
                busy={busy}
                onSetStatus={(s) => void changeStatus(s)}
                onRequestPayee={() => setPaymentModalOpen(true)}
                onEdit={() => navigate(`/invoices/${invoice.id}/edit`)}
                onSend={() => setSendModal({ open: true, mode: 'send' })}
                onRemind={() => setSendModal({ open: true, mode: 'remind' })}
                onDownloadPdf={() => void downloadPdf()}
                onToggleArchive={() => void toggleArchive()}
                onDelete={() => void remove()}
              />
            </>
          )}
        </div>
      </div>

      {/* Pipeline de statut (droite) */}
      {invoice && (
        <div className="flex justify-end">
          <InvoiceStatusBar
            status={invoice.status}
            overdue={isOverdue(invoice)}
            archived={Boolean(invoice.archivedAt)}
          />
        </div>
      )}

      {loading && <p className="text-sm text-muted">Chargement…</p>}

      {error && (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {invoice && (
        <>
          {/* Carte document façon Odoo */}
          <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
            {ribbon && (
              <span
                className={`pointer-events-none absolute -right-12 top-6 w-44 rotate-45 py-1 text-center text-xs font-bold uppercase tracking-wider text-white shadow-md ${ribbon.cls}`}
              >
                {ribbon.label}
              </span>
            )}

            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Facture client</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-fg">
              {invoice.reference ?? 'Brouillon'}
            </h1>

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Client + référence */}
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted">Client</dt>
                  <dd className="mt-1 text-fg">
                    <p className="font-medium">{client?.companyName ?? '—'}</p>
                    {client?.addressLine && <p className="text-muted">{client.addressLine}</p>}
                    {cityLine && <p className="text-muted">{cityLine}</p>}
                    {client?.country && <p className="text-muted">{client.country}</p>}
                    {client?.email && <p className="text-muted">{client.email}</p>}
                  </dd>
                </div>
                {invoice.billingContact && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">À l'attention de</dt>
                    <dd className="text-right text-fg">{invoice.billingContact.name}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Référence</dt>
                  <dd className="text-right text-fg">{invoice.reference ?? '—'}</dd>
                </div>
              </dl>

              {/* Dates */}
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Date de facturation</dt>
                  <dd className="text-right text-fg">{invoice.issueDate.slice(0, 10)}</dd>
                </div>
                {invoice.dueDate && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Date d'échéance</dt>
                    <dd className={`text-right ${isOverdue(invoice) ? 'font-medium text-danger' : 'text-fg'}`}>
                      {invoice.dueDate.slice(0, 10)}
                    </dd>
                  </div>
                )}
                {invoice.project && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Projet</dt>
                    <dd className="text-right text-fg">{invoice.project.name}</dd>
                  </div>
                )}
                {invoice.status === 'PAYEE' && invoice.paidAt && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Payée le</dt>
                    <dd className="text-right text-success">
                      {invoice.paidAt.slice(0, 10)}
                      {invoice.paymentMethod ? ` — ${PAYMENT_METHOD_LABEL[invoice.paymentMethod]}` : ''}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Lignes + totaux */}
          <Card>
            <div className="overflow-hidden rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-left text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 text-right font-medium">Qté</th>
                    <th className="px-4 py-3 text-right font-medium">Prix unit.</th>
                    <th className="px-4 py-3 text-right font-medium">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoice.lines.map((l) => (
                    <tr key={l.id} className="text-fg">
                      <td className="px-4 py-3">{l.description}</td>
                      <td className="px-4 py-3 text-right">{l.quantity}</td>
                      <td className="px-4 py-3 text-right">{formatCents(l.unitPriceCents)}</td>
                      <td className="px-4 py-3 text-right">{formatCents(l.amountCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <dl className="ml-auto max-w-xs space-y-1 p-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Sous-total</dt>
                  <dd className="text-fg">{formatCents(invoice.subtotalCents)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">TPS (5 %)</dt>
                  <dd className="text-fg">{formatCents(invoice.gstCents)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">TVQ (9,975 %)</dt>
                  <dd className="text-fg">{formatCents(invoice.qstCents)}</dd>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-semibold">
                  <dt className="text-fg">Total</dt>
                  <dd className="text-fg">{formatCents(invoice.totalCents)}</dd>
                </div>
              </dl>
            </div>
          </Card>

          {invoice.notes && (
            <Card padded>
              <p className="text-sm text-muted">{invoice.notes}</p>
            </Card>
          )}

          <InvoiceAttachments
            invoiceId={invoice.id}
            attachments={invoice.attachments ?? []}
            onChange={handleAttachmentsChange}
          />

          <PaymentModal
            open={paymentModalOpen}
            onClose={() => setPaymentModalOpen(false)}
            onConfirm={handlePaymentConfirm}
            busy={busy}
          />
          <SendInvoiceModal
            open={sendModal.open}
            mode={sendModal.mode}
            invoice={invoice}
            onClose={() => setSendModal((s) => ({ ...s, open: false }))}
            onSent={() => {
              notify(sendModal.mode === 'send' ? 'Facture envoyée par courriel' : 'Rappel envoyé', 'success');
              void load();
            }}
          />
          <ScanDialog
            invoiceId={invoice.id}
            open={scanDialogOpen}
            onClose={() => setScanDialogOpen(false)}
            onAttached={(list) => setInvoice((prev) => (prev ? { ...prev, attachments: list } : prev))}
          />
        </>
      )}
    </div>
  );
}
