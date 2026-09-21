'use client';

import React, { useState } from 'react';
import { RoundHistoryEntry } from '@/game-engine/GameEngine';
import { ProvablyFairModal } from '../ui/ProvablyFairModal';
import { ShieldCheck } from 'lucide-react';

interface HistoryRibbonProps {
  history: RoundHistoryEntry[];
}

export function HistoryRibbon({ history }: HistoryRibbonProps) {
  const [selectedRound, setSelectedRound] = useState<RoundHistoryEntry | null>(null);

  const getBadgeStyle = (mult: number) => {
    if (mult < 1.5) {
      return 'bg-crash/10 text-crash border-crash/30 hover:bg-crash/20';
    } else if (mult < 2.0) {
      return 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20';
    } else if (mult < 10.0) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20';
    } else {
      return 'bg-gradient-to-r from-amber-500/20 to-purple-600/20 text-amber-300 border-amber-400/40 hover:brightness-125 shadow-sm shadow-amber-500/20';
    }
  };

  return (
    <>
      <div className="w-full bg-surface/80 backdrop-blur-sm border-y border-border px-2.5 sm:px-3 py-1.5 sm:py-2 flex items-center gap-2 select-none">
        
        {/* LABEL AVEC ICÔNE */}
        <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-mono text-gray-400 uppercase font-semibold whitespace-nowrap pr-2 border-r border-border shrink-0">
          <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
          <span className="hidden xs:inline">Historique :</span>
          <span className="xs:hidden">PF :</span>
        </div>

        {/* RUBAN HORIZONTAL À DÉFILEMENT TACTILE FLUIDE */}
        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5 touch-pan-x">
          {history.map((round) => (
            <button
              key={round.id || round.roundNumber}
              type="button"
              onClick={() => setSelectedRound(round)}
              title={`Manche #${round.roundNumber} (${round.crashPoint.toFixed(2)}x) - Cliquer pour vérifier le Provably Fair`}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-mono font-bold border transition-all duration-150 transform hover:scale-105 active:scale-95 whitespace-nowrap shrink-0 cursor-pointer ${getBadgeStyle(
                round.crashPoint
              )}`}
            >
              {round.crashPoint.toFixed(2)}x
            </button>
          ))}
          {history.length === 0 && (
            <span className="text-[11px] text-gray-500 font-mono italic whitespace-nowrap">
              En attente des premières manches...
            </span>
          )}
        </div>

      </div>

      {selectedRound && (
        <ProvablyFairModal
          round={selectedRound}
          onClose={() => setSelectedRound(null)}
        />
      )}
    </>
  );
}
