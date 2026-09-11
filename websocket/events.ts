export const WS_EVENTS = {
  // Événements Serveur -> Client (Manche)
  GAME_CREATED: 'game.created',
  GAME_BETTING: 'game.betting',
  GAME_STARTED: 'game.started',
  GAME_MULTIPLIER: 'game.multiplier',
  GAME_CRASHED: 'game.crashed',
  GAME_RESULT: 'game.result',

  // Événements Serveur -> Client (Paris & Portefeuille)
  BET_ACCEPTED: 'bet.accepted',
  BET_REJECTED: 'bet.rejected',
  CASHOUT_SUCCESS: 'cashout.success',
  CASHOUT_FAILED: 'cashout.failed',
  WALLET_UPDATED: 'wallet.updated',

  // Événements Client -> Serveur
  ACTION_BET: 'action.bet',
  ACTION_CASHOUT: 'action.cashout',
  ACTION_AUTH: 'action.auth',

  // Système & Heartbeat
  PING: 'ping',
  PONG: 'pong',
} as const;

export type WsEventType = (typeof WS_EVENTS)[keyof typeof WS_EVENTS];

export interface WsMessage<T = any> {
  event: string;
  data: T;
  timestamp?: number;
}
