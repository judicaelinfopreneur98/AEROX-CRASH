import { NextResponse } from 'next/server';
import { getAuthSession } from '@/auth/session';
import { WalletEngine } from '@/wallet/WalletEngine';

export async function GET(request: Request) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  const transactions = await WalletEngine.getInstance().getUserTransactions(session.id, 50);
  return NextResponse.json({ transactions }, { status: 200 });
}
