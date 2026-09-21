import { NextResponse } from 'next/server';
import { getAuthSession } from '@/auth/session';
import { AuthService } from '@/auth/AuthService';
import { supabaseWalletService } from '@/wallet/SupabaseWalletService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const user = await AuthService.getInstance().getUserByIdAsync(session.id);
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });
    }

    // Récupération du solde réel directement dans Supabase
    const wallet = await supabaseWalletService.getUserBalance(session.id);

    return NextResponse.json(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        currency: wallet.currency || user.currency || 'EUR',
        isEmailVerified: user.isEmailVerified === true,
        isSuspended: user.isSuspended,
        balance: wallet.balance,
        lockedBalance: wallet.lockedBalance,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur.' }, { status: 500 });
  }
}
