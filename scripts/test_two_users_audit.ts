import { prisma } from '../lib/prisma';
import { supabaseWalletService } from '../wallet/SupabaseWalletService';
import { supabaseGameService } from '../game-engine/SupabaseGameService';

async function runTwoUsersAudit() {
  console.log('================================================================');
  console.log('AUDIT MULTI-UTILISATEURS & VALIDATION FLUX COMPLET SUPABASE');
  console.log('================================================================\n');

  const ts = Date.now();
  const emailA = `user_a_${ts}@aerox.io`;
  const emailB = `user_b_${ts}@aerox.io`;

  // 1. Création Utilisateur A (1 000 FCFA) et Utilisateur B (2 000 FCFA)
  console.log('1. Création des deux utilisateurs de test dans Supabase...');
  const userA = await prisma.user.create({
    data: {
      email: emailA,
      username: `PiloteA_${ts.toString().slice(-4)}`,
      passwordHash: 'dummy_hash_a',
      currency: 'FCFA',
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

  const userB = await prisma.user.create({
    data: {
      email: emailB,
      username: `PiloteB_${ts.toString().slice(-4)}`,
      passwordHash: 'dummy_hash_b',
      currency: 'FCFA',
      isEmailVerified: true,
      wallet: {
        create: {
          balance: 2000.0,
          currency: 'FCFA',
        },
      },
    },
    include: { wallet: true },
  });

  console.log(`✓ Utilisateur A créé : ${userA.username} (ID: ${userA.id}), Solde initial = ${userA.wallet?.balance} FCFA`);
  console.log(`✓ Utilisateur B créé : ${userB.username} (ID: ${userB.id}), Solde initial = ${userB.wallet?.balance} FCFA\n`);

  // 2. Synchronisation de la manche active dans Supabase
  console.log('2. Récupération ou initialisation de la manche active dans Supabase...');
  const gameStateInitial = await supabaseGameService.getLiveGameState();
  const currentRound = gameStateInitial.round;
  console.log(`✓ Manche active : #${currentRound.roundNumber} (ID: ${currentRound.id}), Statut: ${currentRound.status}`);

  // 3. Utilisateur A mise 100 FCFA
  console.log('\n3. Utilisateur A clique sur : PARIER (100,00 FCFA)...');
  const betA = await supabaseWalletService.placeBetAtomic({
    userId: userA.id,
    username: userA.username,
    amount: 100.0,
    panelIndex: 1,
  });
  console.log(`✓ Pari A inséré dans Supabase ! ID: ${betA.bet.id}`);
  console.log(`✓ Solde Utilisateur A après débit : ${betA.newBalance} FCFA (attendu: 900 FCFA)`);
  if (betA.newBalance !== 900) throw new Error(`Solde A incorrect: ${betA.newBalance}`);

  // 4. Utilisateur B mise 200 FCFA sur la même manche
  console.log('\n4. Utilisateur B clique sur : PARIER (200,00 FCFA)...');
  const betB = await supabaseWalletService.placeBetAtomic({
    userId: userB.id,
    username: userB.username,
    amount: 200.0,
    panelIndex: 1,
    gameId: betA.bet.gameId,
  });
  console.log(`✓ Pari B inséré dans Supabase ! ID: ${betB.bet.id}`);
  console.log(`✓ Solde Utilisateur B après débit : ${betB.newBalance} FCFA (attendu: 1800 FCFA)`);
  if (betB.newBalance !== 1800) throw new Error(`Solde B incorrect: ${betB.newBalance}`);

  // 5. Interrogation du compteur réel de paris et volume depuis Supabase
  console.log('\n5. Vérification du calcul réel des paris dans Supabase pour la manche...');
  const roundBets = await prisma.bet.findMany({
    where: { gameId: betA.bet.gameId },
    include: { user: { select: { username: true } } },
  });
  const betsCount = roundBets.length;
  const totalVolume = Number(roundBets.reduce((acc, b) => acc + b.amount, 0).toFixed(2));
  console.log(`✓ Nombre de paris comptés : ${betsCount} (attendu : 2)`);
  console.log(`✓ Volume total calculé : ${totalVolume} FCFA (attendu : 300 FCFA)`);

  if (betsCount < 2) {
    throw new Error(`Échec : Le compteur indique ${betsCount} au lieu de 2 !`);
  }
  if (totalVolume < 300) {
    throw new Error(`Échec : Le volume indique ${totalVolume} au lieu de 300 FCFA !`);
  }
  console.log('✓ LE COMPTEUR AFFICHE BIEN : 2 paris | Vol : 300 FCFA (issu à 100% de Supabase)');

  // 6. Test CASHOUT pour Utilisateur A à 1.50x
  console.log('\n6. Test CASHOUT pour Utilisateur A à 1.50x (Gain attendu : 150 FCFA, Profit net : 50 FCFA)...');
  const cashoutA = await supabaseWalletService.cashOutBetAtomic({
    userId: userA.id,
    betId: betA.bet.id,
    multiplier: 1.50,
  });
  console.log(`✓ Cashout A réussi ! Payout brut = ${cashoutA.winAmount} FCFA, Profit = ${cashoutA.profit} FCFA`);
  console.log(`✓ Nouveau solde Utilisateur A : ${cashoutA.newBalance} FCFA (attendu: 1050 FCFA)`);
  if (cashoutA.newBalance !== 1050) throw new Error(`Solde A incorrect après cashout: ${cashoutA.newBalance}`);

  // 7. Vérification de la persistance en base
  console.log('\n7. Vérification de l\'état des paris dans la table Supabase...');
  const dbBetA = await prisma.bet.findUnique({ where: { id: betA.bet.id } });
  const dbBetB = await prisma.bet.findUnique({ where: { id: betB.bet.id } });
  console.log(`✓ Pari A en base : Statut = ${dbBetA?.status}, CashoutMultiplier = ${dbBetA?.cashoutMultiplier}x, Profit = ${dbBetA?.profit} FCFA`);
  console.log(`✓ Pari B en base : Statut = ${dbBetB?.status}, Amount = ${dbBetB?.amount} FCFA`);

  if (dbBetA?.status !== 'CASHED_OUT') throw new Error(`Statut pari A incorrect: ${dbBetA?.status}`);
  if (dbBetB?.status !== 'ACTIVE') throw new Error(`Statut pari B incorrect: ${dbBetB?.status}`);

  console.log('\n================================================================');
  console.log('✓ TEST MULTI-UTILISATEURS ET CASHOUT 100% SUCCÈS SUR SUPABASE');
  console.log('================================================================\n');
}

runTwoUsersAudit()
  .catch((err) => {
    console.error('Erreur audit:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
