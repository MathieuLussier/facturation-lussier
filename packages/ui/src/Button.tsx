import type { ButtonHTMLAttributes } from 'react';
import { buttonClasses, type ButtonVariant } from './button-classes';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

/** Bouton de base du design system, stylé via Tailwind et le thème partagé. */
export function Button({ variant = 'primary', className, type = 'button', ...props }: ButtonProps) {
  const classes = [buttonClasses(variant), className].filter(Boolean).join(' ');
  return <button type={type} className={classes} {...props} />;
}
