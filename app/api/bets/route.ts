import { NextResponse } from 'next/server';
import { getAuthSession } from '@/auth/session';
import { GameEngine } from '@/game-engine/GameEngine';
import { WalletEngine } from '@/wallet/WalletEngine';
import { AuthService } from '@/auth/AuthService';
import { placeBetSchema } from '@/lib/validations';

export async function POST(request: Request) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const user = AuthService.getInstance().getUserById(session.id);
    if (!user || !user.isEmailVerified) {
      return NextResponse.json(
        { error: 'Veuillez vérifier votre adresse email avant de pouvoir placer des mises en argent réel.' },
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
    const game = GameEngine.getInstance();

    const res = await game.placeBet(
      session.id,
      session.username,
      amount,
      panelIndex,
      autoCashout
    );

    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, bet: res.bet }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  const bets = WalletEngine.getInstance().getUserBets(session.id);
  return NextResponse.json({ bets }, { status: 200 });
}
