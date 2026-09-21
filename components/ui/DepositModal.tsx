'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../providers/AuthProvider';
import { X, CreditCard, ShieldCheck, Check, AlertCircle, ArrowRight, Lock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface DepositModalProps {
  onClose: () => void;
}

export function DepositModal({ onClose }: DepositModalProps) {
  const { currency, isEmailVerified, user, refreshBalance } = useAuth();
  const isFcfa = currency === 'FCFA';

  const presets = isFcfa
    ? [500, 1000, 2500, 5000, 10000]
    : [20, 50, 100, 250, 500];

  const [amount, setAmount] = useState<number>(isFcfa ? 1000 : 50);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setAmount(isFcfa ? 1000 : 50);
  }, [isFcfa]);

  const handleDeposit = async () => {
    if (!isEmailVerified) {
      setErrorMsg('Veuillez vérifier votre adresse email avant d’effectuer un dépôt.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const token = localStorage.getItem('aerox_jwt');
    if (!token) {
      setErrorMsg('Vous devez être connecté pour créditer votre compte.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/deposits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Erreur lors du traitement du dépôt.');
      } else {
        setSuccessMsg(data.message || 'Dépôt crédité avec succès !');
        await refreshBalance();
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch {
      setErrorMsg('Connexion impossible au serveur de paiement.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#0E131F] border border-border w-full max-w-md max-h-[92vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border flex items-center justify-between bg-surface/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Recharger le Portefeuille</h3>
              <p className="text-[11px] sm:text-xs text-gray-400">Passerelle sécurisée ({currency})</p>
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

        {/* CONTENT (Scrollable for Virtual Keyboards) */}
        <div className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto">
          
          {/* AVERTISSEMENT EMAIL NON VÉRIFIÉ */}
          {!isEmailVerified && (
            <div className="p-3.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0 text-yellow-400" />
                <span className="font-bold">Email non vérifié : dépôts verrouillés</span>
              </div>
              <p className="text-gray-300 text-[11px]">
                Pour des raisons de conformité et de sécurité, confirmez votre email avant de recharger votre solde réel.
              </p>
              <Link
                href={`/auth/verify-email?email=${encodeURIComponent(user?.email || '')}`}
                onClick={onClose}
                className="self-start px-3 py-1.5 rounded-lg bg-yellow-400 text-black font-bold text-xs hover:bg-yellow-300 transition"
              >
                Vérifier mon email →
              </Link>
            </div>
          )}

          {/* SANDBOX BANNER */}
          <div className="p-3 rounded-xl bg-card border border-border flex items-start gap-2.5 text-xs text-gray-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <p>
              Passerelle de paiement sécurisée (<span className="text-emerald-400 font-semibold">Mode Sandbox Immédiat</span>). Crédit instantané sur votre solde.
            </p>
          </div>

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-crash/10 border border-crash/30 text-crash text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-crash" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* MONTANTS RAPIDES */}
          <div>
            <label className="text-xs font-semibold text-gray-300 uppercase block mb-2 font-mono">
              Montant à déposer ({currency})
            </label>
            <div className="grid grid-cols-3 xs:grid-cols-5 gap-1.5 sm:gap-2 mb-3">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(p)}
                  className={`py-2 px-1 rounded-xl text-xs font-mono font-bold border transition text-center min-h-[38px] ${
                    amount === p
                      ? 'bg-primary text-black border-primary'
                      : 'bg-card border-border text-gray-300 hover:border-gray-500'
                  }`}
                >
                  {isFcfa ? (p >= 1000 ? `${p / 1000}k` : `${p}`) : `${p} ${currency === 'USD' ? '$' : '€'}`}
                </button>
              ))}
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold font-mono text-xs">
                {isFcfa ? 'FCFA' : currency === 'USD' ? '$' : '€'}
              </span>
              <input
                type="number"
                min={isFcfa ? 500 : 5}
                max={isFcfa ? 50000000 : 5000}
                step={isFcfa ? 500 : 5}
                value={amount}
                onChange={(e) => setAmount(Math.max(isFcfa ? 500 : 5, parseFloat(e.target.value) || 0))}
                disabled={!isEmailVerified}
                className="w-full bg-card border border-border focus:border-primary rounded-xl pl-12 pr-4 py-2.5 sm:py-3 text-white font-mono font-bold text-base sm:text-lg focus:outline-none transition disabled:opacity-50"
              />
            </div>
          </div>

          {/* BOUTON CONFIRMATION TACTILE */}
          <button
            onClick={handleDeposit}
            disabled={isLoading || !isEmailVerified}
            className="w-full min-h-[48px] py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-black text-sm uppercase tracking-wider hover:brightness-110 active:scale-98 transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-40"
          >
            {isLoading ? (
              <div className="w-5 h-5 rounded-full border-2 border-black/30 border-t-black animate-spin" />
            ) : (
              <>
                <span>Créditer {formatCurrency(amount, currency)}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

        </div>
      </div>
    </div>
  );
}
