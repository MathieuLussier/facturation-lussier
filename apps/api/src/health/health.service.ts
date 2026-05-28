import { Injectable } from '@nestjs/common';
import { createHealth, type Health } from '@facturation/core';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  /** Vérifie la connectivité de la base via une requête triviale. */
  async check(): Promise<Health> {
    try {
      await this.prisma.client.$queryRaw`SELECT 1`;
      return createHealth(true);
    } catch {
      return createHealth(false);
    }
  }
}
