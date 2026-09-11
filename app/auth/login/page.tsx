'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Navbar } from '@/components/layout/Navbar';
import { Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await login(email, password);
      if (!res.success) {
        setError(res.error || 'Identifiants invalides.');
      } else {
        router.push('/');
      }
    } catch {
      setError('Impossible de joindre le serveur.');
    } finally {
      setLoading(false);
    }
  };

  const setPreset = (type: 'demo' | 'admin') => {
    if (type === 'demo') {
      setEmail('demo@aerox.io');
      setPassword('Demo123!');
    } else {
      setEmail('admin@aerox.io');
      setPassword('Admin123!');
    }
  };

  return (
    <div className="min-h-screen bg-[#080B10] text-gray-100 flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-[#0E131F] border border-border w-full max-w-md rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black text-white">Connexion Pilote</h1>
            <p className="text-xs text-gray-400">Accédez à votre cockpit et à vos fonds sécurisés</p>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setPreset('demo')}
              className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 font-bold transition"
            >
              Joueur Démo
            </button>
            <button
              type="button"
              onClick={() => setPreset('admin')}
              className="px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 font-bold transition"
            >
              Compte Admin
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-crash/10 border border-crash/30 text-crash text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-300 uppercase block mb-1.5 font-mono">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pilote@aerox.io"
                  className="w-full bg-card border border-border focus:border-primary rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 uppercase block mb-1.5 font-mono">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-card border border-border focus:border-primary rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-black font-black text-sm uppercase tracking-wider hover:bg-primary-hover active:scale-98 transition shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-black/30 border-t-black animate-spin" />
              ) : (
                <>
                  <span>Ouvrir Cockpit</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-gray-400">
            Nouveau pilote ?{' '}
            <Link href="/auth/register" className="text-primary hover:underline font-bold">
              Créer un compte
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
