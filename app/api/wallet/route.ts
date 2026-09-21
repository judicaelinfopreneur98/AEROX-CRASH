import { NextResponse } from 'next/server';
import { getAuthSession } from '@/auth/session';
import { supabaseWalletService } from '@/wallet/SupabaseWalletService';

export async function GET(request: Request) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const wallet = await supabaseWalletService.getUserBalance(session.id);
    return NextResponse.json(wallet, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur.' }, { status: 500 });
  }
}
