import type { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Identifiant associant le label au champ (obligatoire pour l'accessibilité). */
  id: string;
  /** Texte du label affiché au-dessus du champ. */
  label: string;
  /** Message d'erreur affiché sous le champ. */
  error?: string;
}

/**
 * Champ de saisie accessible du design system.
 * Inclut un label lié, un champ stylé et un message d'erreur optionnel.
 */
export function Input({ id, label, error, className, ...props }: InputProps) {
  const inputClasses = [
    'block w-full rounded-md border px-3 py-2 text-sm',
    'transition-colors placeholder:text-gray-400',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
    'disabled:pointer-events-none disabled:opacity-50',
    error
      ? 'border-red-500 text-red-900 focus-visible:ring-red-500'
      : 'border-gray-300 text-gray-900 focus-visible:border-brand',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <input id={id} className={inputClasses} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} {...props} />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
