import { NextResponse } from 'next/server';
import { getAuthSession } from '@/auth/session';
import { AuthService } from '@/auth/AuthService';
import { WalletEngine } from '@/wallet/WalletEngine';

export async function GET(request: Request) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  const user = AuthService.getInstance().getUserById(session.id);
  if (!user) {
    return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });
  }

  const walletRes = await WalletEngine.getInstance().getBalance(session.id);

  return NextResponse.json({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    currency: user.currency || 'EUR',
    isEmailVerified: user.isEmailVerified ?? false,
    isSuspended: user.isSuspended,
    balance: walletRes.data?.balance || 0,
    lockedBalance: walletRes.data?.lockedBalance || 0,
  });
}
