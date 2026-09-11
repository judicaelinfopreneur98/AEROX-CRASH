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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0D121F] border border-border w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* EN-TÊTE */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Vérification Provably Fair</h3>
              <p className="text-xs text-gray-400 font-mono">Manche #{round.roundNumber}</p>
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
        <div className="p-6 space-y-4">
          
          {/* STATUT DE VÉRIFICATION */}
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${
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
              <p className="text-sm font-bold">
                {verification.isValid
                  ? 'Résultat Mathématiquement Authentique & Inaltéré'
                  : 'Échec de la validation cryptographique !'}
              </p>
              <p className="text-xs opacity-90 mt-0.5 font-mono">
                Multiplicateur certifié : <span className="font-bold text-white">{round.crashPoint.toFixed(2)}x</span>
              </p>
            </div>
          </div>

          {/* DÉTAILS TECHNIQUES CRYPTOGRAPHIQUES */}
          <div className="space-y-3 font-mono text-xs">
            
            {/* Hash Publié avant la manche */}
            <div className="bg-card p-3 rounded-xl border border-border/80">
              <div className="flex justify-between items-center text-gray-400 mb-1">
                <span>Engagement SHA-256 (Hash publié avant manche) :</span>
                <button
                  onClick={() => copyToClipboard(round.serverSeedHash, 'hash')}
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  {copiedField === 'hash' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-gray-200 break-all select-all font-mono">{round.serverSeedHash}</p>
            </div>

            {/* Graine Serveur Révélée */}
            <div className="bg-card p-3 rounded-xl border border-border/80">
              <div className="flex justify-between items-center text-gray-400 mb-1">
                <span>Graine Serveur secrète (révélée post-crash) :</span>
                <button
                  onClick={() => copyToClipboard(round.serverSeed, 'sSeed')}
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  {copiedField === 'sSeed' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-gray-200 break-all select-all font-mono">{round.serverSeed}</p>
            </div>

            {/* Graine Client & Nonce */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card p-3 rounded-xl border border-border/80">
                <span className="text-gray-400 block mb-1">Graine Client :</span>
                <p className="text-gray-200 truncate">{round.clientSeed}</p>
              </div>
              <div className="bg-card p-3 rounded-xl border border-border/80">
                <span className="text-gray-400 block mb-1">Nonce :</span>
                <p className="text-gray-200 font-bold">{round.nonce}</p>
              </div>
            </div>

          </div>

          {/* LIEN VERS CALCULATEUR INDÉPENDANT */}
          <div className="pt-2 flex justify-between items-center text-xs">
            <span className="text-gray-400">Vérifiable sur n’importe quel script HMAC-SHA256 externe.</span>
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
