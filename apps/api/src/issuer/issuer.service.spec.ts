import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { IssuerService } from './issuer.service';
import type { PrismaService } from '../prisma/prisma.service';

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'i1',
    legalName: 'Lussier inc.',
    email: null,
    phone: null,
    addressLine: null,
    city: null,
    province: 'QC',
    postalCode: null,
    country: 'Canada',
    gstNumber: '123456789RT0001',
    qstNumber: '1234567890TQ0001',
    logoPath: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makePrisma() {
  const model = {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  return {
    prisma: { client: { issuerProfile: model } } as unknown as PrismaService,
    model,
  };
}

describe('IssuerService', () => {
  it('get retourne null si aucun profil', async () => {
    const { prisma, model } = makePrisma();
    model.findFirst.mockResolvedValue(null);
    await expect(new IssuerService(prisma).get()).resolves.toBeNull();
  });

  it('get retourne le profil mappé (dates ISO)', async () => {
    const { prisma, model } = makePrisma();
    model.findFirst.mockResolvedValue(makeRow());
    const res = await new IssuerService(prisma).get();
    expect(res).toMatchObject({ legalName: 'Lussier inc.', gstNumber: '123456789RT0001' });
    expect(res?.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('upsert crée si aucun profil existant', async () => {
    const { prisma, model } = makePrisma();
    model.findFirst.mockResolvedValue(null);
    model.create.mockResolvedValue(makeRow());
    await new IssuerService(prisma).upsert({ legalName: 'Lussier inc.' });
    expect(model.create).toHaveBeenCalledWith({ data: { legalName: 'Lussier inc.' } });
    expect(model.update).not.toHaveBeenCalled();
  });

  it('upsert met à jour le profil existant', async () => {
    const { prisma, model } = makePrisma();
    model.findFirst.mockResolvedValue(makeRow());
    model.update.mockResolvedValue(makeRow({ city: 'Québec' }));
    const res = await new IssuerService(prisma).upsert({ legalName: 'Lussier inc.', city: 'Québec' });
    expect(model.update).toHaveBeenCalledWith({
      where: { id: 'i1' },
      data: { legalName: 'Lussier inc.', city: 'Québec' },
    });
    expect(res.city).toBe('Québec');
  });

  it('get mappe logoPath', async () => {
    const { prisma, model } = makePrisma();
    model.findFirst.mockResolvedValue(makeRow({ logoPath: 'uploads/logo-1.png' }));
    const res = await new IssuerService(prisma).get();
    expect(res?.logoPath).toBe('uploads/logo-1.png');
  });

  it('updateLogo lève NotFound si aucun profil', async () => {
    const { prisma, model } = makePrisma();
    model.findFirst.mockResolvedValue(null);
    await expect(new IssuerService(prisma).updateLogo('uploads/logo-1.png')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(model.update).not.toHaveBeenCalled();
  });

  it('updateLogo enregistre le chemin du logo', async () => {
    const { prisma, model } = makePrisma();
    model.findFirst.mockResolvedValue(makeRow({ logoPath: null }));
    model.update.mockResolvedValue(makeRow({ logoPath: 'uploads/logo-1.png' }));
    const res = await new IssuerService(prisma).updateLogo('uploads/logo-1.png');
    expect(model.update).toHaveBeenCalledWith({
      where: { id: 'i1' },
      data: { logoPath: 'uploads/logo-1.png' },
    });
    expect(res.logoPath).toBe('uploads/logo-1.png');
  });
});
