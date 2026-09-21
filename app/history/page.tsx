'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useAuth } from '@/components/providers/AuthProvider';
import { RoundHistoryEntry } from '@/game-engine/GameEngine';
import { ProvablyFairModal } from '@/components/ui/ProvablyFairModal';
import { formatCurrency, formatMultiplier } from '@/lib/utils';
import { History, ShieldCheck, User } from 'lucide-react';

export default function HistoryPage() {
  const { user, currency } = useAuth();
  const [view, setView] = useState<'public' | 'user'>('public');
  const [publicHistory, setPublicHistory] = useState<RoundHistoryEntry[]>([]);
  const [userBets, setUserBets] = useState<any[]>([]);
  const [selectedRound, setSelectedRound] = useState<RoundHistoryEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [view]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      if (view === 'public') {
        const res = await fetch('/api/games/history');
        if (res.ok) {
          const data = await res.json();
          setPublicHistory(data.history || []);
        }
      } else {
        const token = localStorage.getItem('aerox_jwt');
        if (token) {
          const res = await fetch('/api/bets', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setUserBets(data.bets || []);
          }
        }
      }
    } catch {}
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#080B10] text-gray-100 flex flex-col">
      <Navbar />

      <main className="max-w-6xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-8 flex-1 space-y-4 sm:space-y-6">
        
        {/* TITRE ET COMMUTATEUR DE VUE */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-border pb-4 sm:pb-6">
          <div>
            <h1 className="text-xl sm:text-3xl font-black text-white flex items-center gap-2">
              <History className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
              Historique des Parties
            </h1>
            <p className="text-[11px] sm:text-xs text-gray-400 mt-1">
              Historique public Provably Fair et journal personnel de vos mises
            </p>
          </div>

          {/* SÉLECTEUR D'ONGLETS RESPONSIVE */}
          <div className="w-full sm:w-auto grid grid-cols-2 sm:flex items-center bg-surface p-1 rounded-xl border border-border gap-1 text-xs">
            <button
              type="button"
              onClick={() => setView('public')}
              className={`py-2 px-3 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
                view === 'public'
                  ? 'bg-primary text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Public (Provably Fair)</span>
            </button>
            <button
              type="button"
              onClick={() => setView('user')}
              className={`py-2 px-3 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
                view === 'user'
                  ? 'bg-primary text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Mes Paris</span>
            </button>
          </div>
        </div>

        {/* CONTENU */}
        <div className="bg-[#0E131F] border border-border rounded-2xl overflow-hidden shadow-2xl">
          {view === 'public' ? (
            <>
              {/* 1. VUE CARTE MOBILE POUR HISTORIQUE PUBLIC (< 640px) */}
              <div className="sm:hidden divide-y divide-border/50">
                {publicHistory.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 font-mono text-xs">
                    Chargement des manches publiques...
                  </div>
                ) : (
                  publicHistory.map((round) => (
                    <div key={round.id || round.roundNumber} className="p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-white text-xs">
                          Manche #{round.roundNumber}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${
                              round.crashPoint < 1.5
                                ? 'bg-crash/10 border-crash/30 text-crash'
                                : round.crashPoint < 2.0
                                ? 'bg-primary/10 border-primary/30 text-primary'
                                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            }`}
                          >
                            {formatMultiplier(round.crashPoint)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedRound(round)}
                            className="px-2 py-1 rounded bg-surface border border-border text-primary text-[11px] font-bold"
                          >
                            Vérifier
                          </button>
                        </div>
                      </div>
                      <div className="text-[10px] font-mono text-gray-400 space-y-0.5">
                        <div className="truncate">
                          <span className="text-gray-500">Hash: </span>
                          <span className="text-gray-300">{round.serverSeedHash}</span>
                        </div>
                        <div className="truncate">
                          <span className="text-gray-500">Seed: </span>
                          <span className="text-gray-300">{round.serverSeed}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* 2. VUE TABLE DESKTOP / TABLETTE (>= 640px) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface/90 border-b border-border text-gray-400 font-mono uppercase">
                    <tr>
                      <th className="py-3.5 px-4">Manche</th>
                      <th className="py-3.5 px-4">Multiplicateur</th>
                      <th className="py-3.5 px-4">Hash SHA-256</th>
                      <th className="py-3.5 px-4">Graine Serveur</th>
                      <th className="py-3.5 px-4 text-right">Vérification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 font-mono">
                    {publicHistory.map((round) => (
                      <tr key={round.id || round.roundNumber} className="hover:bg-card/40 transition">
                        <td className="py-3 px-4 font-bold text-white">#{round.roundNumber}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                              round.crashPoint < 1.5
                                ? 'bg-crash/10 border-crash/30 text-crash'
                                : round.crashPoint < 2.0
                                ? 'bg-primary/10 border-primary/30 text-primary'
                                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            }`}
                          >
                            {formatMultiplier(round.crashPoint)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-400 max-w-xs truncate" title={round.serverSeedHash}>
                          {round.serverSeedHash}
                        </td>
                        <td className="py-3 px-4 text-gray-400 max-w-xs truncate" title={round.serverSeed}>
                          {round.serverSeed}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedRound(round)}
                            className="px-2.5 py-1 rounded-lg bg-surface border border-border text-primary hover:border-primary transition inline-flex items-center gap-1 font-sans font-semibold text-[11px]"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Vérifier
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              {/* VUE MES PARIS */}
              {!user ? (
                <div className="p-8 text-center text-gray-400 text-xs sm:text-sm">
                  Connectez-vous pour voir l'historique de vos paris.
                </div>
              ) : userBets.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs sm:text-sm">
                  Vous n'avez pas encore placé de pari sur la plateforme.
                </div>
              ) : (
                <>
                  {/* 1. VUE CARTE MOBILE POUR MES PARIS (< 640px) */}
                  <div className="sm:hidden divide-y divide-border/50">
                    {userBets.map((bet) => (
                      <div key={bet.id} className="p-3.5 space-y-1.5 font-mono text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">BET {bet.panelIndex}</span>
                          <span
                            className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                              bet.status === 'CASHED_OUT'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : bet.status === 'LOST'
                                ? 'bg-crash/20 text-crash'
                                : 'bg-primary/20 text-primary'
                            }`}
                          >
                            {bet.status === 'CASHED_OUT'
                              ? 'GAGNÉ'
                              : bet.status === 'LOST'
                              ? 'PERDU'
                              : bet.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-400">
                            Mise : <strong className="text-white">{formatCurrency(bet.amount, currency)}</strong>
                          </span>
                          <span className="text-gray-400">
                            Retrait : <strong className="text-amber-300">{bet.cashoutMultiplier ? formatMultiplier(bet.cashoutMultiplier) : '—'}</strong>
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                          <span className="text-gray-500">Résultat net :</span>
                          <span
                            className={`font-bold ${
                              bet.profit && bet.profit > 0
                                ? 'text-emerald-400'
                                : bet.profit && bet.profit < 0
                                ? 'text-crash'
                                : 'text-gray-400'
                            }`}
                          >
                            {bet.profit !== null && bet.profit !== undefined
                              ? (bet.profit > 0 ? '+' : '') + formatCurrency(bet.profit, currency)
                              : '-'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 2. VUE TABLEAU DESKTOP (>= 640px) */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface/90 border-b border-border text-gray-400 font-mono uppercase">
                        <tr>
                          <th className="py-3.5 px-4">Panneau</th>
                          <th className="py-3.5 px-4">Montant Misé</th>
                          <th className="py-3.5 px-4">Cash-out</th>
                          <th className="py-3.5 px-4">Statut</th>
                          <th className="py-3.5 px-4 text-right">Gain / Perte</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50 font-mono">
                        {userBets.map((bet) => (
                          <tr key={bet.id} className="hover:bg-card/40 transition">
                            <td className="py-3 px-4 font-semibold text-white">BET {bet.panelIndex}</td>
                            <td className="py-3 px-4 font-bold text-white">{formatCurrency(bet.amount, currency)}</td>
                            <td className="py-3 px-4">
                              {bet.cashoutMultiplier ? formatMultiplier(bet.cashoutMultiplier) : '-'}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  bet.status === 'CASHED_OUT'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : bet.status === 'LOST'
                                    ? 'bg-crash/20 text-crash'
                                    : 'bg-primary/20 text-primary'
                                }`}
                              >
                                {bet.status === 'CASHED_OUT'
                                  ? 'GAGNÉ'
                                  : bet.status === 'LOST'
                                  ? 'PERDU'
                                  : bet.status}
                              </span>
                            </td>
                            <td
                              className={`py-3 px-4 text-right font-bold ${
                                bet.profit && bet.profit > 0
                                  ? 'text-emerald-400'
                                  : bet.profit && bet.profit < 0
                                  ? 'text-crash'
                                  : 'text-gray-400'
                              }`}
                            >
                              {bet.profit !== null && bet.profit !== undefined
                                ? (bet.profit > 0 ? '+' : '') + formatCurrency(bet.profit, currency)
                                : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </div>

      </main>

      {selectedRound && (
        <ProvablyFairModal
          round={selectedRound}
          onClose={() => setSelectedRound(null)}
        />
      )}
    </div>
  );
}
