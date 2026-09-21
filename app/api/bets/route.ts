import { NextResponse } from 'next/server';
import { getAuthSession } from '@/auth/session';
import { supabaseWalletService } from '@/wallet/SupabaseWalletService';
import { AuthService } from '@/auth/AuthService';
import { placeBetSchema } from '@/lib/validations';
import { GameEngine } from '@/game-engine/GameEngine';

export async function POST(request: Request) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const user = await AuthService.getInstance().getUserByIdAsync(session.id);
    if (!user || !user.isEmailVerified) {
      return NextResponse.json(
        { error: 'Veuillez vérifier votre adresse email avant de pouvoir placer des mises en argent réel.' },
        { status: 403 }
      );
    }

    if (user.isSuspended) {
      return NextResponse.json(
        { error: 'Votre compte est suspendu par un administrateur.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = placeBetSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || 'Paramètres de mise invalides.' },
        { status: 400 }
      );
    }

    const { amount, panelIndex, autoCashout } = validated.data;
    const idempotencyKey = body.idempotencyKey || `bet_${session.id}_${panelIndex}_${Date.now()}`;

    // Transaction atomique dans Supabase (verrouillage de ligne PostgreSQL, déduction, création bet & transaction)
    const result = await supabaseWalletService.placeBetAtomic({
      userId: session.id,
      username: session.username,
      amount,
      panelIndex,
      autoCashout,
      idempotencyKey,
    });

    // Synchronisation avec le moteur temps réel s'il tourne sur ce processus
    try {
      const game = GameEngine.getInstance();
      game.registerExternalBet?.(result.bet as any);
    } catch {}

    return NextResponse.json({
      success: true,
      bet: result.bet,
      newBalance: result.newBalance,
    }, { status: 201 });
  } catch (err: any) {
    const msg = err.message || 'Erreur lors du placement de la mise.';
    const status = msg.includes('Solde insuffisant') ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function GET(request: Request) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const bets = await supabaseWalletService.getUserActiveBets(session.id);
    return NextResponse.json({ bets }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur.' }, { status: 500 });
  }
}
