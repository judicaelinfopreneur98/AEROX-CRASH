'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { verifyProvablyFair } from '@/lib/provably-fair';
import { ShieldCheck, CheckCircle2, AlertTriangle, Calculator, Code, RefreshCw } from 'lucide-react';

export default function ProvablyFairPage() {
  const [serverSeed, setServerSeed] = useState(
    '4a7d8c912e5f3b601a9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a'
  );
  const [serverSeedHash, setServerSeedHash] = useState(
    '7b49463e2730b209e51c8901eb47b2c019d3ee97072a39281e09540b6169d08e'
  );
  const [clientSeed, setClientSeed] = useState('aerox-global-seed-v1');
  const [nonce, setNonce] = useState(1);
  const [expectedMultiplier, setExpectedMultiplier] = useState<string>('');

  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    handleVerify();
  }, [serverSeed, serverSeedHash, clientSeed, nonce]);

  const handleVerify = () => {
    if (!serverSeed || !serverSeedHash || !clientSeed) return;
    const expNum = expectedMultiplier ? parseFloat(expectedMultiplier) : undefined;
    const res = verifyProvablyFair(
      serverSeed.trim(),
      serverSeedHash.trim(),
      clientSeed.trim(),
      Number(nonce),
      expNum
    );
    setResult(res);
  };

  const loadRandomTest = () => {
    const sSeed = 'e5f9104c8a2b3d7e6f1a9b8c0d2e4f6a8b1c3d5e7f9a0b2c4d6e8f1a3b5c7d9e';
    const sHash = 'fa8d407335d554a9fc5d9f0f951817ba3f8753239a0397034c568ec532f8df14';
    setServerSeed(sSeed);
    setServerSeedHash(sHash);
    setClientSeed('aerox-test-client-2026');
    setNonce(42);
  };

  return (
    <div className="min-h-screen bg-[#080B10] text-gray-100 flex flex-col">
      <Navbar />

      <main className="max-w-5xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-8 flex-1 space-y-6 sm:space-y-8">
        
        {/* TITRE ET BANDEAU */}
        <div className="text-center space-y-2.5 sm:space-y-3">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Transparence Cryptographique Absolue
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            Vérificateur Provably Fair Indépendant
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm max-w-2xl mx-auto leading-relaxed">
            Chez AEROX CRASH, le résultat de chaque manche est scellé avant l’ouverture des paris.
            Aucun administrateur, joueur ou bot ne peut altérer le multiplicateur en cours de jeu.
          </p>
        </div>

        {/* CALCULATEUR INTERACTIF */}
        <div className="bg-[#0E131F] border border-border rounded-2xl p-4 sm:p-8 shadow-2xl space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-3 sm:pb-4 gap-2">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <h2 className="text-sm sm:text-lg font-bold text-white">Calculateur de Manche</h2>
            </div>
            <button
              onClick={loadRandomTest}
              className="text-[11px] sm:text-xs text-primary hover:underline flex items-center gap-1 font-mono"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Exemple</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            
            {/* 1. Graine Serveur */}
            <div>
              <label className="block text-[11px] sm:text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                Graine Serveur (Révélée post-crash) :
              </label>
              <input
                type="text"
                value={serverSeed}
                onChange={(e) => setServerSeed(e.target.value)}
                placeholder="64 caractères hexadécimaux..."
                className="w-full bg-card border border-border focus:border-primary rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-mono text-white focus:outline-none transition"
              />
            </div>

            {/* 2. Hash Graine Serveur */}
            <div>
              <label className="block text-[11px] sm:text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                Hash Publié (SHA-256 diffusé avant la manche) :
              </label>
              <input
                type="text"
                value={serverSeedHash}
                onChange={(e) => setServerSeedHash(e.target.value)}
                placeholder="Hash SHA-256 d'engagement..."
                className="w-full bg-card border border-border focus:border-primary rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-mono text-white focus:outline-none transition"
              />
            </div>

            {/* 3. Graine Client et Nonce */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-[11px] sm:text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                  Graine Client :
                </label>
                <input
                  type="text"
                  value={clientSeed}
                  onChange={(e) => setClientSeed(e.target.value)}
                  className="w-full bg-card border border-border focus:border-primary rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-mono text-white focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block text-[11px] sm:text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                  Nonce :
                </label>
                <input
                  type="number"
                  min="0"
                  value={nonce}
                  onChange={(e) => setNonce(parseInt(e.target.value) || 0)}
                  className="w-full bg-card border border-border focus:border-primary rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-mono text-white focus:outline-none transition"
                />
              </div>
            </div>

          </div>

          {/* RÉSULTAT DU CALCUL */}
          {result && (
            <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border space-y-3 sm:space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                
                {/* Hash SHA-256 Match */}
                <div className={`p-3.5 sm:p-4 rounded-xl border flex items-start gap-3 ${
                  result.hashMatches
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-crash/10 border-crash/30 text-crash'
                }`}>
                  {result.hashMatches ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-crash mt-0.5 shrink-0" />
                  )}
                  <div className="overflow-hidden">
                    <span className="text-[10px] sm:text-xs uppercase font-bold block font-mono">
                      1. Engagement Cryptographique
                    </span>
                    <p className="text-xs sm:text-sm font-bold mt-0.5">
                      {result.hashMatches ? 'SHA-256 Conforme' : 'Hash Invalide !'}
                    </p>
                    <p className="text-[10px] opacity-80 mt-1 font-mono break-all">
                      Calculé : {result.computedHash}
                    </p>
                  </div>
                </div>

                {/* Crash Point Résultant */}
                <div className="p-3.5 sm:p-4 rounded-xl border bg-primary/10 border-primary/30 flex items-start gap-3 text-primary">
                  <Calculator className="w-5 h-5 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[10px] sm:text-xs uppercase font-bold block font-mono text-gray-300">
                      2. Multiplicateur Déterminé (Spribe Aviator)
                    </span>
                    <p className="text-xl sm:text-2xl font-black font-mono text-white mt-0.5">
                      {result.computedCrashPoint.toFixed(2)}x
                    </p>
                    <p className="text-[10px] sm:text-[11px] opacity-80 mt-1 font-mono text-gray-400">
                      HMAC-SHA512 (52 bits / 13 hex)
                    </p>
                  </div>
                </div>

              </div>

              {/* DÉCOMPOSITION TECHNIQUE CRYPTOGRAPHIQUE */}
              <div className="p-3 sm:p-4 rounded-xl bg-card border border-border space-y-2.5 sm:space-y-3 font-mono text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-gray-400 font-bold uppercase text-[10px] sm:text-[11px]">
                    Hash HMAC-SHA512 (128 cars) :
                  </span>
                  <span className={`self-start sm:self-auto px-2 py-0.5 rounded text-[10px] font-bold ${
                    result.isInstantCrash
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {result.isInstantCrash ? '⚡ CRASH 1.00x (h % 33 == 0)' : '✓ VOL STANDARD (h % 33 != 0)'}
                  </span>
                </div>
                <div className="bg-black/60 p-2 sm:p-2.5 rounded-lg text-gray-300 break-all select-all text-[10px] sm:text-[11px] border border-border">
                  {result.sha512Hash}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-[10px] sm:text-[11px] pt-1">
                  <div className="bg-surface p-2 rounded-lg border border-border">
                    <span className="text-gray-500 block text-[9px] sm:text-[10px]">Extrait 52-bit Hex (13 cars) :</span>
                    <span className="text-amber-400 font-bold">{result.hex52}</span>
                  </div>
                  <div className="bg-surface p-2 rounded-lg border border-border">
                    <span className="text-gray-500 block text-[9px] sm:text-[10px]">Valeur Décimale (h) :</span>
                    <span className="text-white font-bold truncate block">{result.decimal52}</span>
                  </div>
                  <div className="bg-surface p-2 rounded-lg border border-border">
                    <span className="text-gray-500 block text-[9px] sm:text-[10px]">Avantage Maison :</span>
                    <span className="text-primary font-bold">
                      {BigInt(result.decimal52) % 33n === 0n ? 'Crash Direct 1.00x' : 'Régulier (> 1.00x)'}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* EXPLICATION FORMULE MATHÉMATIQUE */}
        <div className="bg-surface/60 border border-border rounded-2xl p-4 sm:p-8 space-y-3 sm:space-y-4 text-xs">
          <div className="flex items-center gap-2 text-white font-bold">
            <Code className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
            <h3 className="text-sm sm:text-base font-bold">Standard Provably Fair Spribe Aviator</h3>
          </div>

          <ol className="list-decimal list-inside space-y-2 text-gray-300 font-mono text-[11px] sm:text-xs">
            <li>
              <strong className="text-white">Génération secrète :</strong> Graine serveur aléatoire de 256 bits (64 hex) générée avant la manche.
            </li>
            <li>
              <strong className="text-white">Engagement :</strong> Diffusion publique de <code className="text-primary bg-card px-1 py-0.5 rounded">SHA-256(serverSeed)</code> pour sceller le crash point.
            </li>
            <li>
              <strong className="text-white">HMAC-SHA512 :</strong> Calcul de <code className="text-primary bg-card px-1 py-0.5 rounded">HMAC_SHA512(serverSeed, clientSeed:nonce)</code>.
            </li>
            <li>
              <strong className="text-white">Avantage Maison (~3.03%) :</strong> Si les 52 premiers bits $h \pmod{33} = 0$, crash direct à 1.00x. Sinon :
              <div className="my-2 p-2.5 rounded-lg bg-card text-center text-primary font-bold text-xs sm:text-sm">
                Multiplicateur = floor( (100 * 2^52 - h) / (2^52 - h) ) / 100
              </div>
            </li>
          </ol>
        </div>

      </main>
    </div>
  );
}
