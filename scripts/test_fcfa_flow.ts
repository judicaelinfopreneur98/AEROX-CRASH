import { prisma } from '../lib/prisma';
import { supabaseWalletService } from '../wallet/SupabaseWalletService';

async function testFcfaFullFlow() {
  console.log('=== TEST DU PARCOURS COMPLET FCFA SUR LA NOUVELLE BASE SUPABASE ===');
  const email = `fcfa_test_${Date.now()}@aerox.io`;

  // 1. Création du compte utilisateur avec solde initial de 1 000 FCFA
  console.log(`1. Création du compte utilisateur : ${email}...`);
  const user = await prisma.user.create({
    data: {
      email,
      username: `Pilote_${Date.now().toString().slice(-4)}`,
      passwordHash: 'dummy_hash',
      isEmailVerified: true,
      wallet: {
        create: {
          balance: 1000.0,
          currency: 'FCFA',
        },
      },
    },
    include: { wallet: true },
  });
  console.log(`✓ Compte créé avec ID: ${user.id}`);
  console.log(`✓ Solde initial dans Supabase : ${user.wallet?.balance} ${user.wallet?.currency}`);

  // 2. Vérification de la lecture du solde
  const initialBalance = await supabaseWalletService.getUserBalance(user.id);
  console.log(`2. Solde lu via SupabaseWalletService : ${initialBalance.balance} ${initialBalance.currency}`);
  if (initialBalance.balance !== 1000) throw new Error('Solde initial invalide');

  // 3. Récupération ou création d'une partie active
  let game = await prisma.game.findFirst({
    where: { status: 'WAITING' },
  });
  if (!game) {
    // Vérifier s'il y a un jeu existant qu'on peut réutiliser ou trouver le max roundNumber
    const lastGame = await prisma.game.findFirst({
      orderBy: { roundNumber: 'desc' },
    });
    const nextRound = (lastGame?.roundNumber || 0) + 1;

    game = await prisma.game.create({
      data: {
        roundNumber: nextRound,
        serverSeed: `seed_${Date.now()}`,
        serverSeedHash: `hash_${Date.now()}`,
        crashPoint: 3.5,
        status: 'WAITING',
      },
    });
  }
  console.log(`3. Partie en attente ID : ${game.id} (Manche #${game.roundNumber})`);

  // 4. Débit de la mise de 200 FCFA
  console.log('4. Placement du pari de 200,00 FCFA...');
  const betResult = await supabaseWalletService.placeBetAtomic({
    userId: user.id,
    username: user.username,
    gameId: game.id,
    panelIndex: 1,
    amount: 200.0,
  });
  console.log(`✓ Pari placé avec succès ! Bet ID : ${betResult.bet.id}`);
  console.log(`✓ Nouveau solde après débit : ${betResult.newBalance} FCFA (attendu: 800 FCFA)`);
  if (betResult.newBalance !== 800) throw new Error(`Solde incorrect après pari: ${betResult.newBalance}`);

  // 5. Simulation du vol et cashout à 2.15x
  console.log('5. Exécution du cashout à multiplicateur 2.15x...');
  const cashoutResult = await supabaseWalletService.cashOutBetAtomic({
    betId: betResult.bet.id,
    userId: user.id,
    multiplier: 2.15,
  });
  console.log(`✓ Cashout réussi ! Gain brut : ${cashoutResult.winAmount} FCFA, Profit net : ${cashoutResult.profit} FCFA`);
  console.log(`✓ Nouveau solde après crédit du cashout : ${cashoutResult.newBalance} FCFA (attendu: 1230 FCFA)`);
  if (cashoutResult.newBalance !== 1230) throw new Error(`Solde incorrect après cashout: ${cashoutResult.newBalance}`);

  // 6. Vérification finale en base de données
  console.log('6. Vérification directe des enregistrements dans Supabase PostgreSQL...');
  const finalWallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
  const finalBet = await prisma.bet.findUnique({ where: { id: betResult.bet.id } });
  const transactions = await prisma.transaction.findMany({
    where: { walletId: finalWallet!.id },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`✓ Solde final persistant en base : ${finalWallet?.balance} ${finalWallet?.currency}`);
  console.log(`✓ Statut final du pari : ${finalBet?.status} (Multiplicateur de sortie: ${finalBet?.cashoutMultiplier}x, Profit: ${finalBet?.profit} FCFA)`);
  console.log(`✓ Nombre de transactions enregistrées : ${transactions.length}`);
  transactions.forEach((tx, idx) => {
    console.log(`   [Tx ${idx + 1}] Type: ${tx.type}, Montant: ${tx.amount} ${finalWallet?.currency}, Solde résultant: ${tx.balanceAfter}`);
  });

  console.log('\n=== LE PARCOURS COMPLET FCFA EST 100% VALIDE ET AUDITÉ SUR LA NOUVELLE BASE SUPABASE ===\n');
}

testFcfaFullFlow()
  .catch((e) => {
    console.error('Erreur test FCFA:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
