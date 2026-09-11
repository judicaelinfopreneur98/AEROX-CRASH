import { describe, it, expect } from 'vitest';
import { WS_EVENTS } from '../websocket/events';

describe('Protocole WebSocket et Sérialisation', () => {
  it('doit posséder tous les types d’événements temps réel requis', () => {
    expect(WS_EVENTS.GAME_CREATED).toBe('game.created');
    expect(WS_EVENTS.GAME_BETTING).toBe('game.betting');
    expect(WS_EVENTS.GAME_STARTED).toBe('game.started');
    expect(WS_EVENTS.GAME_MULTIPLIER).toBe('game.multiplier');
    expect(WS_EVENTS.GAME_CRASHED).toBe('game.crashed');
    expect(WS_EVENTS.BET_ACCEPTED).toBe('bet.accepted');
    expect(WS_EVENTS.BET_REJECTED).toBe('bet.rejected');
    expect(WS_EVENTS.CASHOUT_SUCCESS).toBe('cashout.success');
    expect(WS_EVENTS.CASHOUT_FAILED).toBe('cashout.failed');
    expect(WS_EVENTS.WALLET_UPDATED).toBe('wallet.updated');
  });

  it('doit formater et sérialiser correctement les messages JSON WebSocket', () => {
    const payload = {
      event: WS_EVENTS.GAME_MULTIPLIER,
      data: { multiplier: 2.45, elapsedSeconds: 12.3 },
      timestamp: Date.now(),
    };

    const serialized = JSON.stringify(payload);
    const parsed = JSON.parse(serialized);

    expect(parsed.event).toBe('game.multiplier');
    expect(parsed.data.multiplier).toBe(2.45);
  });
});
