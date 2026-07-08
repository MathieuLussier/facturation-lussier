import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
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
    logoPath: row.logoPath,
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
    // Upsert ATOMIQUE sur le verrou de singleton (slot=1) : deux requêtes
    // concurrentes ne peuvent plus créer deux en-têtes distincts.
    const row = await this.prisma.client.issuerProfile.upsert({
      where: { slot: 1 },
      create: { ...data, slot: 1 },
      update: data,
    });
    return toIssuer(row);
  }

  /**
   * Enregistre le chemin du logo téléversé sur le profil émetteur (singleton).
   * Supprime l'ancien fichier au passage. Le profil doit déjà exister.
   */
  async updateLogo(logoPath: string): Promise<IssuerProfile> {
    const existing = await this.prisma.client.issuerProfile.findFirst();
    if (!existing) {
      throw new NotFoundException(
        "Profil émetteur non configuré. Enregistrez d'abord les coordonnées de l'entreprise.",
      );
    }
    if (existing.logoPath && existing.logoPath !== logoPath) {
      try {
        fs.unlinkSync(path.resolve(existing.logoPath));
      } catch {
        /* ancien logo déjà absent : on ignore */
      }
    }
    const row = await this.prisma.client.issuerProfile.update({
      where: { id: existing.id },
      data: { logoPath },
    });
    return toIssuer(row);
  }
}
