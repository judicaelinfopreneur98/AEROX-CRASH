import { NextResponse } from 'next/server';
import { supabaseGameService } from '@/game-engine/SupabaseGameService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const gameState = await supabaseGameService.getLiveGameState();
    return NextResponse.json(gameState, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    console.error('[API /api/games/current] Erreur:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}

