import { NextResponse } from 'next/server';
import { getAuthSession } from '@/auth/session';
import { canAccessAdmin } from '@/auth/rbac';
import { AdminService } from '@/admin/AdminService';

export async function GET(request: Request) {
  const session = getAuthSession(request);
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: 'Accès administrateur refusé.' }, { status: 403 });
  }

  const logs = AdminService.getInstance().getAuditLogs();
  return NextResponse.json({ logs }, { status: 200 });
}
