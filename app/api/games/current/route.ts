import { NextResponse } from 'next/server';
import { GameEngine } from '@/game-engine/GameEngine';

export async function GET() {
  const game = GameEngine.getInstance();
  game.ensureStarted();
  const info = game.getPublicRoundInfo();
  const activeBets = game.getActiveBetsList();
  const recentHistory = game.getRecentRounds();
  const adminPreview = game.getAdminRoundPreview();

  return NextResponse.json({
    round: info,
    activeBets,
    recentHistory,
    nextRound: adminPreview.nextRound,
    serverTime: Date.now(),
  });
}
