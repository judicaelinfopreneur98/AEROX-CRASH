import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Initialisation des données de base AEROX CRASH...');

  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const demoPassword = await bcrypt.hash('Demo123!', 10);

  // 1. Compte Super Administrateur
  const admin = await prisma.user.upsert({
    where: { email: 'admin@aerox.io' },
    update: {},
    create: {
      username: 'AeroxAdmin',
      email: 'admin@aerox.io',
      passwordHash: adminPassword,
      role: 'SUPER_ADMIN',
      wallet: {
        create: {
          balance: 100000.0,
          currency: 'EUR',
        },
      },
      limits: {
        create: {
          dailyDepositLimit: 10000.0,
          maxBetLimit: 1000.0,
        },
      },
    },
  });

  // 2. Compte Joueur Démo
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@aerox.io' },
    update: {},
    create: {
      username: 'PiloteDemo',
      email: 'demo@aerox.io',
      passwordHash: demoPassword,
      role: 'USER',
      wallet: {
        create: {
          balance: 1500.0,
          currency: 'EUR',
        },
      },
      limits: {
        create: {
          dailyDepositLimit: 500.0,
          maxBetLimit: 100.0,
        },
      },
    },
  });

  console.log('✅ Comptes créés :');
  console.log(`   - Super Admin : admin@aerox.io / Admin123!`);
  console.log(`   - Joueur Démo : demo@aerox.io / Demo123!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
