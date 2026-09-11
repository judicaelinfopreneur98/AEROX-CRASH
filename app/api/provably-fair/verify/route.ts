import { NextResponse } from 'next/server';
import { verifyProvablyFair } from '@/lib/provably-fair';
import { provablyFairVerifySchema } from '@/lib/validations';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = provablyFairVerifySchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || 'Données de vérification invalides.' },
        { status: 400 }
      );
    }

    const { serverSeed, serverSeedHash, clientSeed, nonce, expectedCrashPoint } = validated.data;
    const result = verifyProvablyFair(
      serverSeed,
      serverSeedHash,
      clientSeed,
      nonce,
      expectedCrashPoint
    );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur de calcul.' }, { status: 500 });
  }
}
