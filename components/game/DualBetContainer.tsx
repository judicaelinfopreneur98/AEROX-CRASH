'use client';

import React, { useState } from 'react';
import { BetPanel } from './BetPanel';
import { GameState, ActivePlayerBet } from '@/game-engine/types';
import { useAuth } from '../providers/AuthProvider';
import { socketClient } from '@/websocket/SocketClient';
import { soundManager } from '@/lib/sound';
import { formatCurrency } from '@/lib/utils';
import { HandCoins, Layers } from 'lucide-react';

interface DualBetContainerProps {
  status: GameState;
  currentMultiplier: number;
  activeBets: ActivePlayerBet[];
  currentRound?: any;
  onBetPlaced?: () => void;
  onOpenAuth?: () => void;
}

export function DualBetContainer({
  status,
  currentMultiplier,
  activeBets,
  currentRound,
  onBetPlaced,
  onOpenAuth,
}: DualBetContainerProps) {
  const { user } = useAuth();
  const [mobileTab, setMobileTab] = useState<'1' | '2' | 'both'>('1');

  // Recherche robuste des paris de l'utilisateur connecté pour chaque panneau
  const myBet1 = user
    ? (activeBets.find((b: any) => {
        const item = b?.bet || b;
        return (item?.userId === user.id || item?.username === user.username) && item?.panelIndex === 1;
      }) as ActivePlayerBet) || null
    : null;

  const myBet2 = user
    ? (activeBets.find((b: any) => {
        const item = b?.bet || b;
        return (item?.userId === user.id || item?.username === user.username) && item?.panelIndex === 2;
      }) as ActivePlayerBet) || null
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
    <div className="flex flex-col gap-2.5 sm:gap-3 w-full">
      
      {/* BOUTON GLOBAL CASH OUT TOUT SI LES DEUX PARIS SONT EN VOL */}
      {bothActive && status === 'RUNNING' && (
        <button
          onClick={handleCashOutAll}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-emerald-400 to-amber-500 text-black font-black uppercase text-xs sm:text-sm tracking-wider hover:brightness-110 active:scale-98 transition shadow-xl shadow-amber-400/25 flex items-center justify-center gap-2 animate-pulse border border-amber-300 cursor-pointer"
        >
          <HandCoins className="w-4 h-4 shrink-0" />
          <span>TOUT ENCAISSER (CASH OUT x2) :</span>
          <span className="font-mono bg-black/20 px-2 py-0.5 rounded font-black">
            {formatCurrency(totalLiveWin)}
          </span>
        </button>
      )}

      {/* SÉLECTEUR D'ONGLETS TACTILE SUR MOBILE (< md) */}
      <div className="md:hidden flex items-center bg-card p-1 rounded-xl border border-border text-xs font-bold">
        <button
          type="button"
          onClick={() => setMobileTab('1')}
          className={`flex-1 py-2 px-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
            mobileTab === '1'
              ? 'bg-primary text-black shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${myBet1?.status === 'ACTIVE' ? 'bg-emerald-400 animate-ping' : 'bg-primary'}`} />
          <span>Pari 1</span>
          {myBet1?.status === 'ACTIVE' && (
            <span className="text-[10px] bg-black/30 text-black px-1 rounded font-mono font-black">
              EN VOL
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('2')}
          className={`flex-1 py-2 px-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
            mobileTab === '2'
              ? 'bg-accent text-black shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${myBet2?.status === 'ACTIVE' ? 'bg-emerald-400 animate-ping' : 'bg-accent'}`} />
          <span>Pari 2</span>
          {myBet2?.status === 'ACTIVE' && (
            <span className="text-[10px] bg-black/30 text-black px-1 rounded font-mono font-black">
              EN VOL
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('both')}
          className={`px-2.5 py-2 rounded-lg transition flex items-center justify-center gap-1 ${
            mobileTab === 'both'
              ? 'bg-surface text-white border border-border'
              : 'text-gray-400 hover:text-white'
          }`}
          title="Afficher les deux panneaux simultanément"
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="text-[11px]">Les 2</span>
        </button>
      </div>

      {/* PANNEAUX DE PARI */}
      {/* Sur Desktop (md:) : toujours 2 colonnes */}
      {/* Sur Mobile : affichage selon l'onglet actif */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
        <div className={mobileTab === '1' || mobileTab === 'both' ? 'block' : 'hidden md:block'}>
          <BetPanel
            panelIndex={1}
            status={status}
            currentMultiplier={currentMultiplier}
            myActiveBet={myBet1}
            currentRound={currentRound}
            onBetPlaced={onBetPlaced}
            onOpenAuth={onOpenAuth}
          />
        </div>

        <div className={mobileTab === '2' || mobileTab === 'both' ? 'block' : 'hidden md:block'}>
          <BetPanel
            panelIndex={2}
            status={status}
            currentMultiplier={currentMultiplier}
            myActiveBet={myBet2}
            currentRound={currentRound}
            onBetPlaced={onBetPlaced}
            onOpenAuth={onOpenAuth}
          />
        </div>
      </div>

    </div>
  );
}
