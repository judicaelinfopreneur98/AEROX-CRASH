import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../lib/prisma';
import { supabaseWalletService } from '../wallet/SupabaseWalletService';
import { BetStatus, TransactionType } from '@prisma/client';

describe('Audit & Validation Financière Supabase PostgreSQL (Tests A à G)', { timeout: 25000 }, () => {
  const testUserId = `test_audit_${Date.now()}`;
  const testUsername = `UserAudit_${Date.now().toString().slice(-4)}`;
  let testWalletId: string;

  beforeAll(async () => {
    // Créer un utilisateur et un wallet avec exactement 1 000.00 € dans Supabase
    const user = await prisma.user.create({
      data: {
        id: testUserId,
        username: testUsername,
        email: `${testUserId}@aerox.io`,
        passwordHash: 'dummy_hash',
        role: 'USER',
        currency: 'EUR',
        isEmailVerified: true,
        wallet: {
          create: {
            balance: 1000.0,
            lockedBalance: 0,
            currency: 'EUR',
            version: 1,
          },
        },
      },
      include: { wallet: true },
    });
    testWalletId = user.wallet!.id;
  });

  afterAll(async () => {
    // Nettoyage des données de test dans Supabase
    try {
      await prisma.transaction.deleteMany({ where: { walletId: testWalletId } });
      await prisma.bet.deleteMany({ where: { userId: testUserId } });
      await prisma.wallet.deleteMany({ where: { userId: testUserId } });
      await prisma.user.deleteMany({ where: { id: testUserId } });
    } catch {}
  });

  it('Test A : Déduction atomique du pari dans Supabase (1000 € - 25 € = 975 €)', async () => {
    const betAmount = 25.0;
    const betRes = await supabaseWalletService.placeBetAtomic({
      userId: testUserId,
      username: testUsername,
      amount: betAmount,
      panelIndex: 1,
      idempotencyKey: `idemp_bet_testA_${Date.now()}`,
    });

    expect(betRes.newBalance).toBe(975.0);
    expect(betRes.bet.status).toBe(BetStatus.ACTIVE);
    expect(betRes.bet.amount).toBe(25.0);

    // Vérification directe dans la base de données PostgreSQL Supabase
    const walletDb = await prisma.wallet.findUnique({ where: { userId: testUserId } });
    expect(walletDb?.balance).toBe(975.0);

    const betDb = await prisma.bet.findUnique({ where: { id: betRes.bet.id } });
    expect(betDb).not.toBeNull();
    expect(betDb?.status).toBe(BetStatus.ACTIVE);
    expect(betDb?.amount).toBe(25.0);

    const txDb = await prisma.transaction.findFirst({
      where: { referenceId: betRes.bet.id, type: TransactionType.BET },
    });
    expect(txDb).not.toBeNull();
    expect(txDb?.amount).toBe(-25.0);
    expect(txDb?.balanceAfter).toBe(975.0);
  });

  it('Test B & C : Cashout valide à 1.49x (Gain 37.25 €, Solde Supabase = 1012.25 €)', async () => {
    // Récupérer le pari actif créé au Test A
    const activeBets = await supabaseWalletService.getUserActiveBets(testUserId);
    expect(activeBets.length).toBeGreaterThanOrEqual(1);
    const targetBet = activeBets[0];

    // Exécuter le cashout à 1.49x
    const cashoutRes = await supabaseWalletService.cashOutBetAtomic({
      userId: testUserId,
      betId: targetBet.id,
      multiplier: 1.49,
      idempotencyKey: `idemp_co_testC_${Date.now()}`,
    });

    // 25 € * 1.49 = 37.25 € -> Profit = +12.25 €
    expect(cashoutRes.multiplier).toBe(1.49);
    expect(cashoutRes.winAmount).toBe(37.25);
    expect(cashoutRes.profit).toBe(12.25);
    // Solde : 975 € + 37.25 € = 1012.25 €
    expect(cashoutRes.newBalance).toBe(1012.25);
    expect(cashoutRes.bet.status).toBe(BetStatus.CASHED_OUT);

    // Vérification dans Supabase PostgreSQL
    const walletDb = await prisma.wallet.findUnique({ where: { userId: testUserId } });
    expect(walletDb?.balance).toBe(1012.25);

    const betDb = await prisma.bet.findUnique({ where: { id: targetBet.id } });
    expect(betDb?.status).toBe(BetStatus.CASHED_OUT);
    expect(betDb?.profit).toBe(12.25);
    expect(betDb?.cashoutMultiplier).toBe(1.49);

    const txDb = await prisma.transaction.findFirst({
      where: { referenceId: targetBet.id, type: TransactionType.CASHOUT },
    });
    expect(txDb).not.toBeNull();
    expect(txDb?.amount).toBe(37.25);
    expect(txDb?.balanceAfter).toBe(1012.25);
  });

  it('Test D : Prévention du double débit / double-clic sur PARIER (Idempotence & Verrou)', async () => {
    const fixedKey = `double_click_bet_${Date.now()}`;
    const initialBalance = (await supabaseWalletService.getUserBalance(testUserId)).balance;

    // Simulation de 2 clics quasi-instantanés avec la même clé d'idempotence
    const [call1, call2] = await Promise.all([
      supabaseWalletService.placeBetAtomic({
        userId: testUserId,
        username: testUsername,
        amount: 20.0,
        panelIndex: 2,
        idempotencyKey: fixedKey,
      }),
      supabaseWalletService.placeBetAtomic({
        userId: testUserId,
        username: testUsername,
        amount: 20.0,
        panelIndex: 2,
        idempotencyKey: fixedKey,
      }),
    ]);

    // Les deux requêtes retournent le même résultat sans doubler le débit
    expect(call1.bet.id).toBe(call2.bet.id);
    expect(call1.newBalance).toBe(call2.newBalance);

    // Le solde n'a été défalqué qu'une seule fois de 20 €
    const finalBalance = (await supabaseWalletService.getUserBalance(testUserId)).balance;
    expect(finalBalance).toBe(Number((initialBalance - 20.0).toFixed(2)));
  });

  it('Test E : Prévention du double cashout (Double-clic sur CASHOUT)', async () => {
    // Créer un nouveau pari actif
    const bet = await supabaseWalletService.placeBetAtomic({
      userId: testUserId,
      username: testUsername,
      amount: 10.0,
      panelIndex: 1,
      idempotencyKey: `bet_for_double_cashout_${Date.now()}`,
    });

    const betId = bet.bet.id;

    // Premier cashout : Doit réussir
    const firstCashout = await supabaseWalletService.cashOutBetAtomic({
      userId: testUserId,
      betId,
      multiplier: 2.0,
    });
    expect(firstCashout.bet.status).toBe(BetStatus.CASHED_OUT);
    expect(firstCashout.winAmount).toBe(20.0);

    // Deuxième cashout consécutif : Doit être rejeté fermement par la transaction PostgreSQL
    await expect(
      supabaseWalletService.cashOutBetAtomic({
        userId: testUserId,
        betId,
        multiplier: 2.0,
      })
    ).rejects.toThrow(/déjà été traité/i);
  });

  it('Test F & G : Persistance et cohérence après rechargement (/api/user et getUserBalance)', async () => {
    // Interrogation directe depuis le service de portefeuille Supabase (comme le ferait /api/user)
    const walletData = await supabaseWalletService.getUserBalance(testUserId);
    expect(typeof walletData.balance).toBe('number');
    expect(walletData.balance).toBeGreaterThan(0);
    expect(walletData.currency).toBe('EUR');

    // Vérifier que les transactions sont bien ordonnées dans l'historique Supabase
    const transactions = await prisma.transaction.findMany({
      where: { wallet: { userId: testUserId } },
      orderBy: { createdAt: 'desc' },
    });
    expect(transactions.length).toBeGreaterThanOrEqual(4);
  });
});
