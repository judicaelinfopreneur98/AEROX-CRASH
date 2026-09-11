import { IdempotencyManager } from './Idempotency';
import {
  WalletState,
  LedgerTransaction,
  WalletOperationResult,
  TransactionType,
} from './types';

/**
 * Moteur de Portefeuille Transactionnel Autoritaire.
 * Garantit :
 * - Aucune double dépense
 * - Aucun solde négatif
 * - Aucun double cash-out
 * - Atomicité via sérialisation par verrou utilisateur (Mutex)
 * - Traçabilité intégrale (Grand Livre / Ledger)
 */
export class WalletEngine {
  private static instance: WalletEngine;
  private idempotency = IdempotencyManager.getInstance();

  // Verrous d'exclusion mutuelle par utilisateur (anti-race condition)
  private userQueues: Map<string, Promise<any>> = new Map();

  // Entrepôt mémoire réactif
  private wallets: Map<string, WalletState> = new Map();
  private transactions: LedgerTransaction[] = [];
  private bets: Map<
    string,
    {
      id: string;
      userId: string;
      gameId: string;
      panelIndex: number;
      amount: number;
      autoCashout?: number | null;
      cashoutMultiplier?: number | null;
      profit?: number | null;
      status: 'PENDING' | 'ACTIVE' | 'CASHED_OUT' | 'LOST' | 'REFUNDED';
      createdAt: Date;
      cashedOutAt?: Date;
    }
  > = new Map();

  private constructor() {}

  public static getInstance(): WalletEngine {
    const g = globalThis as any;
    if (!g.__aerox_wallet_engine__) {
      g.__aerox_wallet_engine__ = WalletEngine.instance || new WalletEngine();
      WalletEngine.instance = g.__aerox_wallet_engine__;
    }
    return g.__aerox_wallet_engine__;
  }

  /**
   * Sérialise rigoureusement les opérations concurrentes ciblant le portefeuille d'un même utilisateur.
   */
  private async withUserLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.userQueues.get(userId) || Promise.resolve();
    let resolveCurrent: () => void;
    const current = new Promise<void>((res) => {
      resolveCurrent = res;
    });

    // Enchaîne la nouvelle promesse dans la file d'attente
    this.userQueues.set(
      userId,
      prev.then(
        () => current,
        () => current
      )
    );

    await prev;
    try {
      return await fn();
    } finally {
      resolveCurrent!();
      if (this.userQueues.get(userId) === current) {
        this.userQueues.delete(userId);
      }
    }
  }

  /**
   * Initialise ou récupère la référence du portefeuille utilisateur.
   */
  public getOrCreateWallet(userId: string, initialBalance = 1000.0, currency = 'EUR'): WalletState {
    let wallet = this.wallets.get(userId);
    if (!wallet) {
      wallet = {
        id: `wal_${userId}`,
        userId,
        balance: initialBalance,
        lockedBalance: 0,
        currency,
        version: 1,
      };
      this.wallets.set(userId, wallet);
    }
    return wallet;
  }

  /**
   * Consultation du solde d'un utilisateur.
   */
  public async getBalance(
    userId: string
  ): Promise<WalletOperationResult<{ balance: number; lockedBalance: number; currency: string }>> {
    const wallet = this.getOrCreateWallet(userId);
    return {
      success: true,
      data: {
        balance: wallet.balance,
        lockedBalance: wallet.lockedBalance,
        currency: wallet.currency,
      },
    };
  }

  /**
   * Dépôt de fonds (crédit direct avec clé d'idempotence).
   */
  public async deposit(
    userId: string,
    amount: number,
    idempotencyKey?: string
  ): Promise<WalletOperationResult<{ balance: number; transactionId: string }>> {
    if (amount <= 0) {
      return { success: false, error: 'Le montant du dépôt doit être strictement positif.' };
    }

    if (idempotencyKey) {
      const cached = this.idempotency.get(idempotencyKey);
      if (cached) return { success: true, data: cached };
    }

    return this.withUserLock(userId, async () => {
      const wallet = this.getOrCreateWallet(userId);
      wallet.balance = Number((wallet.balance + amount).toFixed(2));
      wallet.version += 1;

      const tx: LedgerTransaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        idempotencyKey: idempotencyKey || `dep_${Date.now()}`,
        walletId: wallet.id,
        amount,
        type: 'DEPOSIT',
        status: 'COMPLETED',
        balanceAfter: wallet.balance,
        createdAt: new Date(),
      };
      this.transactions.push(tx);

      const result = { balance: wallet.balance, transactionId: tx.id };
      if (idempotencyKey) {
        this.idempotency.set(idempotencyKey, result);
      }
      return { success: true, data: result };
    });
  }

  /**
   * Retrait de fonds (débit direct avec vérification de solvabilité).
   */
  public async withdraw(
    userId: string,
    amount: number,
    destinationAccount: string,
    idempotencyKey?: string
  ): Promise<WalletOperationResult<{ balance: number; transactionId: string }>> {
    if (amount <= 0) {
      return { success: false, error: 'Le montant du retrait doit être strictement positif.' };
    }

    if (idempotencyKey) {
      const cached = this.idempotency.get(idempotencyKey);
      if (cached) return { success: true, data: cached };
    }

    return this.withUserLock(userId, async () => {
      const wallet = this.getOrCreateWallet(userId);
      if (wallet.balance < amount) {
        return {
          success: false,
          code: 'INSUFFICIENT_FUNDS',
          error: 'Solde insuffisant pour exécuter ce retrait.',
        };
      }

      wallet.balance = Number((wallet.balance - amount).toFixed(2));
      wallet.version += 1;

      const tx: LedgerTransaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        idempotencyKey: idempotencyKey || `wth_${Date.now()}`,
        walletId: wallet.id,
        amount: -amount,
        type: 'WITHDRAWAL',
        status: 'COMPLETED',
        balanceAfter: wallet.balance,
        metadata: { destinationAccount },
        createdAt: new Date(),
      };
      this.transactions.push(tx);

      const result = { balance: wallet.balance, transactionId: tx.id };
      if (idempotencyKey) {
        this.idempotency.set(idempotencyKey, result);
      }
      return { success: true, data: result };
    });
  }

  /**
   * Réservation atomique d'une mise.
   */
  public async reserveBet(
    userId: string,
    betId: string,
    gameId: string,
    amount: number,
    panelIndex: number = 1,
    autoCashout?: number | null,
    idempotencyKey?: string
  ): Promise<WalletOperationResult<{ betId: string; balance: number }>> {
    if (idempotencyKey) {
      const cached = this.idempotency.get(idempotencyKey);
      if (cached) return { success: true, data: cached };
    }

    if (amount <= 0) {
      return { success: false, error: 'Le montant de la mise doit être supérieur à zéro.' };
    }

    return this.withUserLock(userId, async () => {
      const wallet = this.getOrCreateWallet(userId);

      if (wallet.balance < amount) {
        return {
          success: false,
          code: 'INSUFFICIENT_FUNDS',
          error: `Solde insuffisant. Requis : ${amount.toFixed(2)} €, Disponible : ${wallet.balance.toFixed(2)} €`,
        };
      }

      wallet.balance = Number((wallet.balance - amount).toFixed(2));
      wallet.version += 1;

      const bet = {
        id: betId,
        userId,
        gameId,
        panelIndex,
        amount,
        autoCashout: autoCashout || null,
        status: 'ACTIVE' as const,
        createdAt: new Date(),
      };
      this.bets.set(betId, bet);

      const key = idempotencyKey || `bet_${betId}`;
      const tx: LedgerTransaction = {
        id: `tx_bet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        idempotencyKey: key,
        walletId: wallet.id,
        amount: -amount,
        type: 'BET',
        status: 'COMPLETED',
        balanceAfter: wallet.balance,
        referenceId: betId,
        createdAt: new Date(),
      };
      this.transactions.push(tx);

      const result = { betId, balance: wallet.balance };
      if (idempotencyKey) {
        this.idempotency.set(idempotencyKey, result);
      }
      return { success: true, data: result };
    });
  }

  /**
   * Opération atomique de Cash-Out.
   */
  public async creditCashOut(
    userId: string,
    betId: string,
    multiplier: number,
    idempotencyKey?: string
  ): Promise<
    WalletOperationResult<{
      betId: string;
      multiplier: number;
      payout: number;
      profit: number;
      balance: number;
    }>
  > {
    if (idempotencyKey) {
      const cached = this.idempotency.get(idempotencyKey);
      if (cached) return { success: true, data: cached };
    }

    return this.withUserLock(userId, async () => {
      const bet = this.bets.get(betId);
      if (!bet) {
        return { success: false, code: 'NOT_FOUND', error: 'Pari introuvable.' };
      }

      if (bet.userId !== userId) {
        return { success: false, code: 'INVALID_STATUS', error: 'Ce pari n’appartient pas à cet utilisateur.' };
      }

      if (bet.status === 'CASHED_OUT') {
        return {
          success: false,
          code: 'ALREADY_CASHED_OUT',
          error: 'Ce pari a déjà été encaissé.',
        };
      }

      if (bet.status !== 'ACTIVE') {
        return {
          success: false,
          code: 'INVALID_STATUS',
          error: `Pari non éligible au cash-out (Statut : ${bet.status}).`,
        };
      }

      const payout = Number((bet.amount * multiplier).toFixed(2));
      const profit = Number((payout - bet.amount).toFixed(2));

      bet.status = 'CASHED_OUT';
      bet.cashoutMultiplier = multiplier;
      bet.profit = profit;
      bet.cashedOutAt = new Date();

      const wallet = this.getOrCreateWallet(userId);
      wallet.balance = Number((wallet.balance + payout).toFixed(2));
      wallet.version += 1;

      const key = idempotencyKey || `co_${betId}`;
      const tx: LedgerTransaction = {
        id: `tx_cashout_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        idempotencyKey: key,
        walletId: wallet.id,
        amount: payout,
        type: 'CASHOUT',
        status: 'COMPLETED',
        balanceAfter: wallet.balance,
        referenceId: betId,
        metadata: { multiplier, profit, betAmount: bet.amount },
        createdAt: new Date(),
      };
      this.transactions.push(tx);

      const result = {
        betId,
        multiplier,
        payout,
        profit,
        balance: wallet.balance,
      };
      if (idempotencyKey) {
        this.idempotency.set(idempotencyKey, result);
      }
      return { success: true, data: result };
    });
  }

  public async markBetsAsLost(gameId: string): Promise<string[]> {
    const lostBetIds: string[] = [];
    for (const [id, bet] of this.bets.entries()) {
      if (bet.gameId === gameId && bet.status === 'ACTIVE') {
        bet.status = 'LOST';
        bet.profit = -bet.amount;
        lostBetIds.push(id);
      }
    }
    return lostBetIds;
  }

  public async refundBet(userId: string, betId: string, reason: string): Promise<WalletOperationResult<{ balance: number }>> {
    return this.withUserLock(userId, async () => {
      const bet = this.bets.get(betId);
      if (!bet || bet.status !== 'ACTIVE') {
        return { success: false, error: 'Pari introuvable ou non actif pour remboursement.' };
      }

      bet.status = 'REFUNDED';
      const wallet = this.getOrCreateWallet(userId);
      wallet.balance = Number((wallet.balance + bet.amount).toFixed(2));
      wallet.version += 1;

      const tx: LedgerTransaction = {
        id: `tx_ref_${Date.now()}`,
        idempotencyKey: `refund_${betId}`,
        walletId: wallet.id,
        amount: bet.amount,
        type: 'REFUND',
        status: 'COMPLETED',
        balanceAfter: wallet.balance,
        referenceId: betId,
        metadata: { reason },
        createdAt: new Date(),
      };
      this.transactions.push(tx);

      return { success: true, data: { balance: wallet.balance } };
    });
  }

  public async getUserTransactions(userId: string, limit = 50): Promise<LedgerTransaction[]> {
    const wallet = this.wallets.get(userId);
    if (!wallet) return [];
    return this.transactions
      .filter((t) => t.walletId === wallet.id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  public getBet(betId: string) {
    return this.bets.get(betId) || null;
  }

  public getBetsByGame(gameId: string) {
    const list: any[] = [];
    for (const bet of this.bets.values()) {
      if (bet.gameId === gameId) list.push({ ...bet });
    }
    return list;
  }

  public getUserBets(userId: string, limit = 50) {
    const list: any[] = [];
    for (const bet of this.bets.values()) {
      if (bet.userId === userId) list.push({ ...bet });
    }
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
  }

  public resetForTesting() {
    this.wallets.clear();
    this.transactions = [];
    this.bets.clear();
    this.idempotency.clear();
    this.userQueues.clear();
  }
}
