export type ButtonVariant = 'primary' | 'secondary';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-brand-fg hover:bg-brand/90',
  secondary: 'border border-brand bg-transparent text-brand hover:bg-brand/10',
};

const BASE_CLASSES =
  'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium ' +
  'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ' +
  'disabled:pointer-events-none disabled:opacity-50';

/** Construit la liste de classes Tailwind pour une variante de bouton. */
export function buttonClasses(variant: ButtonVariant): string {
  return `${BASE_CLASSES} ${VARIANT_CLASSES[variant]}`;
}
