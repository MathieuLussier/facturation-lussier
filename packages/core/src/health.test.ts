import { describe, expect, it } from 'vitest';
import { createHealth } from './health';

describe('createHealth', () => {
  it('returns ok status when the database is reachable', () => {
    expect(createHealth(true)).toEqual({ status: 'ok', db: true });
  });

  it('returns degraded status when the database is unreachable', () => {
    expect(createHealth(false)).toEqual({ status: 'degraded', db: false });
  });
});
