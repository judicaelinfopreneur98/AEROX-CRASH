import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/providers/AuthProvider';

export const metadata: Metadata = {
  title: 'AEROX CRASH | Quantum Velocity - Jeu Multiplicateur Temps Réel',
  description:
    'Plateforme temps réel autoritaire de jeu Crash avec technologie Provably Fair, double pari simultané, et portefeuille transactionnel sécurisé.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#080B10',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark overflow-x-hidden">
      <body className="min-h-screen bg-[#080B10] text-gray-100 antialiased selection:bg-primary/30 selection:text-white overflow-x-hidden pb-[env(safe-area-inset-bottom)]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
