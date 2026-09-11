import { NextResponse } from 'next/server';
import { getAuthSession } from '@/auth/session';
import { canAdjustBalance } from '@/auth/rbac';
import { AdminService } from '@/admin/AdminService';

export async function POST(request: Request) {
  const session = getAuthSession(request);
  if (!session || !canAdjustBalance(session.role)) {
    return NextResponse.json({ error: 'Permission refusée (SUPER_ADMIN requis).' }, { status: 403 });
  }

  try {
    const { userId, amount, reason } = await request.json();
    if (!userId || typeof amount !== 'number' || !reason) {
      return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 });
    }

    const res = await AdminService.getInstance().adjustUserBalance(
      session.id,
      session.username,
      userId,
      amount,
      reason
    );

    return NextResponse.json({ success: true, result: res }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur.' }, { status: 500 });
  }
}
