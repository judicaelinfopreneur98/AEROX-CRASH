import { NextResponse } from 'next/server';
import { getAuthSession } from '@/auth/session';
import { canAccessAdmin } from '@/auth/rbac';
import { AuthService } from '@/auth/AuthService';
import { WalletEngine } from '@/wallet/WalletEngine';

export async function GET(request: Request) {
  const session = getAuthSession(request);
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: 'Accès administrateur refusé.' }, { status: 403 });
  }

  const auth = AuthService.getInstance();
  const wallet = WalletEngine.getInstance();
  const users = auth.getAllUsers();

  const usersWithBalances = await Promise.all(
    users.map(async (u) => {
      const bal = await wallet.getBalance(u.id);
      return {
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        currency: u.currency || 'EUR',
        isEmailVerified: u.isEmailVerified ?? false,
        isSuspended: u.isSuspended,
        createdAt: u.createdAt,
        balance: bal.data?.balance || 0,
      };
    })
  );

  return NextResponse.json({ users: usersWithBalances }, { status: 200 });
}
