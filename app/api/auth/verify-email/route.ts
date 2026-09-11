import { NextResponse } from 'next/server';
import { AuthService } from '@/auth/AuthService';
import { verifyEmailSchema } from '@/lib/validations';

export async function POST(request: Request) {
  try {
    const auth = AuthService.getInstance();
    const body = await request.json();

    const validated = verifyEmailSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || 'Code invalide.' },
        { status: 400 }
      );
    }

    let emailOrUserId = validated.data.email;

    // Si l'email n'est pas fourni dans le body, vérifier le header Authorization
    if (!emailOrUserId) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const user = auth.verifyToken(token);
        if (user) {
          emailOrUserId = user.email;
        }
      }
    }

    if (!emailOrUserId) {
      return NextResponse.json(
        { error: 'Email ou utilisateur non spécifié.' },
        { status: 400 }
      );
    }

    const result = await auth.verifyEmailCode(emailOrUserId, validated.data.code);
    return NextResponse.json({
      success: true,
      message: 'Adresse email vérifiée avec succès !',
      user: result.user,
      token: result.token,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Échec de la vérification de l\'email.' },
      { status: 400 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const email = url.searchParams.get('email');

    if (url.searchParams.get('get_code') === 'true' && email) {
      const auth = AuthService.getInstance();
      const allUsers = auth.getAllUsers();
      const user = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      return NextResponse.json({
        email: user?.email,
        code: user?.verificationCode,
        isEmailVerified: user?.isEmailVerified
      });
    }

    if (!token) {
      return NextResponse.json({ error: 'Jeton de vérification manquant.' }, { status: 400 });
    }

    const auth = AuthService.getInstance();
    const result = await auth.verifyEmailToken(token);

    // Rediriger vers la page de vérification avec succès
    const redirectUrl = new URL('/auth/verify-email?verified=true', request.url);
    return NextResponse.redirect(redirectUrl);
  } catch (err: any) {
    const errorUrl = new URL(`/auth/verify-email?error=${encodeURIComponent(err.message || 'Lien invalide')}`, request.url);
    return NextResponse.redirect(errorUrl);
  }
}
