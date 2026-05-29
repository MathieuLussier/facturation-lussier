import { describe, expect, it } from 'vitest';
import { buttonClasses } from './button-classes';

describe('buttonClasses', () => {
  it('applique le fond de marque pour la variante primary', () => {
    expect(buttonClasses('primary')).toContain('bg-brand');
  });

  it('applique une bordure pour la variante secondary', () => {
    expect(buttonClasses('secondary')).toContain('border');
  });

  it('inclut toujours les classes de base partagées', () => {
    expect(buttonClasses('primary')).toContain('rounded-lg');
    expect(buttonClasses('secondary')).toContain('rounded-lg');
  });

  it('gère les tailles', () => {
    expect(buttonClasses('primary', 'sm')).toContain('text-xs');
    expect(buttonClasses('primary', 'md')).toContain('text-sm');
  });
});
