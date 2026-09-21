'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../providers/AuthProvider';
import { soundManager } from '@/lib/sound';
import { socketClient } from '@/websocket/SocketClient';
import { formatCurrency } from '@/lib/utils';
import { EmailVerificationBanner } from '@/components/ui/EmailVerificationBanner';
import {
  ShieldCheck,
  History,
  LayoutDashboard,
  Volume2,
  VolumeX,
  Wallet,
  LogOut,
  PlusCircle,
  ArrowUpRight,
  Menu,
  X,
  Radio,
  SlidersHorizontal,
  Music,
  Zap,
} from 'lucide-react';

interface NavbarProps {
  onOpenDeposit?: () => void;
  onOpenWithdrawal?: () => void;
  onOpenLimits?: () => void;
  onOpenAuth?: (mode: 'login' | 'register') => void;
}

export function Navbar({ onOpenDeposit, onOpenWithdrawal, onOpenLimits, onOpenAuth }: NavbarProps) {
  const pathname = usePathname();
  const { user, balance, currency, logout } = useAuth();
  const [isMuted, setIsMuted] = useState(soundManager.getIsMuted());
  const [isMusicPlaying, setIsMusicPlaying] = useState(soundManager.isBgmActive());
  const [latency, setLatency] = useState(0);
  const [isConnected, setIsConnected] = useState(socketClient.isConnected);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    soundManager.initInteractionAutoPlay();
    const unsubBgm = soundManager.onBgmChange((playing) => {
      setIsMusicPlaying(playing);
    });
    const unsubLat = socketClient.on('latency', (l: number) => setLatency(l));
    const unsubConn = socketClient.on('connection.open', () => setIsConnected(true));
    const unsubDisc = socketClient.on('connection.close', () => setIsConnected(false));

    return () => {
      unsubBgm();
      unsubLat();
      unsubConn();
      unsubDisc();
    };
  }, []);

  // Ferme le menu mobile lors du changement de page
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const toggleSound = () => {
    const nextState = !isMuted;
    soundManager.setMuted(nextState);
    setIsMuted(nextState);
  };

  const toggleMusic = () => {
    const nextState = soundManager.toggleBgm();
    setIsMusicPlaying(nextState);
  };

  const isCurrent = (path: string) => pathname === path;

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#080B10]/95 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
          
          {/* LOGO & BRANDING */}
          <div className="flex items-center gap-2 sm:gap-6 shrink-0">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary via-accent to-purple-800 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform shrink-0">
                <span className="font-black text-black text-base sm:text-xl italic tracking-tighter">AX</span>
              </div>
              <div className="flex flex-col">
                <span className="text-base sm:text-xl font-black tracking-wider text-white flex items-center gap-1 sm:gap-1.5">
                  AEROX <span className="text-primary text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.2 rounded bg-primary/10 border border-primary/20">CRASH</span>
                </span>
                <span className="hidden xs:inline text-[9px] sm:text-[10px] text-gray-400 font-mono tracking-widest uppercase">Quantum Velocity</span>
              </div>
            </Link>

            {/* NAVIGATION PRINCIPALE (DESKTOP) */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isCurrent('/') ? 'text-primary bg-primary/10' : 'text-gray-300 hover:text-white hover:bg-surface'
                }`}
              >
                Arène de Jeu
              </Link>
              <Link
                href="/provably-fair"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  isCurrent('/provably-fair') ? 'text-primary bg-primary/10' : 'text-gray-300 hover:text-white hover:bg-surface'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Provably Fair
              </Link>
              <Link
                href="/history"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  isCurrent('/history') ? 'text-primary bg-primary/10' : 'text-gray-300 hover:text-white hover:bg-surface'
                }`}
              >
                <History className="w-4 h-4 text-accent" />
                Historique
              </Link>
              {(pathname.startsWith('/admin') || (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'SUPPORT'))) && (
                <Link
                  href="/admin"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                    pathname.startsWith('/admin') ? 'text-amber-400 bg-amber-400/10 border border-amber-400/30 font-bold shadow-sm shadow-amber-500/10' : 'text-amber-400/80 hover:text-amber-300 hover:bg-surface'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-amber-400" />
                  Administration
                </Link>
              )}
            </nav>
          </div>

          {/* BARRE CENTRALE / MOBILE SOLDE PILL */}
          {user && (
            <button
              onClick={() => (onOpenDeposit ? onOpenDeposit() : setMobileMenuOpen(true))}
              className="md:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface border border-border text-xs active:scale-95 transition"
              title="Cliquer pour recharger"
            >
              <Wallet className={`w-3.5 h-3.5 ${user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? 'text-amber-400' : 'text-primary'}`} />
              <span className={`font-mono font-bold text-xs tracking-tight ${user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? 'text-amber-300' : 'text-white'}`}>
                {formatCurrency(balance, currency)}
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1 rounded font-bold">+</span>
            </button>
          )}

          {/* ACTIONS & CONTROLES DROITE */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* Indicateur de Latence & Ping (Desktop) */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-border text-[11px] font-mono">
              <Radio className={`w-3 h-3 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-crash'}`} />
              <span className={isConnected ? 'text-gray-300' : 'text-crash font-bold'}>
                {isConnected ? `${latency}ms` : 'Déconnecté'}
              </span>
            </div>

            {/* Toggle Musique Cyberpunk Synthwave (Desktop) */}
            <button
              onClick={toggleMusic}
              aria-label={isMusicPlaying ? 'Couper la musique' : 'Activer la musique de fond'}
              className={`hidden sm:flex p-2 rounded-lg border transition items-center gap-1.5 cursor-pointer ${
                isMusicPlaying
                  ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-md shadow-purple-500/20'
                  : 'bg-surface border border-border text-gray-400 hover:text-white hover:border-gray-600'
              }`}
              title={isMusicPlaying ? 'Couper la musique synthwave' : 'Activer la musique synthwave'}
            >
              <Music className={`w-4 h-4 ${isMusicPlaying ? 'text-purple-400 animate-pulse' : 'text-gray-400'}`} />
              <span className="hidden xl:inline text-[10px] font-mono font-bold">
                {isMusicPlaying ? 'BGM ON' : 'BGM'}
              </span>
            </button>

            {/* Toggle Effets Sonores */}
            <button
              onClick={toggleSound}
              aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
              className="p-2 min-w-[36px] min-h-[36px] rounded-lg bg-surface border border-border text-gray-300 hover:text-white hover:border-gray-600 transition flex items-center justify-center cursor-pointer"
              title={isMuted ? 'Activer les effets sonores' : 'Couper les effets sonores'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-crash" /> : <Volume2 className="w-4 h-4 text-primary" />}
            </button>

            {/* Limites de Jeu Responsable (Desktop) */}
            {user && onOpenLimits && (
              <button
                onClick={onOpenLimits}
                title="Jeu Responsable & Limites"
                className="hidden sm:flex p-2 rounded-lg bg-surface border border-border text-gray-300 hover:text-yellow-400 transition"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            )}

            {/* Solde & Actions Utilisateur (Desktop) */}
            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <div className="flex items-center bg-surface border border-border rounded-xl px-3 py-1.5 gap-2.5">
                  <Wallet className={`w-4 h-4 ${user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? 'text-amber-400' : 'text-primary'}`} />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold">
                      {user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? 'Trésorerie Admin' : 'Solde'}
                    </span>
                    <span className={`text-sm font-black font-mono tracking-tight ${user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? 'text-amber-300' : 'text-white'}`}>
                      {formatCurrency(balance, currency)}
                    </span>
                  </div>
                  {onOpenDeposit && (
                    <button
                      onClick={onOpenDeposit}
                      className="ml-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-bold text-xs hover:brightness-110 active:scale-95 transition flex items-center gap-1 shadow-md shadow-emerald-500/20"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Dépôt
                    </button>
                  )}
                  {onOpenWithdrawal && (
                    <button
                      onClick={onOpenWithdrawal}
                      className="px-2.5 py-1 rounded-lg bg-surface border border-border text-gray-300 font-bold text-xs hover:text-white hover:border-gray-500 active:scale-95 transition flex items-center gap-1"
                      title="Retirer des fonds"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Retrait</span>
                    </button>
                  )}
                </div>

                {/* Profil & Déconnexion */}
                <div className="flex items-center gap-1.5 pl-1">
                  {user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? (
                    <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-lg">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-black px-1.5 py-0.5 rounded">
                        ADMIN
                      </span>
                      <span className="text-xs font-semibold text-amber-200 max-w-[100px] truncate">
                        {user.username}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 bg-surface border border-border px-2 py-1 rounded-lg">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1 py-0.5">
                        JOUEUR
                      </span>
                      <span className="text-xs font-semibold text-gray-300 max-w-[90px] truncate">
                        {user.username}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={logout}
                    title="Se déconnecter"
                    className="p-2 rounded-lg bg-surface border border-border text-gray-400 hover:text-crash transition"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                {onOpenAuth ? (
                  <>
                    <button
                      onClick={() => onOpenAuth('login')}
                      className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-gray-200 hover:text-white hover:bg-surface border border-transparent hover:border-border transition"
                    >
                      Connexion
                    </button>
                    <button
                      onClick={() => onOpenAuth('register')}
                      className="px-4 py-1.5 rounded-lg text-sm font-bold bg-primary text-black hover:bg-primary-hover shadow-lg shadow-primary/20 active:scale-95 transition"
                    >
                      Inscription
                    </button>
                  </>
                ) : (
                  <Link
                    href="/auth/login"
                    className="px-4 py-1.5 rounded-lg text-sm font-bold bg-primary text-black hover:bg-primary-hover shadow-lg shadow-primary/20 transition"
                  >
                    Connexion
                  </Link>
                )}
              </div>
            )}

            {/* Hamburger Mobile Trigger (44px min target) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-surface border border-border text-gray-200 active:scale-95 transition"
              aria-label="Ouvrir le menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-primary" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>
        </div>

        {/* TIROIR MOBILE EXPANDED (Slide-Down Tactile & Fluide) */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0A0D14]/98 backdrop-blur-xl border-b border-border px-4 py-4 space-y-4 animate-in slide-in-from-top-2 duration-200 shadow-2xl">
            
            {/* CARTE UTILISATEUR OU BOUTONS D'AUTH */}
            {user ? (
              <div className="p-3.5 rounded-2xl bg-card border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-xs">
                      {user.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-white">{user.username}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{user.email}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                    user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'
                      ? 'bg-amber-500 text-black'
                      : 'bg-surface text-gray-300 border border-border'
                  }`}>
                    {user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? 'ADMIN' : 'JOUEUR'}
                  </span>
                </div>

                {/* SOLDE ET ACTIONS */}
                <div className="bg-surface/80 p-3 rounded-xl border border-border flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 uppercase font-mono font-semibold">Solde Disponible</span>
                    <span className="text-base font-black font-mono text-white">
                      {formatCurrency(balance, currency)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {onOpenDeposit && (
                      <button
                        onClick={() => { setMobileMenuOpen(false); onOpenDeposit(); }}
                        className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-black text-xs active:scale-95 transition flex items-center gap-1 shadow-md shadow-emerald-500/20"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Dépôt
                      </button>
                    )}
                    {onOpenWithdrawal && (
                      <button
                        onClick={() => { setMobileMenuOpen(false); onOpenWithdrawal(); }}
                        className="px-3 py-2 rounded-xl bg-surface border border-border text-gray-300 font-bold text-xs hover:text-white active:scale-95 transition flex items-center gap-1"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                        Retrait
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {onOpenAuth ? (
                  <>
                    <button
                      onClick={() => { setMobileMenuOpen(false); onOpenAuth('login'); }}
                      className="py-3 px-4 rounded-xl text-center font-bold text-sm bg-surface border border-border text-gray-200 active:scale-95 transition"
                    >
                      Connexion
                    </button>
                    <button
                      onClick={() => { setMobileMenuOpen(false); onOpenAuth('register'); }}
                      className="py-3 px-4 rounded-xl text-center font-bold text-sm bg-primary text-black active:scale-95 transition shadow-lg shadow-primary/20"
                    >
                      Inscription
                    </button>
                  </>
                ) : (
                  <Link
                    href="/auth/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="col-span-2 py-3 px-4 rounded-xl text-center font-bold text-sm bg-primary text-black"
                  >
                    Connexion Pilote
                  </Link>
                )}
              </div>
            )}

            {/* LIENS DE NAVIGATION */}
            <div className="space-y-1">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  isCurrent('/') ? 'bg-primary/10 text-primary font-bold' : 'text-gray-300 hover:bg-surface'
                }`}
              >
                <Zap className="w-4 h-4 text-primary" />
                <span>Arène de Jeu (Crash)</span>
              </Link>
              <Link
                href="/provably-fair"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  isCurrent('/provably-fair') ? 'bg-primary/10 text-primary font-bold' : 'text-gray-300 hover:bg-surface'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Provably Fair (Certifié)</span>
              </Link>
              <Link
                href="/history"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  isCurrent('/history') ? 'bg-primary/10 text-primary font-bold' : 'text-gray-300 hover:bg-surface'
                }`}
              >
                <History className="w-4 h-4 text-accent" />
                <span>Historique des Manches</span>
              </Link>

              {user && onOpenLimits && (
                <button
                  onClick={() => { setMobileMenuOpen(false); onOpenLimits(); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:bg-surface text-left transition"
                >
                  <SlidersHorizontal className="w-4 h-4 text-yellow-400" />
                  <span>Jeu Responsable & Limites</span>
                </button>
              )}

              {(pathname.startsWith('/admin') || (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'SUPPORT'))) && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20"
                >
                  <LayoutDashboard className="w-4 h-4 text-amber-400" />
                  <span>Dashboard Supervision Admin</span>
                </Link>
              )}
            </div>

            {/* CONTRÔLES AUDIO & TÉLÉMÉTRIE SUR MOBILE */}
            <div className="pt-2 border-t border-border/80 grid grid-cols-2 gap-2 text-xs font-mono">
              <button
                onClick={toggleMusic}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 transition ${
                  isMusicPlaying
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                    : 'bg-surface border-border text-gray-400'
                }`}
              >
                <Music className="w-4 h-4" />
                <span>Musique {isMusicPlaying ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={toggleSound}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 transition ${
                  !isMuted
                    ? 'bg-primary/20 border-primary/40 text-primary'
                    : 'bg-surface border-border text-gray-400'
                }`}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-crash" /> : <Volume2 className="w-4 h-4" />}
                <span>Sons {!isMuted ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            {/* DÉCONNEXION */}
            {user && (
              <button
                onClick={() => { setMobileMenuOpen(false); logout(); }}
                className="w-full py-3 rounded-xl bg-crash/10 border border-crash/30 text-crash font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Se Déconnecter</span>
              </button>
            )}

            {/* STATUT CONNEXION */}
            <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-gray-500 pt-1">
              <Radio className={`w-3 h-3 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-crash'}`} />
              <span>{isConnected ? `Connecté au Serveur (${latency}ms)` : 'Déconnecté du Serveur'}</span>
            </div>

          </div>
        )}
      </header>
      <EmailVerificationBanner />
    </>
  );
}
