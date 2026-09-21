import { NextResponse } from 'next/server';
import { AuthService } from '@/auth/AuthService';
import { registerSchema } from '@/lib/validations';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = registerSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || 'Données invalides.' },
        { status: 400 }
      );
    }

    const auth = AuthService.getInstance();
    const result = await auth.register(
      validated.data.username,
      validated.data.email,
      validated.data.password,
      validated.data.currency
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Compte créé avec succès. Veuillez vérifier votre adresse email.',
        user: result.user,
        token: result.token,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur.' }, { status: 400 });
  }
}
