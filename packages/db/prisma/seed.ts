/**
 * Seed de la base de données.
 * Crée un utilisateur ADMIN depuis les variables d'environnement ADMIN_EMAIL / ADMIN_PASSWORD.
 * Idempotent — utilise upsert pour ne pas dupliquer l'admin.
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

async function main(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL et ADMIN_PASSWORD doivent être définis dans .env');
  }

  const prisma = new PrismaClient();

  try {
    const passwordHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);

    const admin = await prisma.user.upsert({
      where: { email: adminEmail.toLowerCase() },
      update: { isActive: true, role: 'ADMIN' },
      create: {
        email: adminEmail.toLowerCase(),
        passwordHash,
        name: 'Admin',
        role: 'ADMIN',
        isActive: true,
      },
    });

    console.log(`Admin prêt : ${admin.email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error('Erreur de seed :', err);
  process.exit(1);
});
