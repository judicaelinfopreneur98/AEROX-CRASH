import { NextResponse } from 'next/server';
import { getAuthSession } from '@/auth/session';
import { supabaseWalletService } from '@/wallet/SupabaseWalletService';
import { GameEngine } from '@/game-engine/GameEngine';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  const betId = params.id;
  if (!betId) {
    return NextResponse.json({ error: 'Identifiant de mise manquant.' }, { status: 400 });
  }

  try {
    let multiplier = 1.00;
    let idempotencyKey: string | undefined;

    // Lecture du corps de la requête s'il est fourni
    try {
      const body = await request.json();
      if (body.multiplier && typeof body.multiplier === 'number') {
        multiplier = Math.max(1.00, body.multiplier);
      }
      if (body.idempotencyKey) {
        idempotencyKey = body.idempotencyKey;
      }
    } catch {
      // Si pas de body json fourni, vérifier si le moteur serveur local a un multiplicateur en cours
      try {
        const game = GameEngine.getInstance();
        if (game.getStatus() === 'RUNNING') {
          multiplier = game.getCurrentMultiplier();
        }
      } catch {}
    }

    // Exécution de la transaction atomique sous Supabase (verrouillage de ligne, anti-double cashout, crédit wallet)
    const result = await supabaseWalletService.cashOutBetAtomic({
      userId: session.id,
      betId,
      multiplier,
      idempotencyKey,
    });

    // Synchronisation avec GameEngine si actif en local
    try {
      const game = GameEngine.getInstance();
      game.registerExternalCashout?.(betId, result.multiplier, result.profit);
    } catch {}

    return NextResponse.json({
      success: true,
      bet: result.bet,
      payout: result.winAmount,
      profit: result.profit,
      multiplier: result.multiplier,
      newBalance: result.newBalance,
    }, { status: 200 });
  } catch (err: any) {
    const errorMsg = err.message || 'Erreur lors du cashout.';
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
