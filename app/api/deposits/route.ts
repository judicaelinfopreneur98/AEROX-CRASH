import { NextResponse } from 'next/server';
import { getAuthSession } from '@/auth/session';
import { WalletEngine } from '@/wallet/WalletEngine';
import { SandboxPaymentProvider } from '@/lib/payment-provider';
import { AuthService } from '@/auth/AuthService';
import { depositSchema } from '@/lib/validations';

const paymentProvider = new SandboxPaymentProvider();

export async function POST(request: Request) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = depositSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || 'Montant invalide.' },
        { status: 400 }
      );
    }

    const user = AuthService.getInstance().getUserById(session.id);
    if (!user || !user.isEmailVerified) {
      return NextResponse.json(
        { error: 'Vérification email obligatoire pour effectuer des dépôts en argent réel.' },
        { status: 403 }
      );
    }

    const { amount } = validated.data;
    const userCurrency = user.currency || 'EUR';

    // Démarre l'intention de dépôt via l'abstraction de paiement
    const paymentIntent = await paymentProvider.createDeposit({
      userId: session.id,
      amount,
      currency: userCurrency,
    });

    // En environnement sandbox, on finalise et crédite directement le portefeuille
    const idempotencyKey = `dep_${paymentIntent.paymentId}`;
    const creditRes = await WalletEngine.getInstance().deposit(session.id, amount, idempotencyKey);

    if (!creditRes.success) {
      return NextResponse.json({ error: creditRes.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `${amount} ${userCurrency} crédités sur votre portefeuille avec succès.`,
      newBalance: creditRes.data?.balance,
      paymentIntent,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur lors du dépôt.' }, { status: 500 });
  }
}
