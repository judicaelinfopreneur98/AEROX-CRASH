'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../providers/AuthProvider';
import { X, Lock, Mail, User, AlertCircle, Coins } from 'lucide-react';

interface AuthModalProps {
  initialMode?: 'login' | 'register';
  onClose: () => void;
}

export function AuthModal({ initialMode = 'login', onClose }: AuthModalProps) {
  const router = useRouter();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currency, setCurrency] = useState<'FCFA' | 'EUR' | 'USD'>('EUR');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const bonusDisplay = {
    FCFA: '1 000 FCFA offerts',
    EUR: '1 000.00 € offerts',
    USD: '$1,000.00 offerts',
  }[currency];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const res = await login(email, password);
        if (!res.success) {
          setError(res.error || 'Identifiants invalides.');
        } else {
          onClose();
        }
      } else {
        const res = await register(username, email, password, currency);
        if (!res.success) {
          setError(res.error || 'Erreur d’inscription.');
        } else {
          onClose();
          router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
        }
      }
    } catch {
      setError('Erreur réseau ou serveur inaccessible.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#0E131F] border border-border w-full max-w-md max-h-[92vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        
        {/* HEADER & ONGLETS */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border flex items-center justify-between bg-surface/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center font-black text-primary text-xs shrink-0">
              AX
            </div>
            <div className="flex items-center bg-card p-0.5 rounded-xl border border-border text-xs">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  mode === 'login' ? 'bg-primary text-black font-bold shadow-sm' : 'text-gray-400 hover:text-white'
                }`}
              >
                Connexion
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(null); }}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  mode === 'register' ? 'bg-primary text-black font-bold shadow-sm' : 'text-gray-400 hover:text-white'
                }`}
              >
                Inscription
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 min-w-[36px] min-h-[36px] rounded-lg text-gray-400 hover:text-white hover:bg-card transition flex items-center justify-center"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORMULAIRE SCROLLABLE */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto">
          
          {error && (
            <div className="p-3 rounded-xl bg-crash/10 border border-crash/30 text-crash text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'register' && (
            <>
              {/* SÉLECTEUR DE DEVISE */}
              <div>
                <label className="text-xs font-semibold text-gray-300 uppercase block mb-1.5 font-mono flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-primary" />
                    Devise du compte
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">{bonusDisplay}</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {[
                    { id: 'FCFA', label: 'FCFA' },
                    { id: 'EUR', label: 'EUR (€)' },
                    { id: 'USD', label: 'USD ($)' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCurrency(item.id as any)}
                      className={`py-2 px-1 rounded-xl border text-center font-mono text-xs font-bold transition min-h-[38px] ${
                        currency === item.id
                          ? 'bg-primary/15 border-primary text-white shadow-sm shadow-primary/20'
                          : 'bg-card border-border text-gray-400 hover:text-white'
                      }`}
                    >
                      {item.label}
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
                    className="w-full bg-card border border-border focus:border-primary rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-white text-sm focus:outline-none transition"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-300 uppercase block mb-1.5 font-mono">
              Adresse Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre.email@domaine.com"
                className="w-full bg-card border border-border focus:border-primary rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-white text-sm focus:outline-none transition"
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
                className="w-full bg-card border border-border focus:border-primary rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-white text-sm focus:outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[48px] mt-2 py-3 rounded-xl bg-primary text-black font-black text-sm uppercase tracking-wider hover:bg-primary-hover active:scale-98 transition shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center cursor-pointer"
          >
            {isLoading ? (
              <div className="w-5 h-5 rounded-full border-2 border-black/30 border-t-black animate-spin" />
            ) : mode === 'login' ? (
              'Se Connecter'
            ) : (
              `Créer mon Compte (${bonusDisplay})`
            )}
          </button>

        </form>

      </div>
    </div>
  );
}
