import type { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Ajoute un padding interne (p-6). */
  padded?: boolean;
}

/** Surface élevée du design system. */
export function Card({ padded = false, className, ...props }: CardProps) {
  const classes = [
    'rounded-xl border border-border bg-surface shadow-sm',
    padded ? 'p-6' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return <div className={classes} {...props} />;
}
