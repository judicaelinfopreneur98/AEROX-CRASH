import { NextResponse } from 'next/server';

export async function POST() {
  // Déconnexion côté client en purgeant le token JWT
  return NextResponse.json({ success: true, message: 'Déconnexion réussie.' }, { status: 200 });
}
