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
  User as UserIcon,
  PlusCircle,
  ArrowUpRight,
  Menu,
  X,
  Radio,
  SlidersHorizontal,
  Music,
  Music2,
} from 'lucide-react';

interface NavbarProps {
  onOpenDeposit?: () => void;
  onOpenWithdrawal?: () => void;
  onOpenLimits?: () => void;
  onOpenAuth?: (mode: 'login' | 'register') => void;
}

export function Navbar({ onOpenDeposit, onOpenWithdrawal, onOpenLimits, onOpenAuth }: NavbarProps) {
  const pathname = usePathname();
  const { user, balance, currency, logout, login } = useAuth();
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* LOGO & BRANDING */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-accent to-purple-800 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
              <span className="font-black text-black text-xl italic tracking-tighter">AX</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-wider text-white flex items-center gap-1.5">
                AEROX <span className="text-primary text-xs px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">CRASH</span>
              </span>
              <span className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">Quantum Velocity</span>
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

        {/* STATUT CONNEXION & UTILISATEUR */}
        <div className="flex items-center gap-3">
          
          {/* Indicateur de Latence & Ping */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-border text-[11px] font-mono">
            <Radio className={`w-3 h-3 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-crash'}`} />
            <span className={isConnected ? 'text-gray-300' : 'text-crash font-bold'}>
              {isConnected ? `${latency}ms` : 'Déconnecté'}
            </span>
          </div>

          {/* Toggle Musique de Fond Synthwave */}
          <button
            onClick={toggleMusic}
            aria-label={isMusicPlaying ? 'Couper la musique' : 'Activer la musique de fond'}
            className={`p-2 rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
              isMusicPlaying
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-md shadow-purple-500/20'
                : 'bg-surface border border-border text-gray-400 hover:text-white hover:border-gray-600'
            }`}
            title={isMusicPlaying ? 'Musique de fond Cyberpunk activée (Cliquer pour couper)' : 'Activer la musique de fond Cyberpunk'}
          >
            <Music className={`w-4 h-4 ${isMusicPlaying ? 'text-purple-400 animate-pulse' : 'text-gray-400'}`} />
            <span className="hidden xl:inline text-[10px] font-mono font-bold tracking-tight">
              {isMusicPlaying ? 'BGM ON' : 'BGM'}
            </span>
          </button>

          {/* Toggle Effets Sonores */}
          <button
            onClick={toggleSound}
            aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
            className="p-2 rounded-lg bg-surface border border-border text-gray-300 hover:text-white hover:border-gray-600 transition cursor-pointer"
            title={isMuted ? 'Activer les effets sonores' : 'Couper les effets sonores'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-crash" /> : <Volume2 className="w-4 h-4 text-primary" />}
          </button>

          {/* Limites de Jeu Responsable */}
          {user && onOpenLimits && (
            <button
              onClick={onOpenLimits}
              title="Jeu Responsable & Limites"
              className="p-2 rounded-lg bg-surface border border-border text-gray-300 hover:text-yellow-400 transition"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          )}

          {/* Solde & Actions Utilisateur */}
          {/* Solde & Actions Utilisateur */}
          {user ? (
            <div className="flex items-center gap-2">
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
                {onOpenDeposit && user.role === 'USER' && (
                  <button
                    onClick={onOpenDeposit}
                    className="ml-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-bold text-xs hover:brightness-110 active:scale-95 transition flex items-center gap-1 shadow-md shadow-emerald-500/20"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Dépôt
                  </button>
                )}
                {onOpenWithdrawal && user.role === 'USER' && (
                  <button
                    onClick={onOpenWithdrawal}
                    className="px-2.5 py-1 rounded-lg bg-surface border border-border text-gray-300 font-bold text-xs hover:text-white hover:border-gray-500 active:scale-95 transition flex items-center gap-1"
                    title="Retirer des fonds"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">Retrait</span>
                  </button>
                )}
              </div>

              {/* Profil & Rôle */}
              <div className="flex items-center gap-1.5 pl-1">
                {user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? (
                  <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-lg">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-black px-1.5 py-0.5 rounded">
                      ADMIN
                    </span>
                    <span className="hidden lg:inline text-xs font-semibold text-amber-200 max-w-[120px] truncate">
                      {user.username}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 bg-surface border border-border px-2 py-1 rounded-lg">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1 py-0.5">
                      JOUEUR
                    </span>
                    <span className="hidden lg:inline text-xs font-semibold text-gray-300 max-w-[100px] truncate">
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
            <div className="flex items-center gap-2">
              {onOpenAuth ? (
                <>
                  <button
                    onClick={() => login('demo@aerox.io', 'Demo123!')}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-gradient-to-r from-emerald-400 to-teal-400 text-black hover:brightness-110 shadow-md shadow-emerald-500/20 active:scale-95 transition"
                    title="Connexion instantanée avec 1 500 € pour tester le jeu"
                  >
                    <span>⚡ Joueur Démo (1-clic)</span>
                  </button>
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

          {/* Hamburger Mobile */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-surface border border-border text-gray-300"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* MENU MOBILE EXPANDED */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0A0D14] border-b border-border px-4 py-4 space-y-3">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-200 hover:bg-surface"
          >
            Arène de Jeu
          </Link>
          <Link
            href="/provably-fair"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-200 hover:bg-surface"
          >
            Provably Fair
          </Link>
          <Link
            href="/history"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-200 hover:bg-surface"
          >
            Historique des Manches
          </Link>
          {user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-yellow-400 hover:bg-surface"
            >
              Dashboard Administration
            </Link>
          )}
        </div>
      )}
      </header>
      <EmailVerificationBanner />
    </>
  );
}
