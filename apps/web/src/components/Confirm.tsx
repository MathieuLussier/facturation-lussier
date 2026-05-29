import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Button, Modal } from '@facturation/ui';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = (result: boolean): void => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={options !== null} onClose={() => settle(false)} title={options?.title ?? 'Confirmer'}>
        <p className="text-sm text-muted">{options?.message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => settle(false)}>
            Annuler
          </Button>
          <Button
            variant={options?.tone === 'danger' ? 'danger' : 'primary'}
            onClick={() => settle(true)}
          >
            {options?.confirmLabel ?? 'Confirmer'}
          </Button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm doit être utilisé dans un ConfirmProvider');
  }
  return ctx;
}
