'use client';

import React, { useState } from 'react';
import { RoundHistoryEntry } from '@/game-engine/GameEngine';
import { verifyProvablyFair } from '@/lib/provably-fair';
import { X, CheckCircle2, AlertTriangle, Copy, Check, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface ProvablyFairModalProps {
  round: RoundHistoryEntry;
  onClose: () => void;
}

export function ProvablyFairModal({ round, onClose }: ProvablyFairModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const verification = verifyProvablyFair(
    round.serverSeed,
    round.serverSeedHash,
    round.clientSeed,
    round.nonce,
    round.crashPoint
  );

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#0D121F] border border-border w-full max-w-xl max-h-[92vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        
        {/* EN-TÊTE */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border flex items-center justify-between bg-surface/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Vérification Provably Fair</h3>
              <p className="text-[11px] sm:text-xs text-gray-400 font-mono">Manche #{round.roundNumber}</p>
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
        <div className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto">
          
          {/* STATUT DE VÉRIFICATION */}
          <div className={`p-3.5 sm:p-4 rounded-xl border flex items-start gap-3 ${
            verification.isValid
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-crash/10 border-crash/30 text-crash'
          }`}>
            {verification.isValid ? (
              <CheckCircle2 className="w-5 h-5 mt-0.5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 mt-0.5 text-crash shrink-0" />
            )}
            <div>
              <p className="text-xs sm:text-sm font-bold">
                {verification.isValid
                  ? 'Résultat Mathématiquement Authentique & Inaltéré'
                  : 'Échec de la validation cryptographique !'}
              </p>
              <p className="text-[11px] sm:text-xs opacity-90 mt-0.5 font-mono">
                Multiplicateur certifié : <span className="font-bold text-white">{round.crashPoint.toFixed(2)}x</span>
              </p>
            </div>
          </div>

          {/* DÉTAILS TECHNIQUES CRYPTOGRAPHIQUES */}
          <div className="space-y-3 font-mono text-xs">
            
            {/* Hash Publié avant la manche */}
            <div className="bg-card p-3 rounded-xl border border-border/80">
              <div className="flex justify-between items-center text-gray-400 mb-1">
                <span className="text-[11px]">Engagement SHA-256 (Hash publié) :</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(round.serverSeedHash, 'hash')}
                  className="text-primary hover:underline flex items-center gap-1 p-1"
                  aria-label="Copier le hash"
                >
                  {copiedField === 'hash' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-gray-200 break-all select-all font-mono text-[11px]">{round.serverSeedHash}</p>
            </div>

            {/* Graine Serveur Révélée */}
            <div className="bg-card p-3 rounded-xl border border-border/80">
              <div className="flex justify-between items-center text-gray-400 mb-1">
                <span className="text-[11px]">Graine Serveur secrète (Révélée) :</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(round.serverSeed, 'sSeed')}
                  className="text-primary hover:underline flex items-center gap-1 p-1"
                  aria-label="Copier la graine"
                >
                  {copiedField === 'sSeed' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-gray-200 break-all select-all font-mono text-[11px]">{round.serverSeed}</p>
            </div>

            {/* Graine Client & Nonce */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              <div className="bg-card p-3 rounded-xl border border-border/80">
                <span className="text-gray-400 block mb-1 text-[11px]">Graine Client :</span>
                <p className="text-gray-200 truncate text-[11px]">{round.clientSeed}</p>
              </div>
              <div className="bg-card p-3 rounded-xl border border-border/80">
                <span className="text-gray-400 block mb-1 text-[11px]">Nonce :</span>
                <p className="text-gray-200 font-bold text-[11px]">{round.nonce}</p>
              </div>
            </div>

          </div>

          {/* LIEN VERS CALCULATEUR */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="text-gray-400 text-[11px]">Vérifiable sur n’importe quel script HMAC-SHA512 externe.</span>
            <Link
              href={`/provably-fair?sSeed=${round.serverSeed}&hash=${round.serverSeedHash}&cSeed=${round.clientSeed}&nonce=${round.nonce}&cp=${round.crashPoint}`}
              className="text-primary hover:underline flex items-center gap-1 font-semibold"
            >
              Calculateur complet
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
