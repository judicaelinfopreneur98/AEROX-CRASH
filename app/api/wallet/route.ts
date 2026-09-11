import { NextResponse } from 'next/server';
import { getAuthSession } from '@/auth/session';
import { WalletEngine } from '@/wallet/WalletEngine';

export async function GET(request: Request) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  const result = await WalletEngine.getInstance().getBalance(session.id);
  return NextResponse.json(result.data, { status: 200 });
}
