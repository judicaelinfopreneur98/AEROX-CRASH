'use client';

import React, { useState, useEffect } from 'react';
import { GameState, ActivePlayerBet } from '@/game-engine/types';
import { useAuth } from '../providers/AuthProvider';
import { socketClient } from '@/websocket/SocketClient';
import { soundManager } from '@/lib/sound';
import { formatCurrency } from '@/lib/utils';
import {
  Zap,
  Check,
  AlertCircle,
  HandCoins,
  Sliders,
  RotateCcw,
  XCircle,
  ArrowUpRight,
  TrendingDown,
  LogIn,
  Loader2,
} from 'lucide-react';

interface BetPanelProps {
  panelIndex: number; // 1 ou 2
  status: GameState;
  currentMultiplier: number;
  myActiveBet: ActivePlayerBet | null;
  currentRound?: any;
  onBetPlaced?: () => void;
  onOpenAuth?: (mode: 'login' | 'register') => void;
}

export function BetPanel({
  panelIndex,
  status,
  currentMultiplier,
  myActiveBet,
  currentRound,
  onBetPlaced,
  onOpenAuth,
}: BetPanelProps) {
  const { user, balance, currency, isEmailVerified, isLoading, refreshBalance, updateBalanceLocally } = useAuth();

  // Mode de gestion : 'manual' (Cash Out Manuel) ou 'auto' (Auto Cash-Out)
  const [betMode, setBetMode] = useState<'manual' | 'auto'>('manual');

  const isFcfa = currency === 'FCFA';
  const [amount, setAmount] = useState<number>(currency === 'FCFA' ? 100 : 10.0);
  const [autoCashoutValue, setAutoCashoutValue] = useState<number>(2.0);
  const [autoBetEnabled, setAutoBetEnabled] = useState<boolean>(false);
  const [isQueuedForNextRound, setIsQueuedForNextRound] = useState<boolean>(false);

  // Pari local actif (synchronisé avec myActiveBet ou réponse directe API)
  const [localBet, setLocalBet] = useState<ActivePlayerBet | null>(myActiveBet);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCashoutSubmitting, setIsCashoutSubmitting] = useState<boolean>(false);

  const effectiveBet = localBet || myActiveBet;

  const quickAmounts = isFcfa ? [50, 100, 200, 500, 1000, 2000] : [1, 2, 5, 10, 25, 50];

  useEffect(() => {
    if (currency === 'FCFA' && (amount < 50 || amount > 10000)) {
      setAmount(100);
    } else if (currency !== 'FCFA' && amount > 1000) {
      setAmount(10);
    }
  }, [currency]);

  // Synchronisation avec les mises serveur : ne jamais écraser un pari ACTIVE
  useEffect(() => {
    if (myActiveBet) {
      setLocalBet(myActiveBet);
    } else if (status === 'WAITING' || status === 'RESULT') {
      if (localBet && (localBet.status === 'CASHED_OUT' || localBet.status === 'LOST')) {
        setLocalBet(null);
      }
    }
  }, [myActiveBet, status, localBet]);

  // Si la manche s'écrase alors que le pari était encore actif : marquage en PERDU
  useEffect(() => {
    if ((status === 'CRASHED' || status === 'RESULT') && effectiveBet && effectiveBet.status === 'ACTIVE') {
      setLocalBet({
        ...effectiveBet,
        status: 'LOST',
        profit: -effectiveBet.amount,
      });
      refreshBalance();
    }
  }, [status, effectiveBet, refreshBalance]);

  // Gestion de la file d'attente pour la prochaine manche
  useEffect(() => {
    const canBetNow = status === 'BETTING' || status === 'WAITING';
    if (canBetNow && isQueuedForNextRound && !effectiveBet && !isSubmitting) {
      handlePlaceBet();
      setIsQueuedForNextRound(false);
    }
  }, [status, isQueuedForNextRound, effectiveBet, isSubmitting]);

  // Auto-Bet
  useEffect(() => {
    const canBetNow = status === 'BETTING' || status === 'WAITING';
    if (canBetNow && autoBetEnabled && !effectiveBet && !isQueuedForNextRound && !isSubmitting && user) {
      handlePlaceBet();
    }
  }, [status, autoBetEnabled, effectiveBet, isQueuedForNextRound, isSubmitting, user]);

  const handleAmountChange = (val: number) => {
    const minVal = isFcfa ? 100 : 0.1;
    const clamped = isFcfa ? Math.max(minVal, Math.round(val)) : Math.max(minVal, Number(val.toFixed(2)));
    setAmount(clamped);
    setErrorMessage(null);
  };

  const handleDouble = () => {
    handleAmountChange(amount * 2);
  };

  const handleHalf = () => {
    handleAmountChange(isFcfa ? Math.max(100, Math.round(amount / 2)) : Math.max(0.1, amount / 2));
  };

  const handleMax = () => {
    const maxLimit = isFcfa ? 5000000 : 1000;
    handleAmountChange(Math.min(maxLimit, balance));
  };

  // =========================================================================
  // ACTION : PLACER UNE MISE (DÉFALCATION SERVEUR DANS SUPABASE)
  // =========================================================================
  const handlePlaceBet = async () => {
    // Si non connecté, inviter à se connecter ou s'inscrire (pas de compte démo)
    if (!user) {
      if (onOpenAuth) {
        onOpenAuth('login');
      }
      return;
    }

    if (!isEmailVerified) {
      setErrorMessage('Action verrouillée : veuillez confirmer votre email pour parier.');
      return;
    }

    if (amount > balance) {
      setErrorMessage(`Solde insuffisant (${formatCurrency(balance, currency)} disponible).`);
      return;
    }

    // Protection anti double-clic
    if (isSubmitting) return;

    const canBetNow = status === 'BETTING' || status === 'WAITING';
    if (!canBetNow) {
      setIsQueuedForNextRound(true);
      setErrorMessage(null);
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    soundManager.playBetPlaced();

    const shouldUseAutoCo = betMode === 'auto';
    const autoCo = shouldUseAutoCo ? autoCashoutValue : null;
    const token = localStorage.getItem('aerox_jwt');

    try {
      const res = await fetch('/api/bets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount,
          panelIndex,
          autoCashout: autoCo,
          gameId: currentRound?.id,
          idempotencyKey: `bet_${user.id}_${panelIndex}_${Date.now()}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Erreur lors du placement de la mise.');
        await refreshBalance();
        return;
      }

      if (data.bet) {
        setLocalBet(data.bet);
        socketClient.notifyBetAccepted?.(data.bet);
      }
      if (typeof data.newBalance === 'number') {
        updateBalanceLocally(data.newBalance);
      }
      await refreshBalance();
      if (onBetPlaced) {
        onBetPlaced();
      }
    } catch (err: any) {
      setErrorMessage('Erreur réseau lors du placement du pari.');
      await refreshBalance();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBet = () => {
    if (isQueuedForNextRound) {
      setIsQueuedForNextRound(false);
    }
  };

  // =========================================================================
  // ACTION : CASH OUT MANUEL INSTANTANÉ (CRÉDIT SERVEUR DANS SUPABASE)
  // =========================================================================
  const handleCashOut = async () => {
    const targetBet = effectiveBet;
    if (!targetBet || targetBet.status !== 'ACTIVE' || isCashoutSubmitting) return;

    setIsCashoutSubmitting(true);
    soundManager.playCashoutSuccess();

    const mult = Number(currentMultiplier.toFixed(2));
    const token = localStorage.getItem('aerox_jwt');
    const targetBetId = targetBet.betId || (targetBet as any).id;

    try {
      const res = await fetch(`/api/bets/${targetBetId}/cashout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          multiplier: mult,
          idempotencyKey: `cashout_${targetBetId}_${Date.now()}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Erreur lors du cashout.');
        await refreshBalance();
        return;
      }

      const winAmount = data.payout || Number((targetBet.amount * mult).toFixed(2));
      const profitAmount = data.profit || Number((winAmount - targetBet.amount).toFixed(2));

      const cashedBet: ActivePlayerBet = {
        ...targetBet,
        status: 'CASHED_OUT',
        cashoutMultiplier: mult,
        profit: profitAmount,
      };
      setLocalBet(cashedBet);

      if (typeof data.newBalance === 'number') {
        updateBalanceLocally(data.newBalance);
      }

      socketClient.notifyCashoutSuccess?.({
        betId: targetBetId,
        multiplier: mult,
        profit: profitAmount,
      });

      await refreshBalance();
      if (onBetPlaced) {
        onBetPlaced();
      }
    } catch (err: any) {
      setErrorMessage('Erreur réseau lors de l\'encaissement.');
      await refreshBalance();
    } finally {
      setIsCashoutSubmitting(false);
    }
  };

  const liveWin = effectiveBet && effectiveBet.status === 'ACTIVE'
    ? Number((effectiveBet.amount * currentMultiplier).toFixed(2))
    : Number((amount * currentMultiplier).toFixed(2));

  const liveProfit = effectiveBet && effectiveBet.status === 'ACTIVE'
    ? Number((liveWin - effectiveBet.amount).toFixed(2))
    : Number((liveWin - amount).toFixed(2));

  return (
    <div className="bg-[#0E131F] border border-border/90 rounded-2xl p-3.5 sm:p-5 flex flex-col justify-between shadow-2xl relative overflow-hidden backdrop-blur-md">
      
      {/* 1. EN-TÊTE : ONGLETS MANUEL / AUTO & NOM DU PANNEAU */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 sm:pb-3 sm:mb-3 border-b border-border/70 gap-2">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${panelIndex === 1 ? 'bg-primary shadow-sm shadow-primary' : 'bg-accent shadow-sm shadow-accent'}`} />
          <span className="text-xs font-black font-mono tracking-wider text-white uppercase">
            PARI {panelIndex}
          </span>
        </div>

        <div className="flex items-center bg-card p-0.5 rounded-xl border border-border/80 text-xs">
          <button
            type="button"
            onClick={() => setBetMode('manual')}
            className={`px-2.5 sm:px-3 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
              betMode === 'manual'
                ? 'bg-primary text-black shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <HandCoins className="w-3.5 h-3.5" />
            <span>Manuel</span>
          </button>
          <button
            type="button"
            onClick={() => setBetMode('auto')}
            className={`px-2.5 sm:px-3 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
              betMode === 'auto'
                ? 'bg-primary text-black shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Auto</span>
          </button>
        </div>
      </div>

      {/* 2. CONFIGURATION MODE AUTO */}
      {betMode === 'auto' && (
        <div className="mb-2.5 p-2.5 rounded-xl bg-card/60 border border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs animate-in fade-in">
          <label className="flex items-center gap-1.5 text-gray-300 font-semibold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoBetEnabled}
              onChange={(e) => setAutoBetEnabled(e.target.checked)}
              className="w-4 h-4 accent-primary rounded cursor-pointer"
            />
            <span>Auto Pari</span>
          </label>

          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-medium text-[11px]">Auto Cash-Out :</span>
            <div className="flex items-center bg-surface border border-border rounded-lg px-2 py-0.5">
              <input
                type="number"
                step="0.1"
                min="1.01"
                max="1000"
                value={autoCashoutValue}
                onChange={(e) => setAutoCashoutValue(Math.max(1.01, parseFloat(e.target.value) || 1.01))}
                className="w-12 bg-transparent text-xs font-mono font-bold text-white text-right focus:outline-none"
              />
              <span className="text-xs text-primary font-bold ml-0.5">x</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. MESSAGE D'ERREUR */}
      {errorMessage && (
        <div className="mb-2 p-2.5 rounded-xl bg-crash/10 border border-crash/30 text-crash text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 4. MONTANT ET RACCOURCIS RESPONSIVE */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs font-mono">
              {isFcfa ? 'FCFA' : currency === 'USD' ? '$' : '€'}
            </span>
            <input
              type="number"
              step={isFcfa ? '100' : '0.5'}
              min={isFcfa ? '100' : '0.1'}
              max={isFcfa ? '5000000' : '1000'}
              value={amount}
              onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
              disabled={!!localBet && localBet.status === 'ACTIVE'}
              className="w-full bg-card border border-border focus:border-primary rounded-xl pl-12 pr-3 py-2 sm:py-2.5 text-white font-mono font-bold text-base focus:outline-none transition"
            />
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleHalf}
              disabled={!!localBet && localBet.status === 'ACTIVE'}
              className="px-3 min-h-[42px] rounded-xl bg-card border border-border text-xs font-mono font-bold text-gray-300 hover:text-white hover:border-gray-500 disabled:opacity-40 transition flex items-center justify-center"
            >
              ½
            </button>
            <button
              type="button"
              onClick={handleDouble}
              disabled={!!localBet && localBet.status === 'ACTIVE'}
              className="px-3 min-h-[42px] rounded-xl bg-card border border-border text-xs font-mono font-bold text-gray-300 hover:text-white hover:border-gray-500 disabled:opacity-40 transition flex items-center justify-center"
            >
              2x
            </button>
            <button
              type="button"
              onClick={handleMax}
              disabled={!!localBet && localBet.status === 'ACTIVE'}
              className="px-3 min-h-[42px] rounded-xl bg-card border border-border text-xs font-mono font-bold text-gray-300 hover:text-white hover:border-gray-500 disabled:opacity-40 transition flex items-center justify-center"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Grille 3 colonnes sur mobile, 6 sur écran plus large pour lisibilité FCFA */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {quickAmounts.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleAmountChange(q)}
              disabled={!!localBet && localBet.status === 'ACTIVE'}
              className={`py-1.5 px-1 rounded-lg text-xs font-mono font-bold border transition text-center min-h-[34px] flex items-center justify-center ${
                amount === q
                  ? 'bg-primary/20 border-primary text-primary'
                  : 'bg-card/70 border-border/70 text-gray-400 hover:text-white hover:bg-card'
              }`}
            >
              +{q}
            </button>
          ))}
        </div>
      </div>

      {/* 5. ZONE DES BOUTONS D'ACTION (52px MINIMUM POUR CONFORT TACTILE) */}
      <div className="mt-3 sm:mt-4">
        
        {/* PARI ACTIF EN VOL : BOUTON GÉANT CASH OUT MANUEL */}
        {effectiveBet && effectiveBet.status === 'ACTIVE' && status === 'RUNNING' ? (
          
          <button
            type="button"
            onClick={handleCashOut}
            disabled={isCashoutSubmitting}
            className="w-full min-h-[56px] py-3 px-3 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 text-black font-black uppercase tracking-wider hover:brightness-110 active:scale-95 disabled:opacity-60 transition-all shadow-2xl shadow-emerald-500/60 animate-pulse-fast flex flex-col items-center justify-center gap-0.5 border-2 border-emerald-200 cursor-pointer select-none"
          >
            <div className="flex items-center gap-2 text-base sm:text-lg font-black tracking-tight">
              <HandCoins className="w-5 h-5 animate-bounce shrink-0" />
              <span>CASH OUT MANUEL</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-mono font-bold bg-black/25 px-2.5 py-0.5 rounded-full text-black">
              <span>RETIRER {formatCurrency(liveWin, currency)}</span>
              <span className="font-black bg-black text-emerald-400 px-1.5 py-0.2 rounded">
                +{formatCurrency(liveProfit, currency)} ({currentMultiplier.toFixed(2)}x)
              </span>
            </div>
          </button>

        ) : effectiveBet && effectiveBet.status === 'ACTIVE' && (status === 'BETTING' || status === 'WAITING') ? (
          
          <div className="w-full min-h-[52px] py-3 px-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-between text-xs font-bold font-mono">
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Mise {formatCurrency(effectiveBet.amount, currency)} validée</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-gray-400">
              Décollage imminent...
            </span>
          </div>

        ) : effectiveBet && effectiveBet.status === 'CASHED_OUT' ? (
          
          <div className="w-full min-h-[52px] py-3 px-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 flex items-center justify-between shadow-lg shadow-emerald-500/20 text-xs font-mono font-black">
            <div className="flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>CASH OUT RÉUSSI !</span>
            </div>
            <span className="text-white text-sm">
              +{formatCurrency(effectiveBet.profit || 0, currency)} ({effectiveBet.cashoutMultiplier?.toFixed(2)}x)
            </span>
          </div>

        ) : effectiveBet && effectiveBet.status === 'LOST' ? (
          
          <div className="w-full min-h-[52px] py-3 px-3.5 rounded-xl bg-crash/15 border border-crash/30 text-crash flex items-center justify-between text-xs font-mono font-bold">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-crash shrink-0" />
              <span>Manche crashée</span>
            </div>
            <span>Mise défalquée : -{formatCurrency(effectiveBet.amount, currency)}</span>
          </div>

        ) : isQueuedForNextRound ? (
          
          <div className="flex items-center gap-2">
            <div className="flex-1 min-h-[52px] py-3 px-3 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-bold font-mono flex items-center justify-center gap-1.5">
              <RotateCcw className="w-4 h-4 animate-spin shrink-0" />
              <span>Mise en file ({formatCurrency(amount, currency)})</span>
            </div>
            <button
              type="button"
              onClick={handleCancelBet}
              className="p-3.5 min-w-[52px] min-h-[52px] rounded-xl bg-card border border-border text-gray-400 hover:text-crash transition flex items-center justify-center"
              title="Annuler la réservation"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

        ) : isLoading ? (
          
          /* CHARGEMENT / VÉRIFICATION DE SESSION (ANTI-FLASH) */
          <div className="w-full min-h-[52px] py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-card/60 border border-white/10 text-gray-400 flex items-center justify-center gap-2 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>VÉRIFICATION DU COMPTE...</span>
          </div>

        ) : !user ? (
          
          /* JOUEUR NON CONNECTÉ : INVITATION À SE CONNECTER SANS DEMO */
          <button
            type="button"
            onClick={() => onOpenAuth && onOpenAuth('login')}
            className="w-full min-h-[52px] py-3.5 px-4 rounded-xl font-black text-sm uppercase tracking-wider bg-gradient-to-r from-primary to-cyan-400 text-black hover:brightness-110 active:scale-98 transition shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4 shrink-0" />
            <span>CONNECTEZ-VOUS POUR PARIER</span>
          </button>

        ) : !isEmailVerified ? (
          
          <a
            href={`/auth/verify-email?email=${encodeURIComponent(user.email)}`}
            className="w-full min-h-[52px] py-3 rounded-xl bg-yellow-500/15 border border-yellow-500/40 text-yellow-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-yellow-500/25 transition shadow-lg text-center px-3"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-yellow-400" />
            <span>Confirmez votre email pour parier</span>
          </a>

        ) : (
          
          /* BOUTON PARIER STANDARD */
          <button
            type="button"
            onClick={handlePlaceBet}
            disabled={isSubmitting}
            className={`w-full min-h-[52px] py-3.5 px-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 shadow-lg active:scale-98 disabled:opacity-60 cursor-pointer ${
              status === 'BETTING' || status === 'WAITING'
                ? 'bg-gradient-to-r from-primary via-cyan-400 to-primary text-black hover:brightness-110 shadow-primary/30'
                : 'bg-card border border-primary/40 text-primary hover:bg-primary/10'
            }`}
          >
            <Zap className="w-4 h-4 shrink-0" />
            {status === 'BETTING' || status === 'WAITING' ? (
              <span>PARIER {formatCurrency(amount, currency)}</span>
            ) : (
              <span className="text-xs sm:text-sm">PARIER PROCHAIN VOL ({formatCurrency(amount, currency)})</span>
            )}
          </button>

        )}

      </div>

    </div>
  );
}
