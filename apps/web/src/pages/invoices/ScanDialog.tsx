import { useEffect, useState } from 'react';
import { Button, Modal } from '@facturation/ui';
import type { InvoiceAttachment } from '@facturation/core';
import { Check, Loader2, RefreshCw, ScanLine } from 'lucide-react';
import {
  desktopScanResultToFile,
  listScanDevices,
  scanViaDesktop,
  type DesktopScanResult,
  type ScanColorMode,
  type ScanDevice,
  type ScanSource,
} from '../../lib/desktop-scan';
import { uploadInvoiceAttachment } from '../../lib/invoices';
import { useToast } from '../../components/Toast';

const SELECT_CLASS =
  'block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50';

const DPI_OPTIONS = [150, 200, 300, 600];
const COLOR_OPTIONS: { value: ScanColorMode; label: string }[] = [
  { value: 'color', label: 'Couleur' },
  { value: 'gray', label: 'Niveaux de gris' },
  { value: 'bw', label: 'Noir et blanc' },
];
const SOURCE_OPTIONS: { value: ScanSource; label: string }[] = [
  { value: 'flatbed', label: 'Vitre (à plat)' },
  { value: 'adf', label: 'Chargeur (ADF)' },
];

interface ScanDialogProps {
  invoiceId: string;
  open: boolean;
  onClose: () => void;
  onAttached: (attachments: InvoiceAttachment[]) => void;
}

export function ScanDialog({ invoiceId, open, onClose, onAttached }: ScanDialogProps) {
  const { notify } = useToast();
  const [devices, setDevices] = useState<ScanDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [dpi, setDpi] = useState(300);
  const [colorMode, setColorMode] = useState<ScanColorMode>('color');
  const [source, setSource] = useState<ScanSource>('flatbed');
  const [scanning, setScanning] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [result, setResult] = useState<DesktopScanResult | null>(null);

  // Charge la liste des scanners à l'ouverture.
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoadingDevices(true);
    setResult(null);
    void (async () => {
      try {
        const list = await listScanDevices();
        if (!active) return;
        setDevices(list);
        setDeviceId((prev) => prev || list[0]?.id || '');
      } catch {
        if (active) setDevices([]);
      } finally {
        if (active) setLoadingDevices(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [open]);

  const busy = scanning || attaching;

  const runScan = async (): Promise<void> => {
    setScanning(true);
    setResult(null);
    try {
      const scan = await scanViaDesktop({
        deviceId: deviceId || undefined,
        dpi,
        colorMode,
        source,
      });
      setResult(scan);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur lors de la numérisation.', 'error');
    } finally {
      setScanning(false);
    }
  };

  const attach = async (): Promise<void> => {
    if (!result) return;
    setAttaching(true);
    try {
      const file = desktopScanResultToFile(result);
      const list = await uploadInvoiceAttachment(invoiceId, file);
      onAttached(list);
      notify('Document numérisé joint à la facture', 'success');
      onClose();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erreur lors de l'ajout du document.", 'error');
    } finally {
      setAttaching(false);
    }
  };

  const isImage = result?.mimeType.startsWith('image/') ?? false;

  return (
    <Modal open={open} onClose={() => !busy && onClose()} title="Numériser un document" size="2xl">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[18rem_1fr]">
        {/* ── Réglages ── */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="scan-device" className="text-sm font-medium text-fg">
              Scanner
            </label>
            <select
              id="scan-device"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              disabled={busy || loadingDevices}
              className={SELECT_CLASS}
            >
              {devices.length === 0 && <option value="">{loadingDevices ? 'Détection…' : 'Aucun scanner détecté'}</option>}
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name || d.id}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="scan-source" className="text-sm font-medium text-fg">
              Source
            </label>
            <select
              id="scan-source"
              value={source}
              onChange={(e) => setSource(e.target.value as ScanSource)}
              disabled={busy}
              className={SELECT_CLASS}
            >
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="scan-color" className="text-sm font-medium text-fg">
                Couleur
              </label>
              <select
                id="scan-color"
                value={colorMode}
                onChange={(e) => setColorMode(e.target.value as ScanColorMode)}
                disabled={busy}
                className={SELECT_CLASS}
              >
                {COLOR_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="scan-dpi" className="text-sm font-medium text-fg">
                Résolution
              </label>
              <select
                id="scan-dpi"
                value={dpi}
                onChange={(e) => setDpi(Number(e.target.value))}
                disabled={busy}
                className={SELECT_CLASS}
              >
                {DPI_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} DPI
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button variant="secondary" className="w-full" disabled={busy} onClick={() => void runScan()}>
            {scanning ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : result ? (
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ScanLine className="h-4 w-4" aria-hidden="true" />
            )}
            {scanning ? 'Numérisation…' : result ? 'Re-numériser' : 'Numériser'}
          </Button>
        </div>

        {/* ── Aperçu ── */}
        <div className="flex min-h-64 flex-col">
          <span className="mb-1.5 text-sm font-medium text-fg">Aperçu</span>
          <div className="flex flex-1 items-center justify-center overflow-auto rounded-lg border border-border bg-surface-2 p-3">
            {scanning ? (
              <div className="flex flex-col items-center gap-2 text-muted">
                <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                <span className="text-sm">Numérisation en cours…</span>
              </div>
            ) : result && isImage ? (
              <img
                src={`data:${result.mimeType};base64,${result.base64}`}
                alt="Aperçu de la numérisation"
                className="max-h-[28rem] w-auto rounded-md object-contain shadow-sm"
              />
            ) : result ? (
              <div className="flex flex-col items-center gap-2 text-muted">
                <Check className="h-6 w-6 text-success" aria-hidden="true" />
                <span className="text-sm">Document prêt : {result.fileName}</span>
              </div>
            ) : (
              <span className="text-sm text-muted">
                Choisis un scanner et clique « Numériser » pour voir l'aperçu.
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" disabled={busy} onClick={onClose}>
          Annuler
        </Button>
        <Button disabled={busy || !result} onClick={() => void attach()}>
          {attaching ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="h-4 w-4" aria-hidden="true" />
          )}
          {attaching ? 'Ajout…' : 'Joindre à la facture'}
        </Button>
      </div>
    </Modal>
  );
}
