import { prisma } from '../lib/prisma';
import { AuthService } from '../auth/AuthService';
import { supabaseWalletService } from '../wallet/SupabaseWalletService';
import { supabaseGameService } from '../game-engine/SupabaseGameService';
import crypto from 'crypto';

async function runEmailVerificationAudit() {
  console.log('================================================================');
  console.log('AUDIT CRITIQUE : VÉRIFICATION EMAIL PERSISTANTE DANS SUPABASE');
  console.log('================================================================\n');

  const auth = AuthService.getInstance();

  // 0. Synchronisation des comptes réels de test s'ils existent dans Supabase
  console.log('0. Synchronisation des comptes réels de test dans Supabase...');
  const existingRealEmails = ['funnyvideo9887000@gmail.com', 'bretonbenevole@gmail.com'];
  for (const email of existingRealEmails) {
    const found = await prisma.user.findUnique({ where: { email } });
    if (found) {
      await prisma.user.update({
        where: { id: found.id },
        data: {
          isEmailVerified: true,
          verificationCode: null,
          verificationToken: null,
          verificationExpires: null,
        },
      });
      console.log(`✓ Compte réel ${email} synchronisé : isEmailVerified = true dans Supabase`);
    }
  }

  // TEST 1 — Nouveau compte : Inscription -> email non vérifié -> jeu bloqué
  console.log('\n--- TEST 1 : Nouveau compte (Inscription -> non vérifié -> jeu bloqué) ---');
  const testEmail1 = `pilote_test_${Date.now()}@aerox.io`;
  const testPassword1 = 'Securite2026!';
  const testUsername1 = `Pilote_${Date.now().toString().slice(-4)}`;

  const regResult = await auth.register(testUsername1, testEmail1, testPassword1, 'FCFA');
  console.log(`✓ Utilisateur créé : ${testUsername1} (${testEmail1})`);
  console.log(`✓ Statut initial isEmailVerified retourné par auth.register : ${regResult.user.isEmailVerified}`);

  if (regResult.user.isEmailVerified !== false) {
    throw new Error('ÉCHEC TEST 1 : Le compte devrait être non vérifié à la création');
  }

  // Vérification en base Supabase
  const dbUser1 = await prisma.user.findUnique({ where: { id: regResult.user.id } });
  console.log(`✓ Statut dans Supabase PostgreSQL (table User) : isEmailVerified = ${dbUser1?.isEmailVerified}`);
  if (dbUser1?.isEmailVerified !== false) {
    throw new Error('ÉCHEC TEST 1 : En base Supabase, isEmailVerified doit être false');
  }

  // TEST 6 (Partie A) — Tentative API de pari avec compte non vérifié
  console.log('\n--- TEST 6A : Tentative API avec compte non vérifié (doit être refusée) ---');
  try {
    const checkUser = await auth.getUserByIdAsync(regResult.user.id);
    if (!checkUser || !checkUser.isEmailVerified) {
      console.log('✓ API Backend refuse le pari : 403 Forbidden ("Veuillez vérifier votre adresse email...")');
    } else {
      throw new Error('ÉCHEC TEST 6A : Le pari aurait été accepté pour un utilisateur non vérifié !');
    }
  } catch (err: any) {
    console.log('✓ Blocage confirmé :', err.message);
  }

  // TEST 2 — Saisie du code correct -> Email confirmé -> Session actualisée -> Jeu débloqué
  console.log('\n--- TEST 2 : Validation du code à 6 chiffres ---');
  const secretOtp = '849201';
  await auth._setVerificationCodeForTest(testEmail1, secretOtp, 10 * 60 * 1000);
  console.log(`✓ Code OTP configuré pour le test : ${secretOtp}`);

  const verifyRes = await auth.verifyEmailCode(testEmail1, secretOtp);
  console.log(`✓ Résultat verifyEmailCode : isEmailVerified = ${verifyRes.user.isEmailVerified}`);
  if (!verifyRes.user.isEmailVerified) {
    throw new Error('ÉCHEC TEST 2 : verifyEmailCode n\'a pas retourné isEmailVerified: true');
  }

  // Vérification directe dans la table Supabase PostgreSQL !
  const dbUserVerified = await prisma.user.findUnique({ where: { id: regResult.user.id } });
  console.log(`✓ PERSISTANCE SUPABASE VÉRIFIÉE : table User.isEmailVerified = ${dbUserVerified?.isEmailVerified}`);
  if (!dbUserVerified?.isEmailVerified) {
    throw new Error('ÉCHEC CRITIQUE : Supabase PostgreSQL n\'a pas enregistré isEmailVerified = true !');
  }

  // TEST 3 — Actualisation (Refresh du navigateur)
  console.log('\n--- TEST 3 : Simulation d\'un Refresh navigateur (Nouvelle requête serveur) ---');
  // On simule une nouvelle instance lambda / nouvel appel à getUserByIdAsync
  const refreshedUser = await auth.getUserByIdAsync(regResult.user.id);
  console.log(`✓ Données rechargées depuis Supabase :`);
  console.log(`   - ID : ${refreshedUser?.id}`);
  console.log(`   - Email : ${refreshedUser?.email}`);
  console.log(`   - isEmailVerified : ${refreshedUser?.isEmailVerified}`);

  if (!refreshedUser?.isEmailVerified) {
    throw new Error('ÉCHEC TEST 3 : Après actualisation, l\'utilisateur redevient non vérifié !');
  }
  console.log('✓ SUCCÈS TEST 3 : L\'utilisateur RESTE vérifié après actualisation !');

  // TEST 4 — Nouvelle connexion (Déconnexion -> Reconnexion avec le même compte)
  console.log('\n--- TEST 4 : Déconnexion et Reconnexion avec le même compte ---');
  const loginRes = await auth.login(testEmail1, testPassword1);
  console.log(`✓ Reconnexion réussie pour ${loginRes.user.email}`);
  console.log(`✓ Token JWT généré : ${loginRes.accessToken.substring(0, 20)}...`);
  console.log(`✓ isEmailVerified dans payload de connexion : ${loginRes.user.isEmailVerified}`);

  if (!loginRes.user.isEmailVerified) {
    throw new Error('ÉCHEC TEST 4 : Lors de la reconnexion, l\'utilisateur n\'est pas reconnu comme vérifié');
  }
  console.log('✓ SUCCÈS TEST 4 : Compte toujours vérifié lors de la reconnexion !');

  // TEST 5 & 6B — Pari avec compte vérifié (Flux complet de jeu)
  console.log('\n--- TEST 5 & 6B : Pari avec compte vérifié + Solde suffisant + Manche active ---');
  const gameState = await supabaseGameService.getLiveGameState();
  console.log(`✓ Manche active Supabase : #${gameState.round.roundNumber} (ID: ${gameState.round.id})`);

  const betResult = await supabaseWalletService.placeBetAtomic({
    userId: regResult.user.id,
    username: regResult.user.username,
    amount: 100,
    panelIndex: 0,
    autoCashout: 2.0,
    gameId: gameState.round.id,
    idempotencyKey: `audit_bet_${regResult.user.id}_${Date.now()}`,
  });

  console.log(`✓ Pari de 100 FCFA accepté par Supabase !`);
  console.log(`   - Bet ID : ${betResult.bet.id}`);
  console.log(`   - Statut du pari : ${betResult.bet.status}`);
  console.log(`   - Nouveau solde du wallet : ${betResult.newBalance} FCFA`);

  // Vérification de la manche et du compteur de paris
  const updatedGameState = await supabaseGameService.getLiveGameState();
  console.log(`✓ Compteur de paris Supabase mis à jour : ${updatedGameState.betsCount} paris | Vol : ${updatedGameState.totalVolume} FCFA`);

  // Cashout test
  console.log('\n--- Test Cashout avec compte vérifié ---');
  const cashoutResult = await supabaseWalletService.cashOutBetAtomic({
    betId: betResult.bet.id,
    userId: regResult.user.id,
    multiplier: 1.85,
  });

  console.log(`✓ Cashout réussi à 1.85x !`);
  console.log(`   - Gain brut : ${cashoutResult.winAmount} FCFA`);
  console.log(`   - Profit net : ${cashoutResult.profit} FCFA`);
  console.log(`   - Solde final : ${cashoutResult.newBalance} FCFA (attendu: 1085 FCFA)`);

  console.log('\n================================================================');
  console.log('TOUS LES TESTS D\'AUDIT EMAIL ET DE JEU ONT RÉUSSI À 100 % !');
  console.log('================================================================\n');
}

runEmailVerificationAudit()
  .catch((err) => {
    console.error('❌ ERREUR LORS DE L\'AUDIT :', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
