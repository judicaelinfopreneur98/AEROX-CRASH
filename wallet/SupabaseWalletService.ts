import { prisma } from '../lib/prisma';
import { BetStatus, TransactionType, TransactionStatus, GameStatus } from '@prisma/client';
import { generateServerSeed, hashServerSeed, calculateCrashPoint } from '../lib/provably-fair';

export interface PlaceBetParams {
  userId: string;
  username: string;
  amount: number;
  panelIndex: number;
  autoCashout?: number | null;
  idempotencyKey?: string;
  gameId?: string;
}

export interface CashOutParams {
  userId: string;
  betId: string;
  multiplier: number;
  idempotencyKey?: string;
}

export interface AtomicBetResult {
  bet: {
    id: string;
    betId: string;
    userId: string;
    username: string;
    gameId: string;
    panelIndex: number;
    amount: number;
    autoCashout: number | null;
    cashoutMultiplier: number | null;
    profit: number | null;
    status: BetStatus;
    createdAt: Date;
  };
  newBalance: number;
}

export interface AtomicCashOutResult {
  bet: {
    id: string;
    betId: string;
    userId: string;
    gameId: string;
    panelIndex: number;
    amount: number;
    cashoutMultiplier: number;
    profit: number;
    status: BetStatus;
    cashedOutAt: Date;
  };
  winAmount: number;
  profit: number;
  multiplier: number;
  newBalance: number;
}

export class SupabaseWalletService {
  private static instance: SupabaseWalletService;

  public static getInstance(): SupabaseWalletService {
    if (!SupabaseWalletService.instance) {
      SupabaseWalletService.instance = new SupabaseWalletService();
    }
    return SupabaseWalletService.instance;
  }

  /**
   * Récupère ou initialise de manière sécurisée le portefeuille de l'utilisateur dans Supabase.
   */
  public async getOrCreateUserWallet(userId: string, defaultCurrency: string = 'EUR') {
    let wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      // Déterminer la devise et le solde par défaut (1 000 FCFA ou 1 000 EUR)
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const currency = user?.currency || defaultCurrency;
      const initialBalance = 1000.0;

      wallet = await prisma.wallet.create({
        data: {
          userId,
          balance: initialBalance,
          lockedBalance: 0,
          currency,
          version: 1,
        },
      });

      // Créer la transaction d'initialisation
      await prisma.transaction.create({
        data: {
          idempotencyKey: `init_wallet_${userId}`,
          walletId: wallet.id,
          amount: initialBalance,
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.COMPLETED,
          balanceAfter: initialBalance,
          metadata: JSON.stringify({ reason: 'Initial calibration balance' }),
        },
      });
    }

    return wallet;
  }

  /**
   * Obtient ou crée la manche active dans Supabase pour associer les paris.
   */
  public async getOrCreateCurrentGame(tx: any) {
    // Rechercher une partie récente en cours de mise (créée il y a moins de 30 secondes)
    const existingGame = await tx.game.findFirst({
      where: {
        status: { in: [GameStatus.WAITING, GameStatus.BETTING] },
        createdAt: { gte: new Date(Date.now() - 30000) },
      },
      orderBy: { roundNumber: 'desc' },
    });

    if (existingGame) {
      return existingGame;
    }

    // Sinon créer une nouvelle manche Provably Fair
    const serverSeed = generateServerSeed();
    const serverSeedHash = hashServerSeed(serverSeed);
    const clientSeed = 'aerox-global-seed-v1';
    const lastGame = await tx.game.findFirst({ orderBy: { roundNumber: 'desc' } });
    const roundNumber = (lastGame?.roundNumber || 0) + 1;
    const crashPoint = calculateCrashPoint(serverSeed, clientSeed, roundNumber);

    return await tx.game.create({
      data: {
        roundNumber,
        serverSeed,
        serverSeedHash,
        clientSeed,
        nonce: roundNumber,
        crashPoint,
        status: GameStatus.BETTING,
        createdAt: new Date(),
      },
    });
  }

  /**
   * TRANSACTION ATOMIQUE SUPABASE : PLACEMENT DE PARI
   * 1. Verrouille la ligne du portefeuille avec FOR UPDATE
   * 2. Valide que balance >= amount
   * 3. Déduit le montant côté serveur
   * 4. Crée le pari avec status = ACTIVE
   * 5. Crée la transaction comptable avec idempotencyKey
   * 6. Renvoie le solde exact et les données du pari
   */
  public async placeBetAtomic({
    userId,
    username,
    amount,
    panelIndex,
    autoCashout,
    idempotencyKey,
    gameId,
  }: PlaceBetParams): Promise<AtomicBetResult> {
    if (amount <= 0) {
      throw new Error('Le montant de la mise doit être supérieur à zéro.');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Verrouillage pessimiste de la ligne Wallet de l'utilisateur dans PostgreSQL Supabase
      const lockedWallets: any[] = await tx.$queryRaw`
        SELECT id, "userId", balance, "lockedBalance", currency, version
        FROM "Wallet"
        WHERE "userId" = ${userId}
        FOR UPDATE
      `;

      let currentWallet = lockedWallets[0];

      if (!currentWallet) {
        // Création à la volée dans la transaction
        const user = await tx.user.findUnique({ where: { id: userId } });
        const currency = user?.currency || 'EUR';
        currentWallet = await tx.wallet.create({
          data: {
            userId,
            balance: 1000.0,
            lockedBalance: 0,
            currency,
            version: 1,
          },
        });
      }

      // Vérification du solde disponible
      const currentBalance = Number(currentWallet.balance);
      if (currentBalance < amount) {
        throw new Error(`Solde insuffisant (${currentBalance.toFixed(2)} ${currentWallet.currency} disponible pour une mise de ${amount.toFixed(2)}).`);
      }

      // 2. Gestion de l'idempotence (si une requête identique a déjà été traitée)
      const effectiveIdempotencyKey = idempotencyKey || `bet_${userId}_${panelIndex}_${Date.now()}`;
      const existingTx = await tx.transaction.findUnique({
        where: { idempotencyKey: effectiveIdempotencyKey },
      });

      if (existingTx) {
        const existingBet = await tx.bet.findFirst({
          where: { id: existingTx.referenceId || '' },
        });
        if (existingBet) {
          return {
            bet: {
              id: existingBet.id,
              betId: existingBet.id,
              userId: existingBet.userId,
              username,
              gameId: existingBet.gameId,
              panelIndex: existingBet.panelIndex,
              amount: existingBet.amount,
              autoCashout: existingBet.autoCashout,
              cashoutMultiplier: existingBet.cashoutMultiplier,
              profit: existingBet.profit,
              status: existingBet.status,
              createdAt: existingBet.createdAt,
            },
            newBalance: existingTx.balanceAfter,
          };
        }
      }

      // 3. Vérifier ou obtenir la manche active de mise
      let activeGame: any;
      if (gameId) {
        activeGame = await tx.game.findUnique({ where: { id: gameId } });
        // Si la manche est déjà crashée, ne pas y attacher le pari
        if (activeGame && activeGame.status === GameStatus.CRASHED) {
          activeGame = null;
        }
      }
      if (!activeGame) {
        activeGame = await this.getOrCreateCurrentGame(tx);
      }

      // 4. Déduction du solde
      const newBalance = Number((currentBalance - amount).toFixed(2));
      await tx.wallet.update({
        where: { id: currentWallet.id },
        data: {
          balance: newBalance,
          version: { increment: 1 },
        },
      });

      // 5. Création du Bet dans Supabase
      const bet = await tx.bet.create({
        data: {
          userId,
          gameId: activeGame.id,
          panelIndex,
          amount,
          autoCashout: autoCashout ? Number(autoCashout.toFixed(2)) : null,
          status: BetStatus.ACTIVE,
        },
      });

      // 6. Écriture dans le grand livre des Transactions
      await tx.transaction.create({
        data: {
          idempotencyKey: effectiveIdempotencyKey,
          walletId: currentWallet.id,
          amount: -amount,
          type: TransactionType.BET,
          status: TransactionStatus.COMPLETED,
          balanceAfter: newBalance,
          referenceId: bet.id,
          metadata: JSON.stringify({
            gameId: activeGame.id,
            roundNumber: activeGame.roundNumber,
            panelIndex,
            autoCashout,
          }),
        },
      });

      // 7. Calcul des statistiques en direct pour diagnostic
      const roundBets = await tx.bet.findMany({
        where: { gameId: activeGame.id },
        select: { amount: true },
      });
      const playersCount = roundBets.length;
      const totalVolume = Number(roundBets.reduce((acc: number, b: any) => acc + b.amount, 0).toFixed(2));

      // Logs de diagnostic (conformes Section 12 sans secrets)
      console.log(`[BET] user_id: ${userId}`);
      console.log(`[BET] round_id: ${activeGame.id}`);
      console.log(`[BET] amount: ${amount}`);
      console.log(`[BET] database insert: OK (bet_id: ${bet.id})`);
      console.log(`[BET] wallet update: OK (new_balance: ${newBalance})`);
      console.log(`[BET] active bet: ${bet.id}`);
      console.log(`[BET] current round: #${activeGame.roundNumber}`);
      console.log(`[BET] players count: ${playersCount}`);
      console.log(`[BET] total volume: ${totalVolume}`);

      return {
        bet: {
          id: bet.id,
          betId: bet.id,
          userId: bet.userId,
          username,
          gameId: bet.gameId,
          panelIndex: bet.panelIndex,
          amount: bet.amount,
          autoCashout: bet.autoCashout,
          cashoutMultiplier: bet.cashoutMultiplier,
          profit: bet.profit,
          status: bet.status,
          createdAt: bet.createdAt,
        },
        newBalance,
      };
    }, {
      timeout: 15000,
    });
  }

  /**
   * TRANSACTION ATOMIQUE SUPABASE : CASHOUT SÉCURISÉ
   * 1. Verrouille la ligne du pari avec SELECT ... FOR UPDATE
   * 2. Vérifie que le pari est ACTIVE (rejette tout double cashout)
   * 3. Calcule le montant du gain côté serveur : winAmount = amount * multiplier
   * 4. Verrouille et crédite le Wallet de l'utilisateur
   * 5. Met à jour le Bet en CASHED_OUT
   * 6. Enregistre la transaction comptable
   * 7. Renvoie le solde et le statut certifié
   */
  public async cashOutBetAtomic({
    userId,
    betId,
    multiplier,
    idempotencyKey,
  }: CashOutParams): Promise<AtomicCashOutResult> {
    const mult = Number(Math.max(1.00, multiplier).toFixed(2));

    return await prisma.$transaction(async (tx) => {
      // 1. Verrouillage pessimiste du pari dans PostgreSQL Supabase
      const lockedBets: any[] = await tx.$queryRaw`
        SELECT id, "userId", "gameId", "panelIndex", amount, status, "autoCashout", profit
        FROM "Bet"
        WHERE id = ${betId}
        FOR UPDATE
      `;

      const bet = lockedBets[0];

      if (!bet) {
        throw new Error('Pari introuvable.');
      }

      if (bet.userId !== userId) {
        throw new Error('Action non autorisée : ce pari ne vous appartient pas.');
      }

      // Protection stricte anti double-cashout
      if (bet.status !== BetStatus.ACTIVE) {
        throw new Error(`Ce pari a déjà été traité (statut actuel : ${bet.status}).`);
      }

      // 2. Calcul du gain et profit côté serveur
      const betAmount = Number(bet.amount);
      const winAmount = Number((betAmount * mult).toFixed(2));
      const profit = Number((winAmount - betAmount).toFixed(2));

      // 3. Verrouillage du Wallet
      const lockedWallets: any[] = await tx.$queryRaw`
        SELECT id, balance, version
        FROM "Wallet"
        WHERE "userId" = ${userId}
        FOR UPDATE
      `;

      const wallet = lockedWallets[0];
      if (!wallet) {
        throw new Error('Portefeuille introuvable pour ce joueur.');
      }

      const newBalance = Number((Number(wallet.balance) + winAmount).toFixed(2));

      // 4. Crédit du Wallet
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: newBalance,
          version: { increment: 1 },
        },
      });

      // 5. Mise à jour du Bet
      const now = new Date();
      const updatedBet = await tx.bet.update({
        where: { id: bet.id },
        data: {
          status: BetStatus.CASHED_OUT,
          cashoutMultiplier: mult,
          profit,
          cashedOutAt: now,
        },
      });

      // 6. Écriture comptable Transaction
      const effectiveIdempotencyKey = idempotencyKey || `cashout_${bet.id}_${Date.now()}`;
      await tx.transaction.create({
        data: {
          idempotencyKey: effectiveIdempotencyKey,
          walletId: wallet.id,
          amount: winAmount,
          type: TransactionType.CASHOUT,
          status: TransactionStatus.COMPLETED,
          balanceAfter: newBalance,
          referenceId: bet.id,
          metadata: JSON.stringify({
            multiplier: mult,
            betAmount,
            profit,
          }),
        },
      });

      return {
        bet: {
          id: updatedBet.id,
          betId: updatedBet.id,
          userId: updatedBet.userId,
          gameId: updatedBet.gameId,
          panelIndex: updatedBet.panelIndex,
          amount: updatedBet.amount,
          cashoutMultiplier: mult,
          profit,
          status: updatedBet.status,
          cashedOutAt: now,
        },
        winAmount,
        profit,
        multiplier: mult,
        newBalance,
      };
    }, {
      timeout: 15000,
    });
  }

  /**
   * Marque tous les paris actifs d'une manche comme PERDUS lors d'un crash.
   */
  public async markRoundLostBetsAtomic(gameId: string): Promise<number> {
    return await prisma.$transaction(async (tx) => {
      const activeBets = await tx.bet.findMany({
        where: {
          gameId,
          status: BetStatus.ACTIVE,
        },
      });

      if (activeBets.length === 0) return 0;

      for (const bet of activeBets) {
        await tx.bet.update({
          where: { id: bet.id },
          data: {
            status: BetStatus.LOST,
            profit: -bet.amount,
          },
        });
      }

      await tx.game.update({
        where: { id: gameId },
        data: {
          status: GameStatus.CRASHED,
          crashedAt: new Date(),
        },
      });

      return activeBets.length;
    });
  }

  /**
   * Récupère le solde réel actuel d'un utilisateur directement depuis Supabase.
   */
  public async getUserBalance(userId: string): Promise<{ balance: number; lockedBalance: number; currency: string }> {
    const wallet = await this.getOrCreateUserWallet(userId);
    return {
      balance: wallet.balance,
      lockedBalance: wallet.lockedBalance,
      currency: wallet.currency,
    };
  }

  /**
   * Récupère les paris actifs d'un utilisateur.
   */
  public async getUserActiveBets(userId: string) {
    const bets = await prisma.bet.findMany({
      where: {
        userId,
        status: BetStatus.ACTIVE,
      },
      include: {
        user: { select: { username: true } },
      },
    });

    return bets.map((b) => ({
      id: b.id,
      betId: b.id,
      userId: b.userId,
      username: b.user.username,
      gameId: b.gameId,
      panelIndex: b.panelIndex,
      amount: b.amount,
      autoCashout: b.autoCashout,
      cashoutMultiplier: b.cashoutMultiplier,
      profit: b.profit,
      status: b.status,
      createdAt: b.createdAt,
    }));
  }

  /**
   * Récupère les paris d'une manche pour l'affichage en direct.
   */
  public async getGameBets(gameId: string) {
    const bets = await prisma.bet.findMany({
      where: { gameId },
      include: {
        user: { select: { username: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return bets.map((b) => ({
      id: b.id,
      betId: b.id,
      userId: b.userId,
      username: b.user.username,
      gameId: b.gameId,
      panelIndex: b.panelIndex,
      amount: b.amount,
      autoCashout: b.autoCashout,
      cashoutMultiplier: b.cashoutMultiplier,
      profit: b.profit,
      status: b.status,
      createdAt: b.createdAt,
      cashedOutAt: b.cashedOutAt,
    }));
  }
}

export const supabaseWalletService = SupabaseWalletService.getInstance();
