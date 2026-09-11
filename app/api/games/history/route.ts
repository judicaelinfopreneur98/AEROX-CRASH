import { NextResponse } from 'next/server';
import { GameEngine } from '@/game-engine/GameEngine';

export async function GET() {
  const game = GameEngine.getInstance();
  const history = game.getRecentRounds();

  return NextResponse.json({
    history,
  });
}
