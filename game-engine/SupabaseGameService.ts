import { prisma } from '@/lib/prisma';
import { MultiplierEngine } from './MultiplierEngine';
import { generateServerSeed, hashServerSeed, calculateCrashPoint } from '@/lib/provably-fair';
import { GameStatus, BetStatus } from '@prisma/client';

export interface PublicRoundData {
  id: string;
  roundNumber: number;
  status: 'WAITING' | 'BETTING' | 'RUNNING' | 'CRASHED' | 'RESULT';
  crashPoint?: number;
  currentMultiplier: number;
  bettingTimeLeft: number;
  serverSeedHash: string;
  serverSeed?: string;
  startedAt: number | null;
  crashedAt: number | null;
}

export interface PublicBetData {
  id: string;
  betId: string;
  userId: string;
  username: string;
  panelIndex: number;
  amount: number;
  autoCashout: number | null;
  cashoutMultiplier: number | null;
  profit: number | null;
  status: 'ACTIVE' | 'CASHED_OUT' | 'LOST';
  createdAt: Date;
  cashedOutAt?: Date | null;
}

export class SupabaseGameService {
  private static instance: SupabaseGameService;

  public static getInstance(): SupabaseGameService {
    if (!SupabaseGameService.instance) {
      SupabaseGameService.instance = new SupabaseGameService();
    }
    return SupabaseGameService.instance;
  }

  /**
   * Synchronise l'état du jeu avec Supabase et renvoie les données réelles du round et des paris.
   * Gère la transition d'état temporelle (BETTING -> RUNNING -> CRASHED -> NEXT ROUND).
   */
  public async getLiveGameState(): Promise<{
    round: PublicRoundData;
    activeBets: PublicBetData[];
    betsCount: number;
    totalVolume: number;
    recentHistory: any[];
    serverTime: number;
  }> {
    const now = Date.now();

    // 0. Auto-clôture des anciennes manches fantômes (si inactivité > 60s)
    await prisma.game.updateMany({
      where: {
        status: { in: [GameStatus.WAITING, GameStatus.BETTING, GameStatus.RUNNING] },
        createdAt: { lt: new Date(now - 60000) },
      },
      data: {
        status: GameStatus.CRASHED,
        crashedAt: new Date(),
      },
    });

    // 1. Récupérer le dernier jeu existant dans Supabase
    let latestGame = await prisma.game.findFirst({
      orderBy: { roundNumber: 'desc' },
      include: {
        bets: {
          include: {
            user: {
              select: { id: true, username: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // 2. Si aucun jeu n'existe, créer la première manche
    if (!latestGame) {
      latestGame = await this.createNewGame(1);
    }

    // 3. Évaluer l'état du jeu selon son horodatage et son statut
    const createdAt = latestGame.createdAt.getTime();
    let currentStatus: 'WAITING' | 'BETTING' | 'RUNNING' | 'CRASHED' | 'RESULT' = latestGame.status as any;
    let currentMultiplier = 1.00;
    let bettingTimeLeft = 0;
    const BETTING_DURATION_MS = 8000; // 8 secondes pour parier confortablement
    const CRASHED_COOLDOWN_MS = 4000; // 4 secondes d'affichage des résultats du crash

    if (latestGame.status === GameStatus.WAITING || latestGame.status === GameStatus.BETTING) {
      const elapsedSinceCreation = now - createdAt;

      if (elapsedSinceCreation < BETTING_DURATION_MS) {
        // En phase de mise (BETTING)
        currentStatus = 'BETTING';
        bettingTimeLeft = Math.max(0, Number(((BETTING_DURATION_MS - elapsedSinceCreation) / 1000).toFixed(1)));
        currentMultiplier = 1.00;

        if (latestGame.status !== GameStatus.BETTING) {
          await prisma.game.update({
            where: { id: latestGame.id },
            data: { status: GameStatus.BETTING },
          });
        }
      } else {
        // La période de mise est terminée : le vol démarre (RUNNING)
        const startedAtDate = new Date(createdAt + BETTING_DURATION_MS);
        const flightElapsedSec = Math.max(0, (now - startedAtDate.getTime()) / 1000);
        const mult = MultiplierEngine.calculateMultiplier(flightElapsedSec);

        if (mult >= latestGame.crashPoint) {
          // Le vol s'est écrasé
          await this.markGameCrashed(latestGame.id, latestGame.crashPoint);
          currentStatus = 'CRASHED';
          currentMultiplier = latestGame.crashPoint;
        } else {
          // Le vol est en cours
          currentStatus = 'RUNNING';
          currentMultiplier = mult;

          if (!latestGame.startedAt) {
            await prisma.game.update({
              where: { id: latestGame.id },
              data: {
                status: GameStatus.RUNNING,
                startedAt: startedAtDate,
              },
            });
          }
        }
      }
    } else if (latestGame.status === GameStatus.RUNNING) {
      const startedAt = latestGame.startedAt ? latestGame.startedAt.getTime() : createdAt + BETTING_DURATION_MS;
      const flightElapsedSec = Math.max(0, (now - startedAt) / 1000);
      const mult = MultiplierEngine.calculateMultiplier(flightElapsedSec);

      if (mult >= latestGame.crashPoint) {
        // Crash atteint
        await this.markGameCrashed(latestGame.id, latestGame.crashPoint);
        currentStatus = 'CRASHED';
        currentMultiplier = latestGame.crashPoint;
      } else {
        currentStatus = 'RUNNING';
        currentMultiplier = mult;
      }
    } else if (latestGame.status === GameStatus.CRASHED) {
      const crashedTime = latestGame.crashedAt ? latestGame.crashedAt.getTime() : createdAt;
      const elapsedSinceCrash = now - crashedTime;

      if (elapsedSinceCrash >= CRASHED_COOLDOWN_MS) {
        // Le temps d'attente après crash est écoulé -> Créer immédiatement la manche suivante
        const nextRoundNum = latestGame.roundNumber + 1;
        latestGame = await this.createNewGame(nextRoundNum);
        currentStatus = 'BETTING';
        bettingTimeLeft = 8.0;
        currentMultiplier = 1.00;
      } else {
        currentStatus = 'CRASHED';
        currentMultiplier = latestGame.crashPoint;
      }
    }

    // 4. Formater les paris de la manche actuelle
    const formattedBets: PublicBetData[] = (latestGame.bets || []).map((b) => ({
      id: b.id,
      betId: b.id,
      userId: b.userId,
      username: b.user?.username || 'Pilote',
      panelIndex: b.panelIndex,
      amount: b.amount,
      autoCashout: b.autoCashout,
      cashoutMultiplier: b.cashoutMultiplier,
      profit: b.profit,
      status: b.status as any,
      createdAt: b.createdAt,
      cashedOutAt: b.cashedOutAt,
    }));

    const betsCount = formattedBets.length;
    const totalVolume = Number(formattedBets.reduce((acc, b) => acc + b.amount, 0).toFixed(2));

    // 5. Récupérer l'historique récent des manches crashées
    const recentGames = await prisma.game.findMany({
      where: { status: GameStatus.CRASHED },
      orderBy: { roundNumber: 'desc' },
      take: 25,
      select: {
        id: true,
        roundNumber: true,
        crashPoint: true,
        serverSeed: true,
        serverSeedHash: true,
        clientSeed: true,
        nonce: true,
        createdAt: true,
      },
    });

    const recentHistory = recentGames.map((g) => ({
      id: g.id,
      roundNumber: g.roundNumber,
      crashPoint: g.crashPoint,
      serverSeed: g.serverSeed,
      serverSeedHash: g.serverSeedHash,
      clientSeed: g.clientSeed,
      nonce: g.nonce,
      createdAt: g.createdAt,
    }));

    return {
      round: {
        id: latestGame.id,
        roundNumber: latestGame.roundNumber,
        status: currentStatus,
        crashPoint: currentStatus === 'CRASHED' ? latestGame.crashPoint : undefined,
        currentMultiplier,
        bettingTimeLeft,
        serverSeedHash: latestGame.serverSeedHash,
        serverSeed: currentStatus === 'CRASHED' ? latestGame.serverSeed : undefined,
        startedAt: latestGame.startedAt ? latestGame.startedAt.getTime() : null,
        crashedAt: latestGame.crashedAt ? latestGame.crashedAt.getTime() : null,
      },
      activeBets: formattedBets,
      betsCount,
      totalVolume,
      recentHistory,
      serverTime: now,
    };
  }

  /**
   * Crée une nouvelle manche Provably Fair dans Supabase.
   */
  public async createNewGame(roundNumber: number) {
    const serverSeed = generateServerSeed();
    const serverSeedHash = hashServerSeed(serverSeed);
    const clientSeed = 'aerox-global-seed-v1';
    const crashPoint = calculateCrashPoint(serverSeed, clientSeed, roundNumber);

    return await prisma.game.create({
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
      include: {
        bets: {
          include: {
            user: { select: { id: true, username: true } },
          },
        },
      },
    });
  }

  /**
   * Marque une manche comme CRASHED et passe les paris encore actifs en LOST.
   */
  public async markGameCrashed(gameId: string, crashPoint: number) {
    const now = new Date();

    // 1. Mettre à jour les paris actifs en LOST
    await prisma.bet.updateMany({
      where: {
        gameId,
        status: BetStatus.ACTIVE,
      },
      data: {
        status: BetStatus.LOST,
      },
    });

    // 2. Mettre à jour la partie
    return await prisma.game.update({
      where: { id: gameId },
      data: {
        status: GameStatus.CRASHED,
        crashedAt: now,
      },
    });
  }
}

export const supabaseGameService = SupabaseGameService.getInstance();
