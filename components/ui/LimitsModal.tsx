'use client';

import React, { useState } from 'react';
import { X, ShieldAlert, Check, Clock } from 'lucide-react';

interface LimitsModalProps {
  onClose: () => void;
}

export function LimitsModal({ onClose }: LimitsModalProps) {
  const [dailyDepositLimit, setDailyDepositLimit] = useState<number>(500);
  const [maxBetLimit, setMaxBetLimit] = useState<number>(100);
  const [sessionLossLimit, setSessionLossLimit] = useState<number>(200);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0E131F] border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Jeu Responsable & Limites</h3>
              <p className="text-xs text-gray-400">Contrôles de sécurité du compte</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-card transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENU */}
        <div className="p-6 space-y-4 text-xs">
          
          <p className="text-gray-300">
            AEROX applique une politique stricte de modération. Vous pouvez définir vos plafonds stricts pour protéger votre solde.
          </p>

          {isSaved && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Vos limites ont été enregistrées avec succès.</span>
            </div>
          )}

          {/* DÉPÔT QUOTIDIEN MAX */}
          <div className="bg-card p-3 rounded-xl border border-border">
            <label className="text-gray-300 font-semibold block mb-1.5 font-mono">
              Limite de Dépôt Quotidienne (€) :
            </label>
            <input
              type="number"
              value={dailyDepositLimit}
              onChange={(e) => setDailyDepositLimit(parseFloat(e.target.value) || 0)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-primary"
            />
          </div>

          {/* MISE MAX PAR MANCHE */}
          <div className="bg-card p-3 rounded-xl border border-border">
            <label className="text-gray-300 font-semibold block mb-1.5 font-mono">
              Mise Maximale par Tour (€) :
            </label>
            <input
              type="number"
              value={maxBetLimit}
              onChange={(e) => setMaxBetLimit(parseFloat(e.target.value) || 0)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-primary"
            />
          </div>

          {/* PERTE MAX PAR SESSION */}
          <div className="bg-card p-3 rounded-xl border border-border">
            <label className="text-gray-300 font-semibold block mb-1.5 font-mono">
              Plafond de Perte par Session (€) :
            </label>
            <input
              type="number"
              value={sessionLossLimit}
              onChange={(e) => setSessionLossLimit(parseFloat(e.target.value) || 0)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-primary"
            />
          </div>

          {/* AUTO-EXCLUSION */}
          <div className="bg-card/40 p-3 rounded-xl border border-border/80 flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-400">
              <Clock className="w-4 h-4 text-primary" />
              <span>Pause / Auto-exclusion (24h)</span>
            </div>
            <button
              onClick={() => alert('Option d’auto-exclusion temporaire déclenchée. Compte mis en pause pour 24 heures.')}
              className="px-3 py-1 rounded-lg bg-crash/20 text-crash border border-crash/40 hover:bg-crash/30 font-bold transition"
            >
              Activer
            </button>
          </div>

          <button
            onClick={handleSave}
            className="w-full py-3 rounded-xl bg-primary text-black font-bold uppercase tracking-wider hover:bg-primary-hover transition shadow-lg shadow-primary/20 mt-2"
          >
            Enregistrer les Limites
          </button>

        </div>
      </div>
    </div>
  );
}
