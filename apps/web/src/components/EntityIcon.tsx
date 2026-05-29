import type { DirectoryKind } from '@facturation/core';

export interface EntityIconProps {
  kind: DirectoryKind;
  className?: string;
}

/**
 * Icône inline représentant le type d'entité de l'annuaire :
 * - company  → bâtiment (immeuble de bureau)
 * - individual / contact → silhouette humaine
 */
export function EntityIcon({ kind, className = 'h-5 w-5' }: EntityIconProps) {
  if (kind === 'company') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        {/* Bâtiment */}
        <rect x="3" y="7" width="18" height="14" rx="1" />
        {/* Toit / fronton */}
        <path d="M3 7 L12 2 L21 7" />
        {/* Porte */}
        <rect x="9.5" y="14" width="5" height="7" rx="0.5" />
        {/* Fenêtres */}
        <rect x="5" y="10" width="3" height="2.5" rx="0.25" />
        <rect x="16" y="10" width="3" height="2.5" rx="0.25" />
      </svg>
    );
  }

  // individual | contact → personne
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Tête */}
      <circle cx="12" cy="8" r="4" />
      {/* Corps */}
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}
