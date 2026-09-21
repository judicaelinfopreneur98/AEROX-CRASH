import { EventEmitter } from 'events';
import {
  generateServerSeed,
  hashServerSeed,
  calculateCrashPoint,
  calculateCrashPointDetailed,
} from '../lib/provably-fair';
import { WalletEngine } from '../wallet/WalletEngine';
import { MultiplierEngine } from './MultiplierEngine';
import { GameRoundInfo, GameState, ActivePlayerBet } from './types';

export interface RoundHistoryEntry {
  id: string;
  roundNumber: number;
  crashPoint: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  createdAt: Date;
}

export class GameEngine extends EventEmitter {
  private static instance: GameEngine;
  private wallet = WalletEngine.getInstance();

  private status: GameState = 'WAITING';
  private roundNumber = 1;
  private currentRoundId: string = '';
  private serverSeed: string = '';
  private serverSeedHash: string = '';
  private clientSeed: string = 'aerox-quantum-seed-v1';
  private nonce: number = 0;
  private crashPoint: number = 1.00;
  private currentMultiplier: number = 1.00;

  // Radar Prédictif Spribe Aviator (Scellé d'avance pour le Tour N+1)
  private nextServerSeed: string = '';
  private nextServerSeedHash: string = '';
  private nextCrashPoint: number = 1.00;
  private predictionHistory: Array<{
    roundNumber: number;
    predictedCrashPoint: number;
    actualCrashPoint: number;
    matched: boolean;
    timestamp: Date;
  }> = [];

  private bettingTimeLeft: number = 5.0; // secondes
  private startTime: number = 0;
  private timer: NodeJS.Timeout | null = null;
  private tickInterval: NodeJS.Timeout | null = null;

  private activeBets: Map<string, ActivePlayerBet> = new Map();
  private recentRounds: RoundHistoryEntry[] = [];

  // Configuration temporelle (en millisecondes)
  private readonly WAITING_DURATION_MS = 2000;
  private readonly BETTING_DURATION_MS = 5000;
  private readonly RESULT_DURATION_MS = 2500;
  private readonly TICK_RATE_MS = 50; // 20 ticks/sec

  private isRunningLoop = false;

  private constructor() {
    super();
    this.seedInitialHistory();
  }

  public static getInstance(): GameEngine {
    const g = globalThis as any;
    if (!g.__aerox_game_engine__) {
      g.__aerox_game_engine__ = GameEngine.instance || new GameEngine();
      GameEngine.instance = g.__aerox_game_engine__;
      g.__aerox_game_engine__.ensureStarted();
    }
    return g.__aerox_game_engine__;
  }

  public ensureStarted() {
    if (!this.isRunningLoop) {
      this.start();
    }
    if (!this.currentRoundId) {
      this.transitionToWaiting();
    }
  }

  private seedInitialHistory() {
    for (let i = 1; i <= 15; i++) {
      const sSeed = generateServerSeed();
      const sHash = hashServerSeed(sSeed);
      const cp = calculateCrashPoint(sSeed, this.clientSeed, i);
      this.recentRounds.push({
        id: `rnd_init_${i}`,
        roundNumber: i,
        crashPoint: cp,
        serverSeed: sSeed,
        serverSeedHash: sHash,
        clientSeed: this.clientSeed,
        nonce: i,
        createdAt: new Date(Date.now() - (16 - i) * 20000),
      });
    }
    this.roundNumber = 16;
  }

  public start() {
    if (this.isRunningLoop) return;
    this.isRunningLoop = true;
    this.transitionToWaiting();
  }

  public stop() {
    this.isRunningLoop = false;
    if (this.timer) clearTimeout(this.timer);
    if (this.tickInterval) clearInterval(this.tickInterval);
  }

  public resetForTesting() {
    this.stop();
    this.activeBets.clear();
    this.status = 'WAITING';
    this.currentMultiplier = 1.00;
    this.currentRoundId = `rnd_test_${Date.now()}`;
  }

  // ==========================================
  // MACHINE À ÉTATS DU CYCLE DE JEU
  // ==========================================

  private transitionToWaiting() {
    this.status = 'WAITING';
    this.currentMultiplier = 1.00;
    this.activeBets.clear();

    this.currentRoundId = `rnd_${Date.now()}_${this.roundNumber}`;
    this.nonce += 1;

    // Utilisation de la graine déjà scellée et prédite si existante, sinon nouvelle génération
    if (this.nextServerSeed) {
      this.serverSeed = this.nextServerSeed;
      this.serverSeedHash = this.nextServerSeedHash;
      this.crashPoint = this.nextCrashPoint;
    } else {
      this.serverSeed = generateServerSeed();
      this.serverSeedHash = hashServerSeed(this.serverSeed);
      this.crashPoint = calculateCrashPoint(this.serverSeed, this.clientSeed, this.nonce);
    }

    // Pré-génération déterministe immédiate de la manche suivante (N+1) pour le Radar Prédictif Aviator
    this.nextServerSeed = generateServerSeed();
    this.nextServerSeedHash = hashServerSeed(this.nextServerSeed);
    this.nextCrashPoint = calculateCrashPoint(this.nextServerSeed, this.clientSeed, this.nonce + 1);

    this.emit('game.created', this.getPublicRoundInfo());

    this.timer = setTimeout(() => {
      if (this.isRunningLoop) this.transitionToBetting();
    }, this.WAITING_DURATION_MS);
  }

  private transitionToBetting() {
    this.status = 'BETTING';
    this.bettingTimeLeft = this.BETTING_DURATION_MS / 1000;

    const startCountdown = Date.now();
    const interval = 100;

    const countdownTimer = setInterval(() => {
      const elapsed = Date.now() - startCountdown;
      this.bettingTimeLeft = Math.max(0, Number(((this.BETTING_DURATION_MS - elapsed) / 1000).toFixed(1)));

      this.emit('game.betting', {
        timeLeft: this.bettingTimeLeft,
        roundNumber: this.roundNumber,
        serverSeedHash: this.serverSeedHash,
      });

      if (elapsed >= this.BETTING_DURATION_MS) {
        clearInterval(countdownTimer);
        if (this.isRunningLoop) this.transitionToRunning();
      }
    }, interval);
  }

  private transitionToRunning() {
    this.status = 'RUNNING';
    this.startTime = Date.now();
    this.currentMultiplier = 1.00;

    this.emit('game.started', {
      roundNumber: this.roundNumber,
      serverSeedHash: this.serverSeedHash,
      startedAt: this.startTime,
    });

    this.tickInterval = setInterval(() => {
      const elapsedSeconds = (Date.now() - this.startTime) / 1000;
      this.currentMultiplier = MultiplierEngine.calculateMultiplier(elapsedSeconds);

      this.checkAutoCashouts(this.currentMultiplier);

      this.emit('game.multiplier', {
        multiplier: this.currentMultiplier,
        elapsedSeconds: Number(elapsedSeconds.toFixed(2)),
      });

      if (this.currentMultiplier >= this.crashPoint) {
        clearInterval(this.tickInterval!);
        this.transitionToCrashed();
      }
    }, this.TICK_RATE_MS);
  }

  private transitionToCrashed() {
    this.status = 'CRASHED';
    this.currentMultiplier = this.crashPoint;

    const crashedInfo = {
      roundNumber: this.roundNumber,
      crashPoint: this.crashPoint,
      serverSeed: this.serverSeed,
      serverSeedHash: this.serverSeedHash,
      clientSeed: this.clientSeed,
      nonce: this.nonce,
    };

    this.wallet.markBetsAsLost(this.currentRoundId);
    for (const bet of this.activeBets.values()) {
      if (bet.status === 'ACTIVE') {
        bet.status = 'LOST';
        bet.profit = -bet.amount;
      }
    }

    this.recentRounds.unshift({
      id: this.currentRoundId,
      roundNumber: this.roundNumber,
      crashPoint: this.crashPoint,
      serverSeed: this.serverSeed,
      serverSeedHash: this.serverSeedHash,
      clientSeed: this.clientSeed,
      nonce: this.nonce,
      createdAt: new Date(),
    });
    if (this.recentRounds.length > 50) this.recentRounds.pop();

    // Enregistrement de la concordance prédictive prouvée dans le radar
    this.predictionHistory.unshift({
      roundNumber: this.roundNumber,
      predictedCrashPoint: this.crashPoint,
      actualCrashPoint: this.crashPoint,
      matched: true,
      timestamp: new Date(),
    });
    if (this.predictionHistory.length > 25) this.predictionHistory.pop();

    this.emit('game.crashed', crashedInfo);

    this.timer = setTimeout(() => {
      if (this.isRunningLoop) this.transitionToResult();
    }, 1500);
  }

  private transitionToResult() {
    this.status = 'RESULT';
    this.emit('game.result', {
      roundNumber: this.roundNumber,
      crashPoint: this.crashPoint,
      bets: Array.from(this.activeBets.values()),
    });

    this.timer = setTimeout(() => {
      this.roundNumber += 1;
      if (this.isRunningLoop) this.transitionToWaiting();
    }, this.RESULT_DURATION_MS);
  }

  // ==========================================
  // GESTION DES PARIS ET CASHOUTS
  // ==========================================

  public async placeBet(
    userId: string,
    username: string,
    amount: number,
    panelIndex: number = 1,
    autoCashout?: number | null
  ): Promise<{ success: boolean; bet?: ActivePlayerBet; error?: string }> {
    if (this.status !== 'BETTING') {
      return {
        success: false,
        error: 'Les mises sont closes pour cette manche. Attendez la prochaine session de paris.',
      };
    }

    for (const bet of this.activeBets.values()) {
      if (bet.userId === userId && bet.panelIndex === panelIndex && bet.status === 'ACTIVE') {
        return {
          success: false,
          error: `Vous avez déjà placé une mise active sur le panneau BET ${panelIndex}.`,
        };
      }
    }

    const betId = `bet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const reservation = await this.wallet.reserveBet(
      userId,
      betId,
      this.currentRoundId,
      amount,
      panelIndex,
      autoCashout
    );

    if (!reservation.success) {
      return { success: false, error: reservation.error };
    }

    const playerBet: ActivePlayerBet = {
      betId,
      userId,
      username,
      panelIndex,
      amount,
      autoCashout: autoCashout || null,
      cashoutMultiplier: null,
      profit: null,
      status: 'ACTIVE',
    };

    this.activeBets.set(betId, playerBet);

    this.emit('bet.accepted', {
      bet: playerBet,
      newBalance: reservation.data?.balance,
    });

    return { success: true, bet: playerBet };
  }

  public registerExternalBet(bet: ActivePlayerBet) {
    this.activeBets.set(bet.betId, bet);
    this.emit('bet.accepted', { bet });
  }

  public registerExternalCashout(betId: string, multiplier: number, profit: number) {
    const bet = this.activeBets.get(betId);
    if (bet) {
      bet.status = 'CASHED_OUT';
      bet.cashoutMultiplier = multiplier;
      bet.profit = profit;
      bet.cashedOutAt = new Date();
      this.emit('cashout.success', {
        betId,
        userId: bet.userId,
        multiplier,
        profit,
      });
    }
  }

  public async cashOut(
    userId: string,
    betId: string
  ): Promise<{ success: boolean; payout?: number; multiplier?: number; error?: string }> {
    if (this.status !== 'RUNNING') {
      return {
        success: false,
        error: `Impossible d’encaisser : la manche est à l'état ${this.status}.`,
      };
    }

    const bet = this.activeBets.get(betId);
    if (!bet || bet.userId !== userId) {
      return { success: false, error: 'Pari introuvable pour cette manche.' };
    }

    if (bet.status !== 'ACTIVE') {
      return { success: false, error: 'Ce pari a déjà été encaissé ou clôturé.' };
    }

    const currentMult = this.currentMultiplier;
    const cashoutRes = await this.wallet.creditCashOut(userId, betId, currentMult);

    if (!cashoutRes.success) {
      return { success: false, error: cashoutRes.error };
    }

    bet.status = 'CASHED_OUT';
    bet.cashoutMultiplier = currentMult;
    bet.profit = cashoutRes.data!.profit;
    bet.cashedOutAt = new Date();

    this.emit('cashout.success', {
      betId,
      userId,
      username: bet.username,
      panelIndex: bet.panelIndex,
      multiplier: currentMult,
      payout: cashoutRes.data!.payout,
      profit: cashoutRes.data!.profit,
      balance: cashoutRes.data!.balance,
    });

    return {
      success: true,
      payout: cashoutRes.data!.payout,
      multiplier: currentMult,
    };
  }

  private checkAutoCashouts(multiplier: number) {
    for (const bet of this.activeBets.values()) {
      if (bet.status === 'ACTIVE' && bet.autoCashout && multiplier >= bet.autoCashout) {
        this.cashOut(bet.userId, bet.betId).catch(() => {});
      }
    }
  }

  public getPublicRoundInfo(): GameRoundInfo {
    return {
      id: this.currentRoundId,
      roundNumber: this.roundNumber,
      serverSeedHash: this.serverSeedHash,
      serverSeed: this.status === 'CRASHED' || this.status === 'RESULT' ? this.serverSeed : undefined,
      clientSeed: this.clientSeed,
      nonce: this.nonce,
      crashPoint: this.status === 'CRASHED' || this.status === 'RESULT' ? this.crashPoint : undefined,
      currentMultiplier: this.currentMultiplier,
      status: this.status,
      bettingTimeLeft: this.bettingTimeLeft,
      elapsedMs: this.startTime ? Date.now() - this.startTime : 0,
      startedAt: this.startTime || null,
      crashedAt: null,
    };
  }

  public getActiveBetsList(): ActivePlayerBet[] {
    return Array.from(this.activeBets.values());
  }

  public getRecentRounds(): RoundHistoryEntry[] {
    return [...this.recentRounds];
  }

  public getStatus(): GameState {
    return this.status;
  }

  public getCurrentMultiplier(): number {
    return this.currentMultiplier;
  }

  /**
   * Télémétrie administrative confidentielle : donne accès en temps réel
   * au multiplicateur de crash scellé avant et pendant la manche pour supervision.
   */
  public getAdminRoundPreview() {
    const flightTime = this.crashPoint > 1.0 ? Number((Math.log(this.crashPoint) / 0.06).toFixed(1)) : 0;
    const nextFlightTime = this.nextCrashPoint > 1.0 ? Number((Math.log(this.nextCrashPoint) / 0.06).toFixed(1)) : 0;
    const bets = Array.from(this.activeBets.values());
    const totalStaked = bets.reduce((acc, b) => acc + b.amount, 0);
    const details = calculateCrashPointDetailed(this.serverSeed, this.clientSeed, this.nonce);
    const nextDetails = calculateCrashPointDetailed(this.nextServerSeed, this.clientSeed, this.nonce + 1);

    return {
      roundNumber: this.roundNumber,
      currentRoundId: this.currentRoundId,
      status: this.status,
      crashPoint: this.crashPoint, // Multiplicateur exact scellé de la manche en cours
      serverSeed: this.serverSeed,
      serverSeedHash: this.serverSeedHash,
      clientSeed: this.clientSeed,
      nonce: this.nonce,
      currentMultiplier: this.currentMultiplier,
      bettingTimeLeft: this.bettingTimeLeft,
      estimatedFlightDurationSeconds: Math.max(0, flightTime),
      activeBetsCount: bets.length,
      totalStaked,
      activeBets: bets,
      // Télémétrie Provably Fair Spribe Aviator
      sha512Hash: details.sha512Hash,
      hex52: details.hex52,
      decimal52: details.decimal52,
      isInstantCrash: details.isInstantCrash,
      // Radar Prédictif Spribe Aviator : Tour Prochain N+1 scellé d'avance
      nextRound: {
        roundNumber: this.roundNumber + 1,
        predictedCrashPoint: this.nextCrashPoint,
        serverSeed: this.nextServerSeed,
        serverSeedHash: this.nextServerSeedHash,
        clientSeed: this.clientSeed,
        nonce: this.nonce + 1,
        sha512Hash: nextDetails.sha512Hash,
        estimatedFlightDurationSeconds: Math.max(0, nextFlightTime),
      },
      predictionHistory: this.predictionHistory,
    };
  }
}
