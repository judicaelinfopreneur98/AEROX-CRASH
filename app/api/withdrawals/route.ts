import { NextResponse } from 'next/server';
import { getAuthSession } from '@/auth/session';
import { WalletEngine } from '@/wallet/WalletEngine';
import { SandboxPaymentProvider } from '@/lib/payment-provider';
import { AuthService } from '@/auth/AuthService';
import { withdrawalSchema } from '@/lib/validations';

const paymentProvider = new SandboxPaymentProvider();

export async function POST(request: Request) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const user = AuthService.getInstance().getUserById(session.id);
    if (!user || !user.isEmailVerified) {
      return NextResponse.json(
        { error: 'Vérification email obligatoire pour effectuer des retraits de fonds.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = withdrawalSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || 'Données de retrait invalides.' },
        { status: 400 }
      );
    }

    const { amount, destinationAccount } = validated.data;
    const userCurrency = user.currency || 'EUR';
    const idempotencyKey = `wth_${session.id}_${Date.now()}`;

    // Débit atomique du portefeuille
    const debitRes = await WalletEngine.getInstance().withdraw(
      session.id,
      amount,
      destinationAccount,
      idempotencyKey
    );

    if (!debitRes.success) {
      return NextResponse.json({ error: debitRes.error }, { status: 400 });
    }

    // Demande de virement auprès du prestataire
    const payout = await paymentProvider.createWithdrawal({
      userId: session.id,
      amount,
      currency: userCurrency,
      destinationAccount,
    });

    return NextResponse.json({
      success: true,
      message: `Retrait de ${amount} ${userCurrency} validé.`,
      newBalance: debitRes.data?.balance,
      payout,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur lors du retrait.' }, { status: 500 });
  }
}
