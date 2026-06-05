import { useEffect, useState } from 'react';
import { Button, Input, Modal } from '@facturation/ui';
import type { Product } from '@facturation/core';
import { centsToInput, dollarsToCents } from '../../lib/invoices';
import { createProduct, updateProduct } from '../../lib/products';

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Produit à éditer ; absent ⇒ création. */
  product?: Product | null;
}

const FIELD_CLASS =
  'block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50';

export function ProductFormModal({ open, onClose, onSaved, product }: ProductFormModalProps) {
  const isEdit = Boolean(product);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState('0');
  const [unit, setUnit] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(product?.name ?? '');
    setDescription(product?.description ?? '');
    setUnitPrice(product ? centsToInput(product.unitPriceCents) : '0');
    setUnit(product?.unit ?? '');
    setIsActive(product?.isActive ?? true);
    setError('');
  }, [open, product]);

  const submit = async (): Promise<void> => {
    if (!name.trim()) {
      setError('Le nom est requis.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        unitPriceCents: dollarsToCents(unitPrice),
        unit: unit.trim() || null,
        isActive,
      };
      if (isEdit && product) {
        await updateProduct(product.id, payload);
      } else {
        await createProduct(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Modifier le produit' : 'Nouveau produit'}>
      <div className="space-y-4">
        {error && (
          <p role="alert" className="rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <Input
          id="prod-name"
          label="Nom *"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="prod-desc" className="text-sm font-medium text-fg">
            Description
          </label>
          <textarea
            id="prod-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            className={FIELD_CLASS}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            id="prod-price"
            label="Prix unitaire ($)"
            type="text"
            inputMode="decimal"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            disabled={submitting}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="prod-unit" className="text-sm font-medium text-fg">
              Unité
            </label>
            <input
              id="prod-unit"
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              disabled={submitting}
              placeholder="ex. heure, forfait, unité"
              className={FIELD_CLASS}
            />
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-fg select-none">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border accent-brand"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={submitting}
          />
          Actif (proposé dans le catalogue)
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button variant="primary" onClick={() => void submit()} disabled={submitting}>
            {submitting ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
