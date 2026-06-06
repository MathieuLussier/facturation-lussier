import { type ChangeEvent, useRef, useState } from 'react';
import { Button, Card, Input } from '@facturation/ui';
import type { InvoiceAttachment } from '@facturation/core';
import {
  deleteInvoiceAttachment,
  downloadInvoiceAttachment,
  renameInvoiceAttachment,
  uploadInvoiceAttachment,
} from '../../lib/invoices';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/Confirm';

interface InvoiceAttachmentsProps {
  invoiceId: string;
  attachments: InvoiceAttachment[];
  onChange: (list: InvoiceAttachment[]) => void;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

export function InvoiceAttachments({ invoiceId, attachments, onChange }: InvoiceAttachmentsProps) {
  const { notify } = useToast();
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadInvoiceAttachment(invoiceId, file));
      notify('Pièce jointe ajoutée', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erreur lors du téléversement.", 'error');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (att: InvoiceAttachment): void => {
    setEditingId(att.id);
    setEditValue(att.fileName);
  };

  const saveEdit = async (att: InvoiceAttachment): Promise<void> => {
    const name = editValue.trim();
    if (!name || name === att.fileName) {
      setEditingId(null);
      return;
    }
    setBusy(true);
    try {
      onChange(await renameInvoiceAttachment(invoiceId, att.id, name));
      setEditingId(null);
      notify('Nom mis à jour', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur lors du renommage.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (att: InvoiceAttachment): Promise<void> => {
    if (
      !(await confirm({
        message: `Supprimer la pièce jointe « ${att.fileName} » ?`,
        tone: 'danger',
        confirmLabel: 'Supprimer',
      }))
    )
      return;
    setBusy(true);
    try {
      onChange(await deleteInvoiceAttachment(invoiceId, att.id));
      notify('Pièce jointe supprimée', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur lors de la suppression.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const download = async (att: InvoiceAttachment): Promise<void> => {
    try {
      await downloadInvoiceAttachment(invoiceId, att.id, att.fileName);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur lors du téléchargement.', 'error');
    }
  };

  return (
    <Card padded>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-fg">Pièces jointes</h2>
        <Button variant="secondary" size="sm" disabled={busy} onClick={() => fileInputRef.current?.click()}>
          + Ajouter un fichier
        </Button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => void handleUpload(e)} />
      </div>
      <p className="mt-1 text-xs text-muted">Jointes automatiquement au courriel d'envoi (max 15 Mo / fichier).</p>

      {attachments.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Aucune pièce jointe.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {attachments.map((att) => (
            <li key={att.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              {editingId === att.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    id={`att-name-${att.id}`}
                    label=""
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    disabled={busy}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void saveEdit(att);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                  <Button variant="primary" size="sm" disabled={busy} onClick={() => void saveEdit(att)}>
                    OK
                  </Button>
                  <Button variant="secondary" size="sm" disabled={busy} onClick={() => setEditingId(null)}>
                    Annuler
                  </Button>
                </div>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-fg">{att.fileName}</p>
                    <p className="text-xs text-muted">{formatBytes(att.sizeBytes)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button variant="secondary" size="sm" disabled={busy} onClick={() => void download(att)}>
                      Télécharger
                    </Button>
                    <Button variant="secondary" size="sm" disabled={busy} onClick={() => startEdit(att)}>
                      Renommer
                    </Button>
                    <Button variant="danger" size="sm" disabled={busy} onClick={() => void remove(att)}>
                      Supprimer
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
