'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Navbar } from '@/components/layout/Navbar';
import { Lock, Mail, User, AlertCircle, ArrowRight, Sparkles, Coins } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currency, setCurrency] = useState<'FCFA' | 'EUR' | 'USD'>('EUR');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const bonusDisplay = {
    FCFA: '1 000 FCFA offerts',
    EUR: '1 000.00 € offerts',
    USD: '$1,000.00 offerts',
  }[currency];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await register(username, email, password, currency);
      if (!res.success) {
        setError(res.error || 'Erreur lors de l’inscription.');
      } else {
        router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
      }
    } catch {
      setError('Impossible de joindre le serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080B10] text-gray-100 flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-[#0E131F] border border-border w-full max-w-md rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              {bonusDisplay}
            </div>
            <h1 className="text-2xl font-black text-white">Inscription Pilote</h1>
            <p className="text-xs text-gray-400">Rejoignez l'arène temps réel AEROX CRASH</p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-crash/10 border border-crash/30 text-crash text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* CHOIX DE DEVISE */}
            <div>
              <label className="text-xs font-semibold text-gray-300 uppercase block mb-1.5 font-mono flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-primary" />
                Devise de votre Compte
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'FCFA', label: 'FCFA', sub: 'Afrique' },
                  { id: 'EUR', label: 'EUR (€)', sub: 'Europe' },
                  { id: 'USD', label: 'USD ($)', sub: 'International' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrency(item.id as any)}
                    className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                      currency === item.id
                        ? 'bg-primary/15 border-primary text-white shadow-sm shadow-primary/20'
                        : 'bg-card border-border text-gray-400 hover:text-white hover:border-gray-700'
                    }`}
                  >
                    <span className="text-xs font-bold font-mono">{item.label}</span>
                    <span className="text-[10px] text-gray-500">{item.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 uppercase block mb-1.5 font-mono">
                Pseudo Pilote
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ex: AeroAce"
                  className="w-full bg-card border border-border focus:border-primary rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none transition"
                />
              </div>
            </div>

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
              className="w-full mt-2 py-3 rounded-xl bg-primary text-black font-black text-sm uppercase tracking-wider hover:bg-primary-hover active:scale-98 transition shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-black/30 border-t-black animate-spin" />
              ) : (
                <>
                  <span>Créer mon Compte</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-border">
            <p className="text-xs text-gray-400">
              Déjà un compte ?{' '}
              <Link href="/auth/login" className="text-primary hover:underline font-bold">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
