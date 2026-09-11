'use client';

import React, { useState } from 'react';
import { ActivePlayerBet } from '@/game-engine/types';
import { useAuth } from '../providers/AuthProvider';
import { formatCurrency } from '@/lib/utils';
import { Users, Trophy, User, ArrowUpRight } from 'lucide-react';

interface LiveBetsTableProps {
  bets: ActivePlayerBet[];
}

export function LiveBetsTable({ bets }: LiveBetsTableProps) {
  const { user, currency } = useAuth();
  const [tab, setTab] = useState<'all' | 'my' | 'top'>('all');

  const totalVolume = bets.reduce((acc, b) => acc + b.amount, 0);

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
    <div className="bg-surface/80 border border-border rounded-2xl p-4 flex flex-col h-full shadow-lg backdrop-blur-sm">
      
      {/* EN-TÊTE DE TABLE & ONGLETS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        
        {/* STATS RAPIDES */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-gray-300">
            <Users className="w-4 h-4 text-primary" />
            <span className="font-bold text-white">{bets.length}</span>
            <span className="text-gray-400">joueurs</span>
          </div>
          <span className="text-border">|</span>
          <div className="text-gray-400">
            Volume : <span className="text-primary font-bold">{formatCurrency(totalVolume, currency)}</span>
          </div>
        </div>

        {/* SÉLECTEUR D'ONGLETS */}
        <div className="flex items-center bg-card p-1 rounded-xl border border-border gap-1 text-xs">
          <button
            onClick={() => setTab('all')}
            className={`px-3 py-1 rounded-lg font-medium transition ${
              tab === 'all' ? 'bg-primary text-black font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            Tous
          </button>
          <button
            onClick={() => setTab('my')}
            className={`px-3 py-1 rounded-lg font-medium transition ${
              tab === 'my' ? 'bg-primary text-black font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            Mes Paris
          </button>
          <button
            onClick={() => setTab('top')}
            className={`px-3 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
              tab === 'top' ? 'bg-primary text-black font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3 h-3" />
            Top
          </button>
        </div>

      </div>

      {/* TABLEAU DES PARIS EN DIRECT */}
      <div className="flex-1 overflow-y-auto mt-2 pr-1 divide-y divide-border/40 max-h-[300px] sm:max-h-[380px]">
        {filteredBets.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-xs text-gray-500 font-mono italic">
            Aucun pari enregistré pour cette manche
          </div>
        ) : (
          filteredBets.map((bet) => {
            const isMe = user && bet.userId === user.id;
            const isCashed = bet.status === 'CASHED_OUT';

            return (
              <div
                key={bet.betId}
                className={`py-2.5 px-2 flex items-center justify-between text-xs transition-colors rounded-lg ${
                  isCashed
                    ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
                    : isMe
                    ? 'bg-primary/5 hover:bg-primary/10'
                    : 'hover:bg-card/40'
                }`}
              >
                {/* NOM JOUEUR */}
                <div className="flex items-center gap-2 max-w-[130px] truncate">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isCashed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-card text-gray-400 border border-border'
                  }`}>
                    {bet.username.substring(0, 2).toUpperCase()}
                  </div>
                  <span className={`truncate font-medium ${isMe ? 'text-primary font-bold' : 'text-gray-300'}`}>
                    {bet.username} {isMe && '(Vous)'}
                  </span>
                </div>

                {/* MONTANT MISE */}
                <div className="font-mono text-gray-300 font-semibold">
                  {formatCurrency(bet.amount, currency)}
                </div>

                {/* MULTIPLICATEUR ENCAISSÉ OU EN ATTENTE */}
                <div className="w-20 text-center font-mono">
                  {isCashed ? (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[11px] font-bold">
                      {bet.cashoutMultiplier?.toFixed(2)}x
                    </span>
                  ) : (
                    <span className="text-gray-500 text-[11px]">En vol...</span>
                  )}
                </div>

                {/* GAIN OU PROSPECT */}
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
            );
          })
        )}
      </div>

    </div>
  );
}
