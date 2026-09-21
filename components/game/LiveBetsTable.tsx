'use client';

import React, { useState } from 'react';
import { ActivePlayerBet } from '@/game-engine/types';
import { useAuth } from '../providers/AuthProvider';
import { formatCurrency } from '@/lib/utils';
import { Users, Trophy, ArrowUpRight, ChevronDown, ChevronUp } from 'lucide-react';

interface LiveBetsTableProps {
  bets: ActivePlayerBet[];
}

export function LiveBetsTable({ bets }: LiveBetsTableProps) {
  const { user, currency } = useAuth();
  const [tab, setTab] = useState<'all' | 'my' | 'top'>('all');
  const [isCollapsedOnMobile, setIsCollapsedOnMobile] = useState<boolean>(false);

  const totalVolume = bets.reduce((acc, b) => acc + b.amount, 0);
  const myBetsCount = user ? bets.filter((b) => b.userId === user.id).length : 0;

  const filteredBets = bets.filter((b) => {
    if (tab === 'my') {
      return user ? b.userId === user.id : false;
    }
    return true;
  });

  if (tab === 'top') {
    filteredBets.sort((a, b) => (b.profit || 0) - (a.profit || 0));
  }

  return (
    <div className="bg-surface/80 border border-border rounded-2xl p-3 sm:p-4 flex flex-col h-full shadow-lg backdrop-blur-sm">
      
      {/* EN-TÊTE DE TABLE & ONGLETS */}
      <div className="flex flex-col gap-2.5 pb-2.5 border-b border-border">
        
        {/* LIGNE 1 : STATS RAPIDES & TOGGLE MOBILE */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono">
            <div className="flex items-center gap-1 text-gray-300">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span className="font-bold text-white">{bets.length}</span>
              <span className="text-gray-400">{bets.length <= 1 ? 'pari' : 'paris'}</span>
            </div>
            <span className="text-border">|</span>
            <div className="text-gray-400 truncate max-w-[140px] xs:max-w-none">
              Vol : <span className="text-primary font-bold">{formatCurrency(totalVolume, currency)}</span>
            </div>
          </div>

          {/* Bouton pour replier/déplier sur mobile */}
          <button
            type="button"
            onClick={() => setIsCollapsedOnMobile(!isCollapsedOnMobile)}
            className="lg:hidden p-1 rounded-lg bg-card border border-border text-gray-400 hover:text-white flex items-center gap-1 text-[11px] font-mono"
            aria-label={isCollapsedOnMobile ? 'Déplier la table' : 'Replier la table'}
          >
            <span>{isCollapsedOnMobile ? 'Afficher' : 'Réduire'}</span>
            {isCollapsedOnMobile ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* LIGNE 2 : SÉLECTEUR D'ONGLETS (TOUS / MES PARIS / TOP) */}
        {(!isCollapsedOnMobile) && (
          <div className="flex items-center bg-card p-0.5 rounded-xl border border-border gap-1 text-xs">
            <button
              type="button"
              onClick={() => setTab('all')}
              className={`flex-1 py-1 rounded-lg font-medium transition text-center ${
                tab === 'all' ? 'bg-primary text-black font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              Tous ({bets.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('my')}
              className={`flex-1 py-1 rounded-lg font-medium transition text-center ${
                tab === 'my' ? 'bg-primary text-black font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              Mes Paris ({myBetsCount})
            </button>
            <button
              type="button"
              onClick={() => setTab('top')}
              className={`flex-1 py-1 rounded-lg font-medium transition flex items-center justify-center gap-1 ${
                tab === 'top' ? 'bg-primary text-black font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3 h-3" />
              <span>Top</span>
            </button>
          </div>
        )}

      </div>

      {/* TABLEAU DES PARIS EN DIRECT */}
      {(!isCollapsedOnMobile) && (
        <div className="flex-1 overflow-y-auto mt-2 pr-1 divide-y divide-border/40 max-h-[220px] sm:max-h-[300px] lg:max-h-[380px]">
          {filteredBets.length === 0 ? (
            <div className="h-24 flex items-center justify-center text-xs text-gray-500 font-mono italic">
              {tab === 'my' ? 'Vous n\'avez aucun pari en cours' : 'Aucun pari sur cette manche'}
            </div>
          ) : (
            filteredBets.map((bet) => {
              const isMe = user && bet.userId === user.id;
              const isCashed = bet.status === 'CASHED_OUT';

              return (
                <div
                  key={bet.betId}
                  className={`py-2 px-1.5 sm:px-2 transition-colors rounded-lg ${
                    isCashed
                      ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
                      : isMe
                      ? 'bg-primary/5 hover:bg-primary/10'
                      : 'hover:bg-card/40'
                  }`}
                >
                  {/* AFFICHAGE COMPACT MOBILE (< 640px) */}
                  <div className="sm:hidden flex flex-col gap-1 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 max-w-[150px] truncate">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                          isCashed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-card text-gray-400 border border-border'
                        }`}>
                          {bet.username.substring(0, 2).toUpperCase()}
                        </div>
                        <span className={`truncate font-medium ${isMe ? 'text-primary font-bold' : 'text-gray-300'}`}>
                          {bet.username} {isMe && '(Vous)'}
                        </span>
                      </div>

                      {isCashed ? (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold">
                          {bet.cashoutMultiplier?.toFixed(2)}x
                        </span>
                      ) : (
                        <span className="text-gray-500 text-[10px]">En vol...</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400 font-semibold">
                        Mise : {formatCurrency(bet.amount, currency)}
                      </span>
                      {isCashed ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                          <ArrowUpRight className="w-3 h-3" />
                          +{formatCurrency(bet.profit || 0, currency)}
                        </span>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </div>
                  </div>

                  {/* AFFICHAGE TABLEAU DESKTOP / TABLETTE (>= 640px) */}
                  <div className="hidden sm:flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 max-w-[120px] lg:max-w-[140px] truncate">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isCashed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-card text-gray-400 border border-border'
                      }`}>
                        {bet.username.substring(0, 2).toUpperCase()}
                      </div>
                      <span className={`truncate font-medium ${isMe ? 'text-primary font-bold' : 'text-gray-300'}`}>
                        {bet.username} {isMe && '(Vous)'}
                      </span>
                    </div>

                    <div className="font-mono text-gray-300 font-semibold text-xs">
                      {formatCurrency(bet.amount, currency)}
                    </div>

                    <div className="w-16 text-center font-mono">
                      {isCashed ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[11px] font-bold">
                          {bet.cashoutMultiplier?.toFixed(2)}x
                        </span>
                      ) : (
                        <span className="text-gray-500 text-[11px]">En vol...</span>
                      )}
                    </div>

                    <div className="font-mono font-bold text-right min-w-[70px]">
                      {isCashed ? (
                        <span className="text-emerald-400 flex items-center justify-end gap-0.5">
                          <ArrowUpRight className="w-3 h-3" />
                          +{formatCurrency(bet.profit || 0, currency)}
                        </span>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>
      )}

    </div>
  );
}
