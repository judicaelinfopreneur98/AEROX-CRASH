'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Navbar } from '@/components/layout/Navbar';
import { ShieldCheck, ArrowRight, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isEmailVerified, verifyEmail, resendVerification, refreshUser } = useAuth();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const verifiedParam = searchParams.get('verified') === 'true';
  const errorParam = searchParams.get('error');
  const emailParam = searchParams.get('email') || user?.email || '';

  useEffect(() => {
    if (verifiedParam) {
      refreshUser();
    }
  }, [verifiedParam, refreshUser]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      setError('Veuillez saisir le code à 6 chiffres.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await verifyEmail(code.trim());
      if (res.success) {
        setSuccessMsg('Email vérifié avec succès ! Redirection vers l\'arène...');
        setTimeout(() => {
          router.push('/');
        }, 1200);
      } else {
        setError(res.error || 'Code incorrect ou expiré.');
      }
    } catch {
      setError('Erreur de communication avec le serveur.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      const res = await resendVerification();
      if (res.success) {
        setSuccessMsg('Un nouveau code de sécurité vous a été envoyé par email !');
        setCountdown(60);
      } else {
        setError(res.error || 'Échec de renvoi du code.');
      }
    } catch {
      setError('Erreur lors de la tentative de renvoi.');
    } finally {
      setResending(false);
    }
  };

  const isAlreadyVerified = isEmailVerified || verifiedParam;

  return (
    <div className="flex-1 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#0E131F] border border-border w-full max-w-md rounded-2xl p-5 sm:p-8 shadow-2xl space-y-4 sm:space-y-6">
        
        {/* EN-TÊTE */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto text-primary shadow-lg shadow-primary/20">
            {isAlreadyVerified ? (
              <CheckCircle2 className="w-9 h-9 text-emerald-400" />
            ) : (
              <ShieldCheck className="w-9 h-9 text-primary" />
            )}
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {isAlreadyVerified ? 'Compte Vérifié !' : 'Vérification Email'}
          </h1>
          <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
            {isAlreadyVerified
              ? 'Votre compte est pleinement actif. Vous avez accès à tous les dépôts, retraits et mises.'
              : `Saisissez le code à 6 chiffres envoyé à votre adresse email${emailParam ? ` (${emailParam})` : ''}.`}
          </p>
        </div>

        {/* MESSAGES D'ERREUR OU SUCCÈS */}
        {errorParam && (
          <div className="p-3 rounded-xl bg-crash/10 border border-crash/30 text-crash text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorParam}</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-crash/10 border border-crash/30 text-crash text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {isAlreadyVerified ? (
          <button
            onClick={() => router.push('/')}
            className="w-full min-h-[48px] py-3 rounded-xl bg-primary text-black font-black text-sm uppercase tracking-wider hover:bg-primary-hover active:scale-98 transition shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Accéder à l'Arène de Jeu</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-300 uppercase block mb-2 font-mono text-center tracking-wider">
                CODE DE SÉCURITÉ (6 CHIFFRES)
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                className="w-full bg-card border border-border focus:border-primary rounded-xl py-3.5 text-center text-2xl font-mono font-bold tracking-[0.4em] text-white focus:outline-none transition shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className="w-full min-h-[50px] py-3.5 rounded-xl bg-primary text-black font-black text-sm uppercase tracking-wider hover:bg-primary-hover active:scale-98 transition shadow-lg shadow-primary/20 disabled:opacity-40 flex items-center justify-center cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 rounded-full border-2 border-black/30 border-t-black animate-spin" />
              ) : (
                'VALIDER MON COMPTE'
              )}
            </button>

            {/* RENVOYER LE CODE */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={countdown > 0 || resending}
                className="text-xs text-gray-400 hover:text-primary transition inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                <span>
                  {countdown > 0
                    ? `Renvoyer un nouveau code dans (${countdown}s)`
                    : "Vous n'avez pas reçu le code ? Renvoyer"}
                </span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-[#080B10] text-gray-100 flex flex-col">
      <Navbar />
      <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" /></div>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
