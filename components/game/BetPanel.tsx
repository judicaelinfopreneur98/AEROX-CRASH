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
} from 'lucide-react';

interface BetPanelProps {
  panelIndex: number; // 1 ou 2
  status: GameState;
  currentMultiplier: number;
  myActiveBet: ActivePlayerBet | null;
  onOpenAuth?: () => void;
}

export function BetPanel({
  panelIndex,
  status,
  currentMultiplier,
  myActiveBet,
  onOpenAuth,
}: BetPanelProps) {
  const { user, balance, currency, isEmailVerified, login, refreshBalance, updateBalanceLocally } = useAuth();

  // Mode de gestion : 'manual' (Cash Out Manuel) ou 'auto' (Auto Cash-Out)
  const [betMode, setBetMode] = useState<'manual' | 'auto'>('manual');

  const isFcfa = currency === 'FCFA';
  const [amount, setAmount] = useState<number>(currency === 'FCFA' ? 100 : 10.0);
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState<boolean>(false);
  const [autoCashoutValue, setAutoCashoutValue] = useState<number>(2.0);
  const [autoBetEnabled, setAutoBetEnabled] = useState<boolean>(false);
  const [isQueuedForNextRound, setIsQueuedForNextRound] = useState<boolean>(false);

  // Pari local actif (synchronisé avec myActiveBet ou optimiste)
  const [localBet, setLocalBet] = useState<ActivePlayerBet | null>(myActiveBet);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const quickAmounts = isFcfa ? [50, 100, 200, 500, 1000, 2000] : [1, 2, 5, 10, 25, 50];

  useEffect(() => {
    if (currency === 'FCFA' && (amount < 50 || amount > 10000)) {
      setAmount(100);
    } else if (currency !== 'FCFA' && amount > 1000) {
      setAmount(10);
    }
  }, [currency]);

  // Synchronisation avec les mises serveur
  useEffect(() => {
    if (myActiveBet) {
      setLocalBet(myActiveBet);
    } else if (status === 'WAITING' || status === 'RESULT') {
      // Nouvelle manche : réinitialisation du pari local
      if (status === 'WAITING') {
        setLocalBet(null);
      }
    }
  }, [myActiveBet, status]);

  // Si la manche s'écrase alors que le pari était encore actif : marquage immédiat en PERDU
  useEffect(() => {
    if ((status === 'CRASHED' || status === 'RESULT') && localBet && localBet.status === 'ACTIVE') {
      setLocalBet({
        ...localBet,
        status: 'LOST',
        profit: -localBet.amount,
      });
      // Synchronisation du solde officiel avec le serveur
      refreshBalance();
    }
  }, [status, localBet, refreshBalance]);

  // Gestion de la file d'attente pour la prochaine manche
  useEffect(() => {
    if (status === 'BETTING' && isQueuedForNextRound && !localBet) {
      handlePlaceBet();
      setIsQueuedForNextRound(false);
    }
  }, [status, isQueuedForNextRound, localBet]);

  // Auto-Bet
  useEffect(() => {
    if (status === 'BETTING' && autoBetEnabled && !localBet && !isQueuedForNextRound) {
      handlePlaceBet();
    }
  }, [status, autoBetEnabled, localBet]);

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
  // ACTION : PLACER UNE MISE (DÉFALCATION IMMÉDIATE DU SOLDE)
  // =========================================================================
  const handlePlaceBet = async () => {
    let currentUser = user;

    // Si non connecté, connexion démo automatique transparente
    if (!currentUser) {
      const authRes = await login('demo@aerox.io', 'Demo123!');
      if (!authRes.success) {
        if (onOpenAuth) onOpenAuth();
        return;
      }
    }

    if (currentUser && !isEmailVerified) {
      setErrorMessage('Action verrouillée : veuillez confirmer votre adresse email pour parier.');
      return;
    }

    if (amount > balance) {
      setErrorMessage(`Solde insuffisant (${formatCurrency(balance, currency)} disponible).`);
      return;
    }

    if (status !== 'BETTING') {
      setIsQueuedForNextRound(true);
      setErrorMessage(null);
      return;
    }

    setErrorMessage(null);
    soundManager.playBetPlaced();

    // 1. DÉFALCATION IMMÉDIATE DU SOLDE : Le solde baisse instantanément à l'écran
    const newBalance = Math.max(0, Number((balance - amount).toFixed(2)));
    updateBalanceLocally(newBalance);

    const tempBetId = `bet_${Date.now()}_${panelIndex}`;
    const shouldUseAutoCo = betMode === 'auto' || autoCashoutEnabled;
    const autoCo = shouldUseAutoCo ? autoCashoutValue : null;

    // Création optimiste du pari local
    const optimisticBet: ActivePlayerBet = {
      betId: tempBetId,
      userId: user?.id || 'usr_demo_001',
      username: user?.username || 'PiloteDemo',
      panelIndex,
      amount,
      autoCashout: autoCo,
      cashoutMultiplier: null,
      profit: null,
      status: 'ACTIVE',
    };
    setLocalBet(optimisticBet);

    // 2. Envoi via WebSocket
    socketClient.placeBet(amount, panelIndex, autoCo);

    // 3. Appel de secours REST API pour garantie absolue
    const token = localStorage.getItem('aerox_jwt');
    if (token) {
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
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.bet) {
            setLocalBet(data.bet);
          }
          await refreshBalance();
        }
      } catch {}
    }
  };

  // Annuler la réservation en attente
  const handleCancelBet = () => {
    if (isQueuedForNextRound) {
      setIsQueuedForNextRound(false);
    }
  };

  // =========================================================================
  // ACTION : BOUTON CASH OUT MANUEL (FONCTIONNEL, INSTANTANÉ ET GARANTI)
  // =========================================================================
  const handleCashOut = async () => {
    if (!localBet || localBet.status !== 'ACTIVE') return;

    soundManager.playCashoutSuccess();

    const mult = Number(currentMultiplier.toFixed(2));
    const winAmount = Number((localBet.amount * mult).toFixed(2));
    const profitAmount = Number((winAmount - localBet.amount).toFixed(2));

    // 1. Mise à jour immédiate optimiste de l'état du bouton
    const cashedBet: ActivePlayerBet = {
      ...localBet,
      status: 'CASHED_OUT',
      cashoutMultiplier: mult,
      profit: profitAmount,
    };
    setLocalBet(cashedBet);

    // 2. Crédit immédiat du solde utilisateur (Solde = solde actuel + gain total)
    const updatedBalance = Number((balance + winAmount).toFixed(2));
    updateBalanceLocally(updatedBalance);

    // 3. Envoi prioritaire WebSocket
    socketClient.cashOut(localBet.betId);

    // 4. Appel de secours REST API
    const token = localStorage.getItem('aerox_jwt');
    if (token) {
      try {
        fetch(`/api/bets/${localBet.betId}/cashout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).then(() => {
          refreshBalance();
        }).catch(() => {});
      } catch {}
    }
  };

  // Calcul du gain affiché en direct sur le bouton de Cash Out
  const liveWin = localBet && localBet.status === 'ACTIVE'
    ? Number((localBet.amount * currentMultiplier).toFixed(2))
    : Number((amount * currentMultiplier).toFixed(2));

  const liveProfit = localBet && localBet.status === 'ACTIVE'
    ? Number((liveWin - localBet.amount).toFixed(2))
    : Number((liveWin - amount).toFixed(2));

  return (
    <div className="bg-[#0E131F] border border-border/90 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-2xl relative overflow-hidden backdrop-blur-md">
      
      {/* 1. EN-TÊTE : ONGLETS MANUEL / AUTO & NOM DU PANNEAU */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/70">
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
            className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
              betMode === 'manual'
                ? 'bg-primary text-black shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <HandCoins className="w-3.5 h-3.5" />
            Manuel
          </button>
          <button
            type="button"
            onClick={() => setBetMode('auto')}
            className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
              betMode === 'auto'
                ? 'bg-primary text-black shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Auto
          </button>
        </div>
      </div>

      {/* 2. MODE AUTO (CONFIG) */}
      {betMode === 'auto' && (
        <div className="mb-3 p-2.5 rounded-xl bg-card/60 border border-border/60 flex items-center justify-between text-xs animate-in fade-in">
          <label className="flex items-center gap-1.5 text-gray-300 font-semibold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoBetEnabled}
              onChange={(e) => setAutoBetEnabled(e.target.checked)}
              className="w-3.5 h-3.5 accent-primary rounded cursor-pointer"
            />
            Auto Pari
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

      {/* 4. MONTANT ET RACCOURCIS */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
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
              className="w-full bg-card border border-border focus:border-primary rounded-xl pl-12 pr-3 py-2.5 text-white font-mono font-bold text-base focus:outline-none transition"
            />
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleHalf}
              disabled={!!localBet && localBet.status === 'ACTIVE'}
              className="px-2.5 py-2.5 rounded-xl bg-card border border-border text-xs font-mono font-bold text-gray-300 hover:text-white hover:border-gray-500 disabled:opacity-40 transition"
            >
              ½
            </button>
            <button
              onClick={handleDouble}
              disabled={!!localBet && localBet.status === 'ACTIVE'}
              className="px-2.5 py-2.5 rounded-xl bg-card border border-border text-xs font-mono font-bold text-gray-300 hover:text-white hover:border-gray-500 disabled:opacity-40 transition"
            >
              2x
            </button>
            <button
              onClick={handleMax}
              disabled={!!localBet && localBet.status === 'ACTIVE'}
              className="px-2.5 py-2.5 rounded-xl bg-card border border-border text-xs font-mono font-bold text-gray-300 hover:text-white hover:border-gray-500 disabled:opacity-40 transition"
            >
              MAX
            </button>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-1.5">
          {quickAmounts.map((q) => (
            <button
              key={q}
              onClick={() => handleAmountChange(q)}
              disabled={!!localBet && localBet.status === 'ACTIVE'}
              className={`py-1.5 rounded-lg text-xs font-mono font-bold border transition ${
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

      {/* 5. ZONE DES BOUTONS D'ACTION : PARIER / CASH OUT MANUEL */}
      <div className="mt-4">
        
        {/* PARI ACTIF EN VOL : LE BOUTON GÉANT CASH OUT MANUEL */}
        {localBet && localBet.status === 'ACTIVE' && status === 'RUNNING' ? (
          
          <button
            type="button"
            onClick={handleCashOut}
            className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 text-black font-black uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-2xl shadow-emerald-500/60 animate-pulse-fast flex flex-col items-center justify-center gap-0.5 border-2 border-emerald-200 cursor-pointer select-none"
          >
            <div className="flex items-center gap-2 text-base sm:text-lg font-black tracking-tight">
              <HandCoins className="w-5 h-5 animate-bounce" />
              <span>CASH OUT MANUEL</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-mono font-bold bg-black/25 px-3 py-0.5 rounded-full mt-0.5 text-black">
              <span>RETIRER {formatCurrency(liveWin, currency)}</span>
              <span className="font-black bg-black text-emerald-400 px-1.5 py-0.2 rounded">
                +{formatCurrency(liveProfit, currency)} ({currentMultiplier.toFixed(2)}x)
              </span>
            </div>
          </button>

        ) : localBet && localBet.status === 'ACTIVE' && status === 'BETTING' ? (
          
          /* MISE VALIDÉE ET SOLDE DÉFALQUÉ (ATTENTE DU DÉCOLLAGE) */
          <div className="w-full py-3.5 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold font-mono">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Mise {formatCurrency(localBet.amount, currency)} défalquée et confirmée</span>
            </div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-400">
              Décollage imminent...
            </span>
          </div>

        ) : localBet && localBet.status === 'CASHED_OUT' ? (
          
          /* CASH OUT RÉUSSI */
          <div className="w-full py-3.5 px-4 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 flex items-center justify-between shadow-lg shadow-emerald-500/20">
            <div className="flex items-center gap-2 text-xs font-black font-mono">
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              <span>CASH OUT RÉUSSI !</span>
            </div>
            <span className="font-mono font-black text-sm text-white">
              +{formatCurrency(localBet.profit || 0, currency)} ({localBet.cashoutMultiplier?.toFixed(2)}x)
            </span>
          </div>

        ) : localBet && localBet.status === 'LOST' ? (
          
          /* MANCHE PERDUE : L'ARGENT RESTE DÉFALQUÉ ET N'EST PAS RENDU */
          <div className="w-full py-3.5 px-4 rounded-xl bg-crash/15 border border-crash/30 text-crash flex items-center justify-between text-xs font-mono font-bold">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-crash" />
              <span>Manche crashée</span>
            </div>
            <span>Mise défalquée : -{formatCurrency(localBet.amount, currency)}</span>
          </div>

        ) : isQueuedForNextRound ? (
          
          /* MISE EN FILE POUR LE PROCHAIN TOUR */
          <div className="flex items-center gap-2">
            <div className="flex-1 py-3.5 px-3 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-bold font-mono flex items-center justify-center gap-1.5">
              <RotateCcw className="w-4 h-4 animate-spin" />
              <span>Mise en file ({formatCurrency(amount, currency)})</span>
            </div>
            <button
              onClick={handleCancelBet}
              className="p-3.5 rounded-xl bg-card border border-border text-gray-400 hover:text-crash transition"
              title="Annuler la réservation"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

        ) : user && !isEmailVerified ? (
          <a
            href={`/auth/verify-email?email=${encodeURIComponent(user.email)}`}
            className="w-full py-4 rounded-xl bg-yellow-500/15 border border-yellow-500/40 text-yellow-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-yellow-500/25 transition shadow-lg text-center px-3"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-yellow-400" />
            <span>Confirmez votre email pour parier</span>
          </a>
        ) : (
          
          /* BOUTON PARIER (OU PARIER POUR LE PROCHAIN VOL) */
          <button
            type="button"
            onClick={handlePlaceBet}
            className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 shadow-lg active:scale-98 cursor-pointer ${
              status === 'BETTING'
                ? 'bg-gradient-to-r from-primary via-cyan-400 to-primary text-black hover:brightness-110 shadow-primary/30'
                : 'bg-card border border-primary/40 text-primary hover:bg-primary/10'
            }`}
          >
            <Zap className="w-4 h-4" />
            {status === 'BETTING' ? (
              <span>PARIER {formatCurrency(amount, currency)}</span>
            ) : (
              <span>PARIER POUR LE PROCHAIN VOL ({formatCurrency(amount, currency)})</span>
            )}
          </button>

        )}

      </div>

    </div>
  );
}
