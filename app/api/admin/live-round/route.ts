import { NextResponse } from 'next/server';
import { getAuthSession } from '@/auth/session';
import { canAccessAdmin } from '@/auth/rbac';
import { GameEngine } from '@/game-engine/GameEngine';

export async function GET(request: Request) {
  const session = getAuthSession(request);
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: 'Accès administrateur refusé.' }, { status: 403 });
  }

  const engine = GameEngine.getInstance();
  const preview = engine.getAdminRoundPreview();

  return NextResponse.json({ preview }, { status: 200 });
}
