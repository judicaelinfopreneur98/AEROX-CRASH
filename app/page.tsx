'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { HistoryRibbon } from '@/components/game/HistoryRibbon';
import { CrashCanvas } from '@/components/game/CrashCanvas';
import { MultiplierOverlay } from '@/components/game/MultiplierOverlay';
import { DualBetContainer } from '@/components/game/DualBetContainer';
import { LiveBetsTable } from '@/components/game/LiveBetsTable';
import { DepositModal } from '@/components/ui/DepositModal';
import { WithdrawalModal } from '@/components/ui/WithdrawalModal';
import { LimitsModal } from '@/components/ui/LimitsModal';
import { AuthModal } from '@/components/ui/AuthModal';

import { useAuth } from '@/components/providers/AuthProvider';
import { socketClient } from '@/websocket/SocketClient';
import { WS_EVENTS } from '@/websocket/events';
import { GameState, ActivePlayerBet, GameRoundInfo } from '@/game-engine/types';
import { RoundHistoryEntry } from '@/game-engine/GameEngine';
import { soundManager } from '@/lib/sound';
import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function ArenaPage() {
  const { user, refreshBalance } = useAuth();

  const [status, setStatus] = useState<GameState>('WAITING');
  const [multiplier, setMultiplier] = useState<number>(1.00);
  const [bettingTimeLeft, setBettingTimeLeft] = useState<number>(5.0);
  const [currentRound, setCurrentRound] = useState<GameRoundInfo | null>(null);
  const [recentHistory, setRecentHistory] = useState<RoundHistoryEntry[]>([]);
  const [activeBets, setActiveBets] = useState<ActivePlayerBet[]>([]);

  // Modals state
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [limitsOpen, setLimitsOpen] = useState(false);
  const [authModal, setAuthModal] = useState<{ open: boolean; mode: 'login' | 'register' }>({
    open: false,
    mode: 'login',
  });

  useEffect(() => {
    // Initialisation WebSocket & Musique de Fond
    const token = typeof window !== 'undefined' ? localStorage.getItem('aerox_jwt') : null;
    socketClient.connect(token);
    soundManager.initInteractionAutoPlay();

    // Synchronisation HTTP immédiate pour affichage sans délai
    fetch('/api/games/current')
      .then((r) => r.json())
      .then((data) => {
        if (data?.round) {
          setCurrentRound(data.round);
          if (data.round.status) setStatus(data.round.status);
          if (data.round.currentMultiplier) setMultiplier(data.round.currentMultiplier);
          if (data.round.bettingTimeLeft) setBettingTimeLeft(data.round.bettingTimeLeft);
        }
        if (data?.recentHistory?.length) {
          setRecentHistory(data.recentHistory);
        }
        if (data?.activeBets) {
          setActiveBets(data.activeBets);
        }
      })
      .catch(() => {});

    // 1. GAME CREATED / WAITING
    const unsubCreated = socketClient.on(WS_EVENTS.GAME_CREATED, (data: GameRoundInfo) => {
      setCurrentRound(data);
      setStatus('WAITING');
      setMultiplier(1.00);
      setActiveBets([]);
      soundManager.stopFlightSound();
      soundManager.updateBgmPhase('WAITING', 1.00);
      refreshBalance();
    });

    // 2. GAME BETTING
    const unsubBetting = socketClient.on(WS_EVENTS.GAME_BETTING, (data: { timeLeft: number; roundNumber: number }) => {
      setStatus('BETTING');
      setBettingTimeLeft(data.timeLeft);
      soundManager.updateBgmPhase('BETTING', 1.00);
      if (Math.floor(data.timeLeft) === data.timeLeft) {
        soundManager.playCountdownTick(data.timeLeft <= 1);
      }
    });

    // 3. GAME STARTED
    const unsubStarted = socketClient.on(WS_EVENTS.GAME_STARTED, (data: any) => {
      setStatus('RUNNING');
      setMultiplier(1.00);
      soundManager.updateFlightSound(1.00);
      soundManager.updateBgmPhase('RUNNING', 1.00);
      refreshBalance();
    });

    // 4. GAME MULTIPLIER TICK
    const unsubMult = socketClient.on(WS_EVENTS.GAME_MULTIPLIER, (data: { multiplier: number }) => {
      setMultiplier(data.multiplier);
      soundManager.updateFlightSound(data.multiplier);
      soundManager.updateBgmPhase('RUNNING', data.multiplier);
    });

    // 5. GAME CRASHED : MARQUAGE IMMÉDIAT EN PERDU & ACTUALISATION DU SOLDE
    const unsubCrashed = socketClient.on(WS_EVENTS.GAME_CRASHED, (data: any) => {
      setStatus('CRASHED');
      setMultiplier(data.crashPoint);
      soundManager.playCrash();
      soundManager.updateBgmPhase('CRASHED', data.crashPoint);

      // Les paris encore actifs deviennent PERDUS (la mise reste défalquée)
      setActiveBets((prev) =>
        prev.map((b) => (b.status === 'ACTIVE' ? { ...b, status: 'LOST', profit: -b.amount } : b))
      );

      // Synchroniser le solde défalqué depuis le serveur
      refreshBalance();

      // Ajout de la manche à l'historique
      setRecentHistory((prev) => [
        {
          id: `rnd_${data.roundNumber}`,
          roundNumber: data.roundNumber,
          crashPoint: data.crashPoint,
          serverSeed: data.serverSeed,
          serverSeedHash: data.serverSeedHash,
          clientSeed: data.clientSeed,
          nonce: data.nonce,
          createdAt: new Date(),
        },
        ...prev.slice(0, 30),
      ]);
    });

    // 6. GAME RESULT
    const unsubResult = socketClient.on(WS_EVENTS.GAME_RESULT, () => {
      setStatus('RESULT');
      refreshBalance();
    });

    // 7. BET ACCEPTED
    const unsubBet = socketClient.on(WS_EVENTS.BET_ACCEPTED, (payload: any) => {
      const newBet: ActivePlayerBet = payload?.bet || payload;
      if (!newBet || !newBet.betId) return;

      setActiveBets((prev) => {
        const existingIndex = prev.findIndex((b) => b.betId === newBet.betId);
        if (existingIndex >= 0) {
          const clone = [...prev];
          clone[existingIndex] = newBet;
          return clone;
        }
        return [newBet, ...prev];
      });
      refreshBalance();
    });

    // 8. CASHOUT SUCCESS
    const unsubCashout = socketClient.on(WS_EVENTS.CASHOUT_SUCCESS, (data: any) => {
      setActiveBets((prev) =>
        prev.map((b) => {
          if (b.betId === data.betId) {
            return {
              ...b,
              status: 'CASHED_OUT',
              cashoutMultiplier: data.multiplier,
              profit: data.profit,
            };
          }
          return b;
        })
      );
      refreshBalance();
    });

    // 9. HISTORIQUE INITIAL & PARIS ACTIFS
    const unsubHistory = socketClient.on('game.recent_history', (list: RoundHistoryEntry[]) => {
      if (Array.isArray(list)) setRecentHistory(list);
    });

    const unsubActive = socketClient.on('game.active_bets', (list: ActivePlayerBet[]) => {
      if (Array.isArray(list)) setActiveBets(list);
    });

    return () => {
      unsubCreated();
      unsubBetting();
      unsubStarted();
      unsubMult();
      unsubCrashed();
      unsubResult();
      unsubBet();
      unsubCashout();
      unsubHistory();
      unsubActive();
    };
  }, [refreshBalance]);

  return (
    <div className="min-h-screen flex flex-col bg-[#080B10] text-gray-100">
      
      {/* 1. NAVBAR SUPÉRIEURE */}
      <Navbar
        onOpenDeposit={() => setDepositOpen(true)}
        onOpenWithdrawal={() => setWithdrawalOpen(true)}
        onOpenLimits={() => setLimitsOpen(true)}
        onOpenAuth={(mode) => setAuthModal({ open: true, mode })}
      />

      {/* 2. RUBAN DES DERNIERS MULTIPLICATEURS PROVABLY FAIR */}
      <HistoryRibbon history={recentHistory} />

      {/* 3. ARÈNE PRINCIPALE DE JEU */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 xs:p-2.5 sm:p-4 md:p-6 flex flex-col gap-2.5 sm:gap-4">
        
        {/* SECTION SUPÉRIEURE : CANVAS & LIVE TABLE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-4 flex-1">
          
          {/* ÉCRAN DU JEU (CANVAS + MULTIPLICATEUR GÉANT) */}
          <div className="lg:col-span-8 relative flex flex-col h-auto lg:h-full">
            <CrashCanvas
              status={status}
              multiplier={multiplier}
              bettingTimeLeft={bettingTimeLeft}
              crashPoint={currentRound?.crashPoint}
            />
            <MultiplierOverlay
              status={status}
              multiplier={multiplier}
              bettingTimeLeft={bettingTimeLeft}
              crashPoint={currentRound?.crashPoint}
              roundNumber={currentRound?.roundNumber}
            />
          </div>

          {/* TABLEAU DES PARIS EN DIRECT */}
          <div className="lg:col-span-4 h-auto lg:h-full">
            <LiveBetsTable bets={activeBets} />
          </div>

        </div>

        {/* SECTION INFÉRIEURE : DOUBLE PANNEAU DE PARIS (BET 1 & BET 2) */}
        <div className="w-full">
          <DualBetContainer
            status={status}
            currentMultiplier={multiplier}
            activeBets={activeBets}
            onOpenAuth={() => setAuthModal({ open: true, mode: 'login' })}
          />
        </div>

        {/* PIED DE PAGE & BADGES DE SÉCURITÉ */}
        <footer className="mt-auto pt-3 pb-2 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 font-mono gap-2 text-center sm:text-left">
          <div className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[11px] sm:text-xs">Moteur Provably Fair Certifié SHA-256 / HMAC-SHA-512</span>
          </div>
          <div className="flex items-center justify-center flex-wrap gap-3 sm:gap-4 text-[11px] sm:text-xs">
            <Link href="/provably-fair" className="hover:text-primary transition">
              Vérifier l’Algorithme
            </Link>
            <Link href="/history" className="hover:text-primary transition">
              Historique Public
            </Link>
            <button onClick={() => setLimitsOpen(true)} className="hover:text-yellow-400 transition">
              Jeu Responsable (18+)
            </button>
          </div>
        </footer>

      </main>

      {/* MODALES FLOTTANTES */}
      {depositOpen && <DepositModal onClose={() => setDepositOpen(false)} />}
      {withdrawalOpen && <WithdrawalModal onClose={() => setWithdrawalOpen(false)} />}
      {limitsOpen && <LimitsModal onClose={() => setLimitsOpen(false)} />}
      {authModal.open && (
        <AuthModal
          initialMode={authModal.mode}
          onClose={() => setAuthModal({ open: false, mode: 'login' })}
        />
      )}

    </div>
  );
}
