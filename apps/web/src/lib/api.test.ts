import { describe, expect, it } from 'vitest';
import { healthUrl } from './api';

describe('healthUrl', () => {
  it('builds the health endpoint url from a base', () => {
    expect(healthUrl('http://localhost:3000')).toBe('http://localhost:3000/health');
  });

  it('strips a trailing slash from the base url', () => {
    expect(healthUrl('http://localhost:3000/')).toBe('http://localhost:3000/health');
  });
});
