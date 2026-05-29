import type { HTMLAttributes } from 'react';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'danger' | 'warning';

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-muted',
  brand: 'bg-brand-soft text-brand',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

/** Pastille d'état du design system. */
export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  const classes = [
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
    TONE_CLASSES[tone],
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return <span className={classes} {...props} />;
}
