import { NextResponse } from 'next/server';
import { AuthService } from '@/auth/AuthService';
import { resendVerificationSchema } from '@/lib/validations';

export async function POST(request: Request) {
  try {
    const auth = AuthService.getInstance();
    let email: string | undefined;

    try {
      const body = await request.json();
      const validated = resendVerificationSchema.safeParse(body);
      if (validated.success) {
        email = validated.data.email;
      }
    } catch {
      // Body vide ou non JSON, vérification via JWT ci-dessous
    }

    if (!email) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const user = auth.verifyToken(token);
        if (user) {
          email = user.email;
        }
      }
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Adresse email requise pour renvoyer le code.' },
        { status: 400 }
      );
    }

    const result = await auth.resendVerification(email);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erreur lors de l\'envoi du code de vérification.' },
      { status: 400 }
    );
  }
}
