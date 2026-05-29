import { Injectable } from '@nestjs/common';
import type { IssuerProfile as DbIssuer } from '@prisma/client';
import type { IssuerProfile, UpsertIssuerRequest } from '@facturation/core';
import { PrismaService } from '../prisma/prisma.service';

function toIssuer(row: DbIssuer): IssuerProfile {
  return {
    id: row.id,
    legalName: row.legalName,
    email: row.email,
    phone: row.phone,
    addressLine: row.addressLine,
    city: row.city,
    province: row.province,
    postalCode: row.postalCode,
    country: row.country,
    gstNumber: row.gstNumber,
    qstNumber: row.qstNumber,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Profil émetteur unique (singleton : au plus une ligne). */
@Injectable()
export class IssuerService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<IssuerProfile | null> {
    const row = await this.prisma.client.issuerProfile.findFirst();
    return row ? toIssuer(row) : null;
  }

  async upsert(data: UpsertIssuerRequest): Promise<IssuerProfile> {
    const existing = await this.prisma.client.issuerProfile.findFirst();
    const row = existing
      ? await this.prisma.client.issuerProfile.update({ where: { id: existing.id }, data })
      : await this.prisma.client.issuerProfile.create({ data });
    return toIssuer(row);
  }
}
