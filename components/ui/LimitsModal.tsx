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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#0E131F] border border-border w-full max-w-md max-h-[92vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border flex items-center justify-between bg-surface/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Jeu Responsable & Limites</h3>
              <p className="text-[11px] sm:text-xs text-gray-400">Contrôles et plafonds du compte</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 min-w-[36px] min-h-[36px] rounded-lg text-gray-400 hover:text-white hover:bg-card transition flex items-center justify-center"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENU SCROLLABLE */}
        <div className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 text-xs overflow-y-auto">
          
          <p className="text-gray-300">
            AEROX applique une politique stricte de modération. Vous pouvez définir vos plafonds stricts pour protéger votre solde.
          </p>

          {isSaved && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
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
              className="px-3 py-1.5 rounded-lg bg-crash/20 text-crash border border-crash/40 hover:bg-crash/30 font-bold transition"
            >
              Activer
            </button>
          </div>

          <button
            onClick={handleSave}
            className="w-full min-h-[48px] py-3 rounded-xl bg-primary text-black font-bold uppercase tracking-wider hover:bg-primary-hover active:scale-98 transition shadow-lg shadow-primary/20 mt-2"
          >
            Enregistrer les Limites
          </button>

        </div>
      </div>
    </div>
  );
}
