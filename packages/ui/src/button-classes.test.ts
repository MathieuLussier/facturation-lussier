import { describe, expect, it } from 'vitest';
import { buttonClasses } from './button-classes';

describe('buttonClasses', () => {
  it('applies the brand background for the primary variant', () => {
    expect(buttonClasses('primary')).toContain('bg-brand');
  });

  it('applies a border for the secondary variant', () => {
    expect(buttonClasses('secondary')).toContain('border');
  });

  it('always includes the shared base classes', () => {
    expect(buttonClasses('primary')).toContain('rounded-md');
    expect(buttonClasses('secondary')).toContain('rounded-md');
  });
});
