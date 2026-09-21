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
    update: { isEmailVerified: true },
    create: {
      username: 'AeroxAdmin',
      email: 'admin@aerox.io',
      passwordHash: adminPassword,
      role: 'SUPER_ADMIN',
      currency: 'EUR',
      isEmailVerified: true,
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

  // 2. Compte Joueur Démo (EUR)
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@aerox.io' },
    update: { isEmailVerified: true },
    create: {
      username: 'PiloteDemo',
      email: 'demo@aerox.io',
      passwordHash: demoPassword,
      role: 'USER',
      currency: 'EUR',
      isEmailVerified: true,
      wallet: {
        create: {
          balance: 1000.0,
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

  // 3. Compte Joueur Démo (FCFA)
  const demoFcfa = await prisma.user.upsert({
    where: { email: 'demo_fcfa@aerox.io' },
    update: { isEmailVerified: true },
    create: {
      username: 'PiloteFCFA',
      email: 'demo_fcfa@aerox.io',
      passwordHash: demoPassword,
      role: 'USER',
      currency: 'FCFA',
      isEmailVerified: true,
      wallet: {
        create: {
          balance: 1000.0,
          currency: 'FCFA',
        },
      },
      limits: {
        create: {
          dailyDepositLimit: 50000.0,
          maxBetLimit: 5000.0,
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
