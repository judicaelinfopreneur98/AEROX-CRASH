import { NextResponse } from 'next/server';
import { getAuthSession } from '@/auth/session';
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

  const game = GameEngine.getInstance();
  const res = await game.cashOut(session.id, betId);

  if (!res.success) {
    return NextResponse.json({ error: res.error }, { status: 400 });
  }

  return NextResponse.json(res, { status: 200 });
}
