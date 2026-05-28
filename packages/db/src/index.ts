import { PrismaClient } from '@prisma/client';

// Singleton PrismaClient : on évite d'ouvrir plusieurs pools de connexions,
// notamment en développement avec le rechargement à chaud.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export { PrismaClient };
export type { Prisma } from '@prisma/client';
