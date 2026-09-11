import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameEngine } from '../game-engine/GameEngine';
import { WalletEngine } from '../wallet/WalletEngine';

describe('Moteur de Jeu Autoritaire (GameEngine)', () => {
  let engine: GameEngine;
  let wallet: WalletEngine;
  const userId = 'usr_engine_test';

  beforeEach(() => {
    wallet = WalletEngine.getInstance();
    wallet.resetForTesting();
    wallet.getOrCreateWallet(userId, 1000.0);
    engine = GameEngine.getInstance();
    engine.resetForTesting();
  });

  afterEach(() => {
    engine.stop();
  });

  it('doit initialiser et exposer des informations publiques de manche sécurisées', () => {
    const info = engine.getPublicRoundInfo();
    expect(info).toBeDefined();
    expect(info.roundNumber).toBeGreaterThanOrEqual(1);
    expect(info.serverSeedHash).toBeDefined();
    if (info.status !== 'CRASHED' && info.status !== 'RESULT') {
      expect(info.serverSeed).toBeUndefined();
      expect(info.crashPoint).toBeUndefined();
    }
  });

  it('doit refuser les mises lorsque la manche n’est pas à l’état BETTING', async () => {
    if (engine.getStatus() !== 'BETTING') {
      const res = await engine.placeBet(userId, 'TestPilot', 50.0, 1);
      expect(res.success).toBe(false);
      expect(res.error).toContain('closes');
    }
  });

  it('doit refuser deux mises simultanées sur le même panneau (BET 1) lors d’une même manche', async () => {
    (engine as any).status = 'BETTING';

    const bet1 = await engine.placeBet(userId, 'TestPilot', 20.0, 1);
    expect(bet1.success).toBe(true);

    const bet2 = await engine.placeBet(userId, 'TestPilot', 20.0, 1);
    expect(bet2.success).toBe(false);
    expect(bet2.error).toContain('panneau BET 1');

    const betPanel2 = await engine.placeBet(userId, 'TestPilot', 30.0, 2);
    expect(betPanel2.success).toBe(true);
  });

  it('doit refuser un Cash-Out si la manche n’est pas à l’état RUNNING', async () => {
    (engine as any).status = 'WAITING';
    const res = await engine.cashOut(userId, 'bet_dummy_id');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Impossible d’encaisser');
  });

  it('doit exécuter un Cash-Out valide en cours de vol et créditer le portefeuille', async () => {
    (engine as any).status = 'BETTING';
    const placeRes = await engine.placeBet(userId, 'TestPilot', 100.0, 1);
    expect(placeRes.success).toBe(true);

    (engine as any).status = 'RUNNING';
    (engine as any).currentMultiplier = 2.00;

    const cashoutRes = await engine.cashOut(userId, placeRes.bet!.betId);
    expect(cashoutRes.success).toBe(true);
    expect(cashoutRes.multiplier).toBe(2.00);
    expect(cashoutRes.payout).toBe(200.0);

    const bal = await wallet.getBalance(userId);
    expect(bal.data?.balance).toBe(1100.0);
  });
});
