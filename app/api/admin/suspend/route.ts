import { NextResponse } from 'next/server';
import { getAuthSession } from '@/auth/session';
import { canManageUsers } from '@/auth/rbac';
import { AdminService } from '@/admin/AdminService';

export async function POST(request: Request) {
  const session = getAuthSession(request);
  if (!session || !canManageUsers(session.role)) {
    return NextResponse.json({ error: 'Permission refusée (ADMIN requis).' }, { status: 403 });
  }

  try {
    const { userId, isSuspended, reason } = await request.json();
    if (!userId || typeof isSuspended !== 'boolean' || !reason) {
      return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 });
    }

    const success = await AdminService.getInstance().setUserSuspended(
      session.id,
      session.username,
      userId,
      isSuspended,
      reason
    );

    return NextResponse.json({ success }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur.' }, { status: 500 });
  }
}
