import { describe, it, expect, beforeEach } from 'vitest';
import { WalletEngine } from '../wallet/WalletEngine';

describe('Tests de Concurrence Élevée & Protection Anti-Race Condition', () => {
  let wallet: WalletEngine;
  const userId = 'usr_race_condition_test';

  beforeEach(() => {
    wallet = WalletEngine.getInstance();
    wallet.resetForTesting();
    wallet.getOrCreateWallet(userId, 1000.0);
  });

  it('doit neutraliser deux Cash-Outs strictement simultanés sur le même pari (Promise.all)', async () => {
    const betId = 'bet_concurrent_race_01';
    await wallet.reserveBet(userId, betId, 'rnd_race', 100.0);
    // Solde restant : 900.00 €

    // Déclenchement simultané de 2 requêtes concurrentes de cash-out
    const [resultA, resultB] = await Promise.all([
      wallet.creditCashOut(userId, betId, 2.00),
      wallet.creditCashOut(userId, betId, 2.00),
    ]);

    // Exactement UN des deux doit réussir, et l'autre DOIT échouer
    const successes = [resultA, resultB].filter((r) => r.success);
    const failures = [resultA, resultB].filter((r) => !r.success);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);

    expect(failures[0].code).toBe('ALREADY_CASHED_OUT');

    // Le gain (100 * 2.00 = 200 €) doit avoir été crédité UNE SEULE FOIS : 900 + 200 = 1100 €
    const finalBal = await wallet.getBalance(userId);
    expect(finalBal.data?.balance).toBe(1100.0);
  });

  it('doit résister à 10 tentatives concurrentes de Cash-Out simultanées', async () => {
    const betId = 'bet_burst_test';
    await wallet.reserveBet(userId, betId, 'rnd_race', 50.0);

    // 10 requêtes de cashout en parallèle
    const promises = Array.from({ length: 10 }, () =>
      wallet.creditCashOut(userId, betId, 3.00)
    );

    const results = await Promise.all(promises);
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    expect(successCount).toBe(1);
    expect(failureCount).toBe(9);
  });

  it('doit empêcher formellement tout solde négatif lors de 10 mises concurrentes dépassant le solde total', async () => {
    // Solde disponible : 1000.00 €
    // Nous lançons 15 mises simultanées de 100 € chacune (total 1500 € > 1000 €)
    const promises = Array.from({ length: 15 }, (_, idx) =>
      wallet.reserveBet(userId, `bet_parallel_${idx}`, 'rnd_race', 100.0)
    );

    const results = await Promise.all(promises);
    const successBets = results.filter((r) => r.success);
    const rejectedBets = results.filter((r) => !r.success);

    // Exactement 10 mises acceptées (1000 € / 100 €), 5 refusées
    expect(successBets).toHaveLength(10);
    expect(rejectedBets).toHaveLength(5);

    // Le solde final doit être exactement 0.00 €, jamais en dessous !
    const finalBal = await wallet.getBalance(userId);
    expect(finalBal.data?.balance).toBe(0.0);
    expect(finalBal.data?.balance).toBeGreaterThanOrEqual(0);
  });
});
