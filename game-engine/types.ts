export type GameState = 'WAITING' | 'BETTING' | 'RUNNING' | 'CRASHED' | 'RESULT';

export interface ActivePlayerBet {
  betId: string;
  userId: string;
  username: string;
  panelIndex: number;
  amount: number;
  autoCashout: number | null;
  cashoutMultiplier: number | null;
  profit: number | null;
  status: 'ACTIVE' | 'CASHED_OUT' | 'LOST';
  cashedOutAt?: Date;
}

export interface GameRoundInfo {
  id: string;
  roundNumber: number;
  serverSeedHash: string;
  serverSeed?: string; // Uniquement révélé à l'état CRASHED
  clientSeed: string;
  nonce: number;
  crashPoint?: number; // Caché pendant RUNNING, révélé à CRASHED
  currentMultiplier: number;
  status: GameState;
  bettingTimeLeft: number; // En secondes ou millisecondes
  elapsedMs: number;
  startedAt: number | null;
  crashedAt: number | null;
}
