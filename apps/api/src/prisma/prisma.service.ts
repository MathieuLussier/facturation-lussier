import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { prisma, type PrismaClient } from '@facturation/db';

/** Expose le client Prisma partagé et gère son cycle de vie dans NestJS. */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client: PrismaClient = prisma;

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
