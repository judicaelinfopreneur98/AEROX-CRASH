'use client';

import React from 'react';
import { GameState } from '@/game-engine/types';

interface MultiplierOverlayProps {
  status: GameState;
  multiplier: number;
  bettingTimeLeft: number;
  crashPoint?: number;
  roundNumber?: number;
}

export function MultiplierOverlay({
  status,
  multiplier,
  bettingTimeLeft,
  crashPoint,
  roundNumber,
}: MultiplierOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center select-none z-10">
      
      {/* 1. PHASE EN VOL (RUNNING) : MULTIPLICATEUR GÉANT DYNAMIQUE */}
      {status === 'RUNNING' && (
        <div className="flex flex-col items-center animate-in zoom-in-95 duration-100">
          <span className="font-black text-6xl sm:text-7xl md:text-8xl tracking-tighter text-white font-mono drop-shadow-[0_0_35px_rgba(0,240,255,0.6)]">
            {multiplier.toFixed(2)}x
          </span>
          <span className="text-xs sm:text-sm font-bold tracking-widest text-primary/80 uppercase font-mono mt-1">
            Vitesse Quantum Active
          </span>
        </div>
      )}

      {/* 2. PHASE DE CRASH (CRASHED & RESULT) */}
      {(status === 'CRASHED' || status === 'RESULT') && (
        <div className="flex flex-col items-center animate-in zoom-in-105 duration-150">
          <span className="text-sm sm:text-base font-black tracking-widest text-crash uppercase bg-crash/10 px-3 py-1 rounded-full border border-crash/30 mb-2">
            CRASH DU RÉACTEUR
          </span>
          <span className="font-black text-6xl sm:text-7xl md:text-8xl tracking-tighter text-crash font-mono drop-shadow-[0_0_40px_rgba(255,51,102,0.8)]">
            {(crashPoint || multiplier).toFixed(2)}x
          </span>
          <span className="text-xs text-gray-400 font-mono mt-2">
            Calcul des gains & préparation de la manche...
          </span>
        </div>
      )}

      {/* 3. PHASE DE PARIS (BETTING) : COMPTE À REBOURS ET JAUGE */}
      {status === 'BETTING' && (
        <div className="flex flex-col items-center w-full max-w-xs px-4">
          <span className="text-xs sm:text-sm font-bold tracking-widest text-primary uppercase font-mono mb-2">
            Placez vos mises
          </span>
          <span className="font-black text-5xl sm:text-6xl text-white font-mono tracking-tight drop-shadow-[0_0_20px_rgba(0,240,255,0.4)]">
            {bettingTimeLeft.toFixed(1)}s
          </span>

          {/* Barre de progression du compte à rebours */}
          <div className="w-full bg-surface/80 h-2.5 rounded-full overflow-hidden border border-primary/30 mt-3 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-100 ease-linear shadow-sm shadow-primary"
              style={{ width: `${Math.min(100, (bettingTimeLeft / 5.0) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* 4. PHASE D'ATTENTE (WAITING) : SYNCHRONISATION PROVABLY FAIR */}
      {status === 'WAITING' && (
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin mb-3" />
          <span className="text-xs font-mono tracking-widest text-gray-400 uppercase font-semibold">
            Génération de l’engagement cryptographique...
          </span>
        </div>
      )}

      {/* TÉMOIN NUMÉRO DE MANCHE EN HAUT À GAUCHE */}
      {roundNumber && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-surface/80 backdrop-blur-md px-3 py-1 rounded-lg border border-border text-xs font-mono text-gray-300">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>MANCHE #{roundNumber}</span>
        </div>
      )}
    </div>
  );
}
