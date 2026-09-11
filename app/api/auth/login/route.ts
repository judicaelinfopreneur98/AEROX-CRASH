import { NextResponse } from 'next/server';
import { AuthService } from '@/auth/AuthService';
import { loginSchema } from '@/lib/validations';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = loginSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || 'Données invalides.' },
        { status: 400 }
      );
    }

    const auth = AuthService.getInstance();
    const tokens = await auth.login(validated.data.email, validated.data.password);

    return NextResponse.json(tokens, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Identifiants invalides.' }, { status: 401 });
  }
}
