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
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center select-none z-10 px-2">
      
      {/* 1. PHASE EN VOL (RUNNING) : MULTIPLICATEUR GÉANT DYNAMIQUE */}
      {status === 'RUNNING' && (
        <div className="flex flex-col items-center animate-in zoom-in-95 duration-100 max-w-full">
          <span className="font-black text-5xl xs:text-6xl sm:text-7xl md:text-8xl tracking-tighter text-white font-mono drop-shadow-[0_0_35px_rgba(0,240,255,0.6)] truncate px-2">
            {multiplier.toFixed(2)}x
          </span>
          <span className="text-[11px] sm:text-sm font-bold tracking-widest text-primary/90 uppercase font-mono mt-0.5 sm:mt-1">
            Vitesse Quantum Active
          </span>
        </div>
      )}

      {/* 2. PHASE DE CRASH (CRASHED & RESULT) */}
      {(status === 'CRASHED' || status === 'RESULT') && (
        <div className="flex flex-col items-center animate-in zoom-in-105 duration-150 max-w-full text-center">
          <span className="text-xs sm:text-base font-black tracking-widest text-crash uppercase bg-crash/15 px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-full border border-crash/30 mb-1 sm:mb-2">
            CRASH DU RÉACTEUR
          </span>
          <span className="font-black text-5xl xs:text-6xl sm:text-7xl md:text-8xl tracking-tighter text-crash font-mono drop-shadow-[0_0_40px_rgba(255,51,102,0.8)] truncate px-2">
            {(crashPoint || multiplier).toFixed(2)}x
          </span>
          <span className="text-[10px] sm:text-xs text-gray-400 font-mono mt-1 sm:mt-2">
            Calcul des gains & préparation de la manche...
          </span>
        </div>
      )}

      {/* 3. PHASE DE PARIS (BETTING) : COMPTE À REBOURS ET JAUGE */}
      {status === 'BETTING' && (
        <div className="flex flex-col items-center w-full max-w-[220px] sm:max-w-xs px-2">
          <span className="text-xs sm:text-sm font-bold tracking-widest text-primary uppercase font-mono mb-1 sm:mb-2">
            Placez vos mises
          </span>
          <span className="font-black text-4xl xs:text-5xl sm:text-6xl text-white font-mono tracking-tight drop-shadow-[0_0_20px_rgba(0,240,255,0.4)]">
            {bettingTimeLeft.toFixed(1)}s
          </span>

          {/* Barre de progression du compte à rebours */}
          <div className="w-full bg-surface/80 h-2 sm:h-2.5 rounded-full overflow-hidden border border-primary/30 mt-2 sm:mt-3 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-100 ease-linear shadow-sm shadow-primary"
              style={{ width: `${Math.min(100, (bettingTimeLeft / 5.0) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* 4. PHASE D'ATTENTE (WAITING) : SYNCHRONISATION PROVABLY FAIR */}
      {status === 'WAITING' && (
        <div className="flex flex-col items-center px-4 text-center">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin mb-2 sm:mb-3" />
          <span className="text-[11px] sm:text-xs font-mono tracking-wider text-gray-400 uppercase font-semibold">
            Génération de l’engagement cryptographique...
          </span>
        </div>
      )}

      {/* TÉMOIN NUMÉRO DE MANCHE EN HAUT À GAUCHE */}
      {roundNumber && (
        <div className="absolute top-2.5 left-2.5 sm:top-4 sm:left-4 flex items-center gap-1.5 bg-surface/85 backdrop-blur-md px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg border border-border text-[10px] sm:text-xs font-mono text-gray-300">
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary animate-pulse" />
          <span>#{roundNumber}</span>
        </div>
      )}
    </div>
  );
}
