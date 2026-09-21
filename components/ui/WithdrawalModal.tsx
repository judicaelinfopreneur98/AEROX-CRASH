'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../providers/AuthProvider';
import { X, ArrowUpRight, Check, AlertCircle, Lock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface WithdrawalModalProps {
  onClose: () => void;
}

export function WithdrawalModal({ onClose }: WithdrawalModalProps) {
  const { currency, isEmailVerified, user, balance, refreshBalance } = useAuth();
  const isFcfa = currency === 'FCFA';

  const [amount, setAmount] = useState<number>(isFcfa ? 5000 : 20);
  const [destinationAccount, setDestinationAccount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailVerified) {
      setErrorMsg('Vérification email obligatoire avant d\'effectuer un retrait.');
      return;
    }

    if (amount > balance) {
      setErrorMsg('Montant supérieur à votre solde disponible.');
      return;
    }

    if (!destinationAccount.trim()) {
      setErrorMsg('Veuillez indiquer un compte de destination (IBAN, Numéro Mobile Money ou Wallet Crypto).');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const token = localStorage.getItem('aerox_jwt');
    if (!token) {
      setErrorMsg('Session expirée. Veuillez vous reconnecter.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount,
          destinationAccount: destinationAccount.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Erreur lors du traitement du retrait.');
      } else {
        setSuccessMsg(data.message || 'Demande de retrait enregistrée avec succès !');
        await refreshBalance();
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch {
      setErrorMsg('Erreur de communication avec le serveur.');
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
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Retirer des Fonds</h3>
              <p className="text-[11px] sm:text-xs text-gray-400">Disponible : {formatCurrency(balance, currency)}</p>
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

        {/* CONTENT */}
        <div className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto">
          
          {/* AVERTISSEMENT EMAIL NON VÉRIFIÉ */}
          {!isEmailVerified && (
            <div className="p-3.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0 text-yellow-400" />
                <span className="font-bold">Email non vérifié : retraits verrouillés</span>
              </div>
              <p className="text-gray-300 text-[11px]">
                Pour prévenir toute fraude financière, vos retraits sont débloqués dès confirmation de votre adresse email.
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

          <form onSubmit={handleWithdrawal} className="space-y-3.5 sm:space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-300 uppercase block mb-1.5 font-mono">
                Montant à retirer ({currency})
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold font-mono text-xs">
                  {isFcfa ? 'FCFA' : currency === 'USD' ? '$' : '€'}
                </span>
                <input
                  type="number"
                  min={isFcfa ? 1000 : 10}
                  max={Math.min(isFcfa ? 50000000 : 50000, balance)}
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  disabled={!isEmailVerified}
                  className="w-full bg-card border border-border focus:border-primary rounded-xl pl-12 pr-4 py-2.5 sm:py-3 text-white font-mono font-bold text-base sm:text-lg focus:outline-none transition disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 uppercase block mb-1.5 font-mono">
                {isFcfa ? 'Numéro Mobile Money (Wave / Orange / MTN)' : 'Compte de destination (IBAN / Crypto)'}
              </label>
              <input
                type="text"
                required
                value={destinationAccount}
                onChange={(e) => setDestinationAccount(e.target.value)}
                placeholder={isFcfa ? '+225 07 00 00 00 00' : 'FR76 ... ou 0x...'}
                disabled={!isEmailVerified}
                className="w-full bg-card border border-border focus:border-primary rounded-xl px-4 py-2.5 sm:py-3 text-white text-sm focus:outline-none transition disabled:opacity-50 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !isEmailVerified || balance <= 0}
              className="w-full min-h-[48px] mt-2 py-3 rounded-xl bg-primary text-black font-black text-sm uppercase tracking-wider hover:bg-primary-hover active:scale-98 transition flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-40"
            >
              {isLoading ? (
                <div className="w-5 h-5 rounded-full border-2 border-black/30 border-t-black animate-spin" />
              ) : (
                <>
                  <span>Retirer {formatCurrency(amount, currency)}</span>
                  <ArrowUpRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
