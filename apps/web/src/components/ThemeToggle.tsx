import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { applyTheme, type ThemeMode } from '../lib/theme';

function currentMode(): ThemeMode {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>(currentMode);

  const toggle = (): void => {
    const next: ThemeMode = mode === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setMode(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={mode === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'}
      title={mode === 'dark' ? 'Thème clair' : 'Thème sombre'}
      className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-fg transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      {mode === 'dark' ? (
        <Sun className="h-[18px] w-[18px]" aria-hidden="true" />
      ) : (
        <Moon className="h-[18px] w-[18px]" aria-hidden="true" />
      )}
    </button>
  );
}
