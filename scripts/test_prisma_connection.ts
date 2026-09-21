import { prisma } from '../lib/prisma';

async function main() {
  console.log('Testing lib/prisma.ts connection to Supabase...');
  try {
    const users = await prisma.user.findMany({
      take: 5,
      select: {
        id: true,
        email: true,
        username: true,
        wallet: {
          select: {
            balance: true,
            currency: true,
          },
        },
      },
    });

    console.log(`Found ${users.length} users in database:`);
    users.forEach((u) => {
      console.log(`- ${u.email} (${u.username}): Balance = ${u.wallet?.balance} ${u.wallet?.currency}`);
    });

    // Test a read of games
    const gamesCount = await prisma.game.count();
    console.log(`Total games in DB: ${gamesCount}`);

    // Test a read of bets
    const betsCount = await prisma.bet.count();
    console.log(`Total bets in DB: ${betsCount}`);

    console.log('Prisma connection test PASSED successfully!');
  } catch (error) {
    console.error('Prisma connection test FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
