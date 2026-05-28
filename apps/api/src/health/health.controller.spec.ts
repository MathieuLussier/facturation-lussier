import 'reflect-metadata';
import { HealthController } from './health.controller';
import type { HealthService } from './health.service';

describe('HealthController', () => {
  it('returns an ok payload when the database responds', async () => {
    const service = {
      check: jest.fn().mockResolvedValue({ status: 'ok', db: true }),
    } as unknown as HealthService;

    const controller = new HealthController(service);

    await expect(controller.check()).resolves.toEqual({ status: 'ok', db: true });
  });

  it('returns a degraded payload when the database is unreachable', async () => {
    const service = {
      check: jest.fn().mockResolvedValue({ status: 'degraded', db: false }),
    } as unknown as HealthService;

    const controller = new HealthController(service);

    await expect(controller.check()).resolves.toEqual({ status: 'degraded', db: false });
  });
});
