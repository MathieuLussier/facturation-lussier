import type { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Identifiant associant le label au champ (accessibilité). */
  id: string;
  /** Label au-dessus du champ (optionnel : omis si vide). */
  label?: string;
  /** Message d'erreur affiché sous le champ. */
  error?: string;
}

/** Champ de saisie accessible du design system. */
export function Input({ id, label, error, className, ...props }: InputProps) {
  const inputClasses = [
    'block w-full rounded-lg border bg-surface px-3 py-2 text-sm text-fg',
    'transition-colors placeholder:text-muted',
    'focus-visible:outline-none focus-visible:ring-2',
    'disabled:pointer-events-none disabled:opacity-50',
    error
      ? 'border-danger focus-visible:ring-danger'
      : 'border-border focus-visible:border-brand focus-visible:ring-brand',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-fg">
          {label}
        </label>
      )}
      <input
        id={id}
        className={inputClasses}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
