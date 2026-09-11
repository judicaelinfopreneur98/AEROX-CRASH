import { describe, it, expect, beforeEach } from 'vitest';
import { WalletEngine } from '../wallet/WalletEngine';

describe('Moteur de Portefeuille Transactionnel (WalletEngine)', () => {
  let wallet: WalletEngine;
  const testUserId = 'usr_test_wallet_101';

  beforeEach(() => {
    wallet = WalletEngine.getInstance();
    wallet.resetForTesting();
    wallet.getOrCreateWallet(testUserId, 500.0);
  });

  it('doit initialiser le solde à 500.00 €', async () => {
    const bal = await wallet.getBalance(testUserId);
    expect(bal.data?.balance).toBe(500.0);
  });

  it('doit créditer un dépôt et enregistrer la transaction', async () => {
    const res = await wallet.deposit(testUserId, 150.0, 'dep_key_01');
    expect(res.success).toBe(true);
    expect(res.data?.balance).toBe(650.0);

    const bal = await wallet.getBalance(testUserId);
    expect(bal.data?.balance).toBe(650.0);
  });

  it('doit garantir l’idempotence d’un dépôt : aucun double crédit en cas de rejeu réseau', async () => {
    const key = 'dep_idempotent_duplicate_check';
    const res1 = await wallet.deposit(testUserId, 100.0, key);
    const res2 = await wallet.deposit(testUserId, 100.0, key);

    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);

    // Le solde doit avoir augmenté de 100 €, PAS de 200 € !
    const bal = await wallet.getBalance(testUserId);
    expect(bal.data?.balance).toBe(600.0);
  });

  it('doit débiter une mise et refuser les mises si le solde est insuffisant', async () => {
    // Mise valide
    const betRes = await wallet.reserveBet(testUserId, 'bet_01', 'rnd_01', 100.0);
    expect(betRes.success).toBe(true);
    expect(betRes.data?.balance).toBe(400.0);

    // Tentative de mise supérieure au solde restant (400 €)
    const invalidBet = await wallet.reserveBet(testUserId, 'bet_02', 'rnd_01', 450.0);
    expect(invalidBet.success).toBe(false);
    expect(invalidBet.code).toBe('INSUFFICIENT_FUNDS');

    // Le solde doit être resté strictement à 400 € (aucun solde négatif)
    const finalBal = await wallet.getBalance(testUserId);
    expect(finalBal.data?.balance).toBe(400.0);
  });

  it('doit exécuter un Cash-Out atomique et créditer le gain (mise × multiplicateur)', async () => {
    await wallet.reserveBet(testUserId, 'bet_win_01', 'rnd_01', 50.0);
    // Solde après mise = 450 €

    // Cash out à 3.00x -> Payout = 150.00 €, Profit = 100.00 €
    const cashoutRes = await wallet.creditCashOut(testUserId, 'bet_win_01', 3.00);
    expect(cashoutRes.success).toBe(true);
    expect(cashoutRes.data?.payout).toBe(150.0);
    expect(cashoutRes.data?.profit).toBe(100.0);
    expect(cashoutRes.data?.balance).toBe(600.0); // 450 + 150
  });

  it('doit formellement interdire un deuxième Cash-Out sur le même pari (Anti-Double Dépense)', async () => {
    await wallet.reserveBet(testUserId, 'bet_double_co', 'rnd_01', 50.0);

    // Premier cash-out
    const firstCo = await wallet.creditCashOut(testUserId, 'bet_double_co', 2.00);
    expect(firstCo.success).toBe(true);

    // Deuxième tentative de cash-out sur le même pari
    const secondCo = await wallet.creditCashOut(testUserId, 'bet_double_co', 2.50);
    expect(secondCo.success).toBe(false);
    expect(secondCo.code).toBe('ALREADY_CASHED_OUT');
  });

  it('doit débiter un retrait valide et refuser les retraits excessifs', async () => {
    const wthRes = await wallet.withdraw(testUserId, 200.0, 'FR7630006000011234567890189', 'wth_01');
    expect(wthRes.success).toBe(true);
    expect(wthRes.data?.balance).toBe(300.0);

    const excessWth = await wallet.withdraw(testUserId, 500.0, 'FR7630006000011234567890189', 'wth_02');
    expect(excessWth.success).toBe(false);
    expect(excessWth.code).toBe('INSUFFICIENT_FUNDS');
  });
});
