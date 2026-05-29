import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastContextValue {
  notify: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_CLASSES: Record<ToastTone, string> = {
  success: 'border-success/40 text-success',
  error: 'border-danger/40 text-danger',
  info: 'border-border text-fg',
};

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      counter += 1;
      const id = counter;
      setToasts((list) => [...list, { id, tone, message }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-full max-w-xs flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto rounded-lg border bg-surface px-4 py-3 text-sm shadow-lg ${TONE_CLASSES[t.tone]}`}
            >
              {t.message}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast doit être utilisé dans un ToastProvider');
  }
  return ctx;
}
