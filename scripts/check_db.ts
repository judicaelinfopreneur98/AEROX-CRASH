import { prisma } from '../lib/prisma';

async function main() {
  const bets = await prisma.bet.findMany();
  const txs = await prisma.transaction.findMany();
  const games = await prisma.game.findMany();
  console.log('BETS COUNT IN DB:', bets.length);
  console.log('TXS COUNT IN DB:', txs.length);
  console.log('GAMES COUNT IN DB:', games.length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
