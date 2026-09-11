'use client';

import React from 'react';
import { BetPanel } from './BetPanel';
import { GameState, ActivePlayerBet } from '@/game-engine/types';
import { useAuth } from '../providers/AuthProvider';
import { socketClient } from '@/websocket/SocketClient';
import { soundManager } from '@/lib/sound';
import { formatCurrency } from '@/lib/utils';
import { HandCoins } from 'lucide-react';

interface DualBetContainerProps {
  status: GameState;
  currentMultiplier: number;
  activeBets: ActivePlayerBet[];
  onOpenAuth?: () => void;
}

export function DualBetContainer({
  status,
  currentMultiplier,
  activeBets,
  onOpenAuth,
}: DualBetContainerProps) {
  const { user } = useAuth();

  // Recherche des paris de l'utilisateur connecté pour chaque panneau
  const myBet1 = user
    ? activeBets.find((b) => b.userId === user.id && b.panelIndex === 1) || null
    : null;

  const myBet2 = user
    ? activeBets.find((b) => b.userId === user.id && b.panelIndex === 2) || null
    : null;

  const bothActive = myBet1?.status === 'ACTIVE' && myBet2?.status === 'ACTIVE';

  const handleCashOutAll = () => {
    soundManager.playCashoutSuccess();
    if (myBet1 && myBet1.status === 'ACTIVE') {
      socketClient.cashOut(myBet1.betId);
    }
    if (myBet2 && myBet2.status === 'ACTIVE') {
      socketClient.cashOut(myBet2.betId);
    }
  };

  const totalLiveWin =
    (myBet1?.status === 'ACTIVE' ? myBet1.amount * currentMultiplier : 0) +
    (myBet2?.status === 'ACTIVE' ? myBet2.amount * currentMultiplier : 0);

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* BOUTON GLOBAL CASH OUT TOUT SI LES DEUX PARIS SONT EN VOL */}
      {bothActive && status === 'RUNNING' && (
        <button
          onClick={handleCashOutAll}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-emerald-400 to-amber-500 text-black font-black uppercase text-xs sm:text-sm tracking-wider hover:brightness-110 active:scale-98 transition shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2 animate-pulse"
        >
          <HandCoins className="w-4 h-4" />
          <span>CASH OUT MANUEL SIMULTANÉ (TOUT ENCAISSER) :</span>
          <span className="font-mono bg-black/20 px-2 py-0.5 rounded">
            {formatCurrency(totalLiveWin)}
          </span>
        </button>
      )}

      {/* LES DEUX PANNEAUX INDIVIDUELS BET 1 ET BET 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
        <BetPanel
          panelIndex={1}
          status={status}
          currentMultiplier={currentMultiplier}
          myActiveBet={myBet1}
          onOpenAuth={onOpenAuth}
        />
        <BetPanel
          panelIndex={2}
          status={status}
          currentMultiplier={currentMultiplier}
          myActiveBet={myBet2}
          onOpenAuth={onOpenAuth}
        />
      </div>
    </div>
  );
}
