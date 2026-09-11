import { NextResponse } from 'next/server';
import { GameEngine } from '@/game-engine/GameEngine';

export async function GET() {
  const game = GameEngine.getInstance();
  const info = game.getPublicRoundInfo();
  const activeBets = game.getActiveBetsList();

  return NextResponse.json({
    round: info,
    activeBets,
  });
}
