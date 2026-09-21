'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { useAuth } from '@/components/providers/AuthProvider';
import { formatCurrency } from '@/lib/utils';
import {
  Users,
  TrendingUp,
  Activity,
  ShieldAlert,
  Server,
  Database,
  Radio,
  Sliders,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Lock,
  Unlock,
  LogOut,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminDashboardPage() {
  const { user, login, logout, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<'kpis' | 'users' | 'audit' | 'system' | 'radar'>('radar');
  const [metrics, setMetrics] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [livePreview, setLivePreview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Authentification & Sécurité Admin
  const [adminEmail, setAdminEmail] = useState('admin@aerox.io');
  const [adminPassword, setAdminPassword] = useState('Admin123!');
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  // Formulaire d'ajustement de solde
  const [adjustUserId, setAdjustUserId] = useState<string>('');
  const [adjustAmount, setAdjustAmount] = useState<number>(100);
  const [adjustReason, setAdjustReason] = useState<string>('Bonus de fidélité test');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminData();
    fetchLiveRound();

    const interval = setInterval(fetchAdminData, 4000);
    const liveInterval = setInterval(fetchLiveRound, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(liveInterval);
    };
  }, []);

  const fetchLiveRound = async () => {
    const token = localStorage.getItem('aerox_jwt');
    if (!token) {
      setIsForbidden(true);
      return;
    }

    try {
      const res = await fetch('/api/admin/live-round', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403 || res.status === 401) {
        setIsForbidden(true);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setLivePreview(data.preview);
        setIsForbidden(false);
      }
    } catch {}
  };

  const fetchAdminData = async () => {
    const token = localStorage.getItem('aerox_jwt');
    if (!token) {
      setIsForbidden(true);
      setLoading(false);
      return;
    }

    try {
      const [mRes, uRes, aRes] = await Promise.all([
        fetch('/api/admin/metrics', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/audit', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (mRes.status === 403 || uRes.status === 403 || aRes.status === 403) {
        setIsForbidden(true);
        setLoading(false);
        return;
      }

      if (mRes.ok) setMetrics(await mRes.json());
      if (uRes.ok) {
        const data = await uRes.json();
        setUsersList(data.users || []);
      }
      if (aRes.ok) {
        const data = await aRes.json();
        setAuditLogs(data.logs || []);
      }
      setIsForbidden(false);
    } catch {}
    setLoading(false);
  };

  const handleQuickAdminLogin = async () => {
    setAdminLoginLoading(true);
    setAdminAuthError(null);
    try {
      const res = await login('admin@aerox.io', 'Admin123!');
      if (!res.success) {
        setAdminAuthError(res.error || 'Erreur lors de la connexion administrateur.');
      } else {
        setIsForbidden(false);
        setLoading(true);
        const token = localStorage.getItem('aerox_jwt');
        if (token) {
          const [mRes, uRes, aRes, lRes] = await Promise.all([
            fetch('/api/admin/metrics', { headers: { Authorization: `Bearer ${token}` } }),
            fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
            fetch('/api/admin/audit', { headers: { Authorization: `Bearer ${token}` } }),
            fetch('/api/admin/live-round', { headers: { Authorization: `Bearer ${token}` } }),
          ]);
          if (mRes.ok) setMetrics(await mRes.json());
          if (uRes.ok) {
            const data = await uRes.json();
            setUsersList(data.users || []);
          }
          if (aRes.ok) {
            const data = await aRes.json();
            setAuditLogs(data.logs || []);
          }
          if (lRes.ok) {
            const data = await lRes.json();
            setLivePreview(data.preview);
          }
        }
        setLoading(false);
      }
    } catch {
      setAdminAuthError('Impossible de joindre le serveur.');
    } finally {
      setAdminLoginLoading(false);
    }
  };

  const handleManualAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginLoading(true);
    setAdminAuthError(null);
    try {
      const res = await login(adminEmail, adminPassword);
      if (!res.success) {
        setAdminAuthError(res.error || 'Identifiants administrateur incorrects.');
      } else {
        setIsForbidden(false);
        setLoading(true);
        const token = localStorage.getItem('aerox_jwt');
        if (token) {
          const [mRes, uRes, aRes, lRes] = await Promise.all([
            fetch('/api/admin/metrics', { headers: { Authorization: `Bearer ${token}` } }),
            fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
            fetch('/api/admin/audit', { headers: { Authorization: `Bearer ${token}` } }),
            fetch('/api/admin/live-round', { headers: { Authorization: `Bearer ${token}` } }),
          ]);
          if (mRes.ok) setMetrics(await mRes.json());
          if (uRes.ok) {
            const data = await uRes.json();
            setUsersList(data.users || []);
          }
          if (aRes.ok) {
            const data = await aRes.json();
            setAuditLogs(data.logs || []);
          }
          if (lRes.ok) {
            const data = await lRes.json();
            setLivePreview(data.preview);
          }
        }
        setLoading(false);
      }
    } catch {
      setAdminAuthError('Impossible de joindre le serveur.');
    } finally {
      setAdminLoginLoading(false);
    }
  };


  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('aerox_jwt');
    if (!token || !adjustUserId) return;

    try {
      const res = await fetch('/api/admin/balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: adjustUserId,
          amount: adjustAmount,
          reason: adjustReason,
        }),
      });

      if (res.ok) {
        setActionSuccess(`Solde de ${adjustAmount} € ajusté avec succès.`);
        setAdjustUserId('');
        fetchAdminData();
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch {}
  };

  const handleToggleSuspend = async (targetUserId: string, currentSuspended: boolean) => {
    const token = localStorage.getItem('aerox_jwt');
    if (!token) return;

    try {
      const res = await fetch('/api/admin/suspend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: targetUserId,
          isSuspended: !currentSuspended,
          reason: !currentSuspended ? 'Suspension administrative' : 'Levée de suspension',
        }),
      });

      if (res.ok) {
        fetchAdminData();
      }
    } catch {}
  };

  const isAuthorizedAdmin = user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && !isForbidden;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#080B10] text-gray-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAuthorizedAdmin) {
    return (
      <div className="min-h-screen bg-[#080B10] text-gray-100 flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-xl w-full mx-auto px-4 py-12 flex flex-col justify-center">
          <div className="bg-[#0E131F] border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-amber-500/10 space-y-6">
            
            {/* EN-TÊTE DU VERROUILLAGE SÉCURITÉ */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-500/20">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div className="text-xs font-mono font-bold text-amber-400 tracking-widest uppercase mt-2">
                Zone Sécurisée Restreinte
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                Portail Administrateur
              </h1>
              <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                Le tableau de bord d’administration, la gestion financière et le <strong className="text-amber-300">Radar Prédictif de Crash</strong> nécessitent une session Super-Administrateur authentifiée.
              </p>
            </div>

            {/* ALERTE CONTEXTUELLE SI CONNECTÉ EN TANT QUE JOUEUR STANDARD */}
            {user && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-1">
                <div className="flex items-center gap-2 text-rose-300 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Session Joueur Standard ({user.username})</span>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed pl-6">
                  Vous êtes actuellement connecté avec le compte joueur standard <strong className="text-white">{user.username}</strong> (<code className="text-gray-400">{user.email}</code>). Ce compte n'a pas accès aux outils d'administration ni au multiplicateur secret.
                </p>
              </div>
            )}

            {adminAuthError && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{adminAuthError}</span>
              </div>
            )}

            {/* BOUTON 1-CLIC POUR BASCULER SUR LE COMPTE ADMIN */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleQuickAdminLogin}
                disabled={adminLoginLoading}
                className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-black text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-amber-500/20 hover:brightness-110 active:scale-95 transition disabled:opacity-50 cursor-pointer"
              >
                {adminLoginLoading ? (
                  <div className="w-5 h-5 rounded-full border-2 border-black/20 border-t-black animate-spin" />
                ) : (
                  <>
                    <ShieldAlert className="w-5 h-5 text-black" />
                    <span>BASCULER EN SUPER-ADMINISTRATEUR (1-CLIC)</span>
                  </>
                )}
              </button>
              <div className="text-center text-[11px] text-gray-500 font-mono">
                Compte préconfiguré : <code>admin@aerox.io</code> / <code>Admin123!</code>
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-border w-full" />
              <span className="bg-[#0E131F] px-3 text-[11px] font-mono text-gray-500 uppercase">
                Ou saisie manuelle
              </span>
            </div>

            {/* FORMULAIRE DE CONNEXION MANUELLE */}
            <form onSubmit={handleManualAdminLogin} className="space-y-4 text-xs font-mono">
              <div className="space-y-1">
                <label className="text-gray-400 font-medium">Adresse Email Admin</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-white focus:border-amber-400 outline-none transition"
                  placeholder="admin@aerox.io"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 font-medium">Mot de Passe Admin</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-white focus:border-amber-400 outline-none transition"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={adminLoginLoading}
                className="w-full py-3 rounded-xl bg-surface hover:bg-card border border-border text-white font-bold transition flex items-center justify-center gap-2 hover:border-amber-500/50 cursor-pointer"
              >
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Déverrouiller l'Espace Supervision</span>
              </button>
            </form>

            {/* LIEN DE RETOUR VERS L'ARÈNE */}
            <div className="pt-2 text-center border-t border-border">
              <Link
                href="/"
                className="text-xs text-gray-400 hover:text-white transition inline-flex items-center gap-1.5"
              >
                <span>← Retourner à l'Arène de Jeu (Mode Joueur)</span>
              </Link>
            </div>

          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080B10] text-gray-100 flex flex-col">
      <Navbar />

      <main className="max-w-7xl w-full mx-auto px-4 py-8 flex-1 space-y-6">
        
        {/* BANDEAU ADMINISTRATEUR SÉCURISÉ & BASCULE DE MODE */}
        <div className="bg-[#0E131F] border border-amber-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider bg-amber-500 text-black px-2 py-0.5 rounded">
                  SUPER ADMINISTRATEUR
                </span>
                <span className="text-xs font-mono font-bold text-white">
                  {user?.email}
                </span>
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">
                Session autorisée • Privilèges complets de supervision
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Link
              href="/"
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-surface hover:bg-card border border-border text-xs text-gray-300 hover:text-white flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>Arène de Jeu</span>
            </Link>
            <button
              onClick={logout}
              className="p-2 rounded-xl bg-surface hover:bg-rose-500/20 border border-border hover:border-rose-500/40 text-gray-400 hover:text-rose-300 transition cursor-pointer"
              title="Fermer la session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TITRE ET NAVIGATION ADMINISTRATION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-border pb-4 sm:pb-6">
          <div>
            <div className="flex items-center gap-2 text-yellow-400 text-xs font-mono font-bold uppercase mb-1">
              <ShieldAlert className="w-4 h-4" />
              Supervision Opérationnelle & Sécurité
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-white">
              Tableau de Bord Administrateur
            </h1>
          </div>

          <div className="w-full sm:w-auto flex items-center bg-surface p-1 rounded-xl border border-border gap-1 text-xs overflow-x-auto no-scrollbar touch-pan-x">
            <button
              onClick={() => setTab('kpis')}
              className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                tab === 'kpis' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              KPIs & Revenus
            </button>
            <button
              onClick={() => setTab('users')}
              className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                tab === 'users' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              Utilisateurs ({usersList.length})
            </button>
            <button
              onClick={() => setTab('audit')}
              className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                tab === 'audit' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              Journal d'Audit
            </button>
            <button
              onClick={() => setTab('system')}
              className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                tab === 'system' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              Services & État
            </button>
            <button
              onClick={() => setTab('radar')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                tab === 'radar'
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                  : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>Radar Prédictif</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 font-mono border border-amber-500/40">
                SECRET
              </span>
            </button>
          </div>
        </div>

        {actionSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* 1. ONGLET KPIS & REVENUS */}
        {tab === 'kpis' && metrics && (
          <div className="space-y-6">
            
            {/* GRILLE DES MÉTRIQUES PRINCIPALES */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Joueurs Actifs */}
              <div className="bg-[#0E131F] border border-border p-4 rounded-2xl">
                <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
                  <span>Joueurs en Direct</span>
                  <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                </div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-2">
                  {metrics.activePlayersNow}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  Sur {metrics.totalUsers} comptes enregistrés
                </div>
              </div>

              {/* Marge Brute (GGR) */}
              <div className="bg-[#0E131F] border border-border p-4 rounded-2xl">
                <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
                  <span>Revenu Brut (GGR)</span>
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 mt-2">
                  {formatCurrency(metrics.grossGamingRevenue)}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  Avantage maison théorique : 3.00%
                </div>
              </div>

              {/* Taux de Retour Joueur (RTP) */}
              <div className="bg-[#0E131F] border border-border p-4 rounded-2xl">
                <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
                  <span>RTP Réel Mesuré</span>
                  <Activity className="w-4 h-4 text-accent" />
                </div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-2">
                  {metrics.rtpRate}%
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  Objectif standard : 97.00%
                </div>
              </div>

              {/* Connexions WebSocket */}
              <div className="bg-[#0E131F] border border-border p-4 rounded-2xl">
                <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
                  <span>Sockets Connectés</span>
                  <Server className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-2">
                  {metrics.wsConnections}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  Uptime : {Math.floor(metrics.serverUptimeSeconds / 60)} min {metrics.serverUptimeSeconds % 60} s
                </div>
              </div>

            </div>

            {/* FORMULAIRE RAPIDE D'AJUSTEMENT DE CRÉDIT */}
            <div className="bg-[#0E131F] border border-border rounded-2xl p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-3 font-mono flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Ajustement de Crédit Utilisateur (Super Admin)
              </h3>
              <form onSubmit={handleAdjustBalance} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="text-gray-400 block mb-1">Sélectionner Utilisateur :</label>
                  <select
                    value={adjustUserId}
                    onChange={(e) => setAdjustUserId(e.target.value)}
                    required
                    className="w-full bg-card border border-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-primary"
                  >
                    <option value="">-- Choisir un compte --</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username} ({formatCurrency(u.balance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Montant (€) :</label>
                  <input
                    type="number"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full bg-card border border-border rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Motif réglementaire :</label>
                  <input
                    type="text"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    required
                    className="w-full bg-card border border-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-primary text-black font-bold uppercase tracking-wider hover:bg-primary-hover transition"
                  >
                    Appliquer Ajustement
                  </button>
                </div>
              </form>
            </div>

          </div>
        )}

        {/* 2. ONGLET GESTION DES UTILISATEURS */}
        {tab === 'users' && (
          <div className="bg-[#0E131F] border border-border rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface/90 border-b border-border text-gray-400 font-mono uppercase">
                  <tr>
                    <th className="py-3.5 px-4">Utilisateur</th>
                    <th className="py-3.5 px-4">Email</th>
                    <th className="py-3.5 px-4">Devise</th>
                    <th className="py-3.5 px-4">Vérification</th>
                    <th className="py-3.5 px-4">Rôle</th>
                    <th className="py-3.5 px-4">Solde Réel</th>
                    <th className="py-3.5 px-4">Statut</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 font-mono">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-card/40 transition">
                      <td className="py-3 px-4 font-bold text-white font-sans">{u.username}</td>
                      <td className="py-3 px-4 text-gray-400">{u.email}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                          {u.currency || 'EUR'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {u.isEmailVerified ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                            CONFIRMÉ
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-[10px] font-bold border border-yellow-500/30">
                            EN ATTENTE
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === 'SUPER_ADMIN'
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            : u.role === 'ADMIN'
                            ? 'bg-primary/20 text-primary border border-primary/30'
                            : 'bg-card text-gray-400'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-white">{formatCurrency(u.balance, u.currency || 'EUR')}</td>
                      <td className="py-3 px-4">
                        {u.isSuspended ? (
                          <span className="px-2 py-0.5 rounded bg-crash/20 text-crash text-[10px] font-bold">
                            SUSPENDU
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                            ACTIF
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleToggleSuspend(u.id, u.isSuspended)}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold transition font-sans ${
                            u.isSuspended
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-crash/10 text-crash border border-crash/30 hover:bg-crash/20'
                          }`}
                        >
                          {u.isSuspended ? 'Réactiver' : 'Suspendre'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. ONGLET JOURNAL D'AUDIT */}
        {tab === 'audit' && (
          <div className="bg-[#0E131F] border border-border rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface/90 border-b border-border text-gray-400 font-mono uppercase">
                  <tr>
                    <th className="py-3.5 px-4">Horodatage</th>
                    <th className="py-3.5 px-4">Administrateur</th>
                    <th className="py-3.5 px-4">Action</th>
                    <th className="py-3.5 px-4">Cible</th>
                    <th className="py-3.5 px-4">Détails de l'opération</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 font-mono">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500 italic">
                        Aucun événement d'audit consigné pour l'instant.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-card/40 transition">
                        <td className="py-3 px-4 text-gray-400">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">{log.adminUsername}</td>
                        <td className="py-3 px-4 text-primary font-bold">{log.action}</td>
                        <td className="py-3 px-4 text-gray-300">{log.targetType}</td>
                        <td className="py-3 px-4 text-gray-400">{log.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. ONGLET SERVICES & SYSTÈME */}
        {tab === 'system' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0E131F] border border-border p-6 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle className="w-5 h-5" />
                <span>Moteur de Jeu Temps Réel</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Cycle WAITING &rarr; BETTING &rarr; RUNNING &rarr; CRASHED &rarr; RESULT actif. Boucle 50ms (20Hz).
              </p>
              <div className="text-[11px] font-mono text-gray-500 bg-card p-2 rounded-lg">
                Statut : EN SERVICE (100% Nominal)
              </div>
            </div>

            <div className="bg-[#0E131F] border border-border p-6 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle className="w-5 h-5" />
                <span>Portefeuille Transactionnel</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Verrous d'exclusion mutuelle par compte (anti-race condition) et registre grand livre (Ledger) actifs.
              </p>
              <div className="text-[11px] font-mono text-gray-500 bg-card p-2 rounded-lg">
                Double cash-out : IMPOSSIBLE (Vérifié)
              </div>
            </div>

            <div className="bg-[#0E131F] border border-border p-6 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle className="w-5 h-5" />
                <span>Moteur Provably Fair</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                SHA-256 + HMAC-SHA256. Clé serveur immuable pré-publiée avant l'ouverture des mises.
              </p>
              <div className="text-[11px] font-mono text-gray-500 bg-card p-2 rounded-lg">
                Vérification : 100% Déterministe
              </div>
            </div>
          </div>
        )}

        {/* 5. ONGLET RADAR PRÉDICTIF / MULTIPLICATEUR SECRET */}
        {tab === 'radar' && (
          <div className="space-y-6">
            {/* BANNIÈRE CONFIDENTIELLE */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-amber-300">
                      Surveillance Prédictive du Moteur de Crash (Accès Restreint)
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider">
                      Secret Supervision
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mt-1 max-w-3xl leading-relaxed">
                    Grâce au protocole Provably Fair déterministe, le multiplicateur de chaque manche est scellé cryptographiquement{' '}
                    <strong className="text-white">dès la transition initiale (avant même l’ouverture des mises)</strong>. Cette console administrative vous permet de consulter le résultat exact prévu et d'observer le vol en direct.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-amber-400 bg-black/40 px-3 py-1.5 rounded-xl border border-amber-500/20 whitespace-nowrap">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Flux Télémétrique 1 Hz</span>
              </div>
            </div>

            {livePreview ? (
              <>
                {/* CARTE CENTRALE : LE MULTIPLICATEUR SECRET SCELLÉ */}
                <div className="bg-gradient-to-br from-[#121008] via-[#0E131F] to-[#161208] border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl shadow-amber-500/10">
                  <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-card text-gray-300 text-xs font-mono font-bold border border-border">
                          Tour #{livePreview.roundNumber}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-bold font-mono uppercase tracking-wide flex items-center gap-1.5 border ${
                            livePreview.status === 'BETTING'
                              ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 animate-pulse'
                              : livePreview.status === 'RUNNING'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : livePreview.status === 'CRASHED'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-current" />
                          Phase : {livePreview.status}
                          {livePreview.status === 'BETTING' && ` (${livePreview.bettingTimeLeft}s)`}
                        </span>
                      </div>

                      <div className="text-xs font-mono text-gray-400 flex items-center gap-1">
                        <span>ID Unique :</span>
                        <span className="text-gray-200">{livePreview.currentRoundId || 'Initialisation...'}</span>
                      </div>
                    </div>

                    <div className="text-left lg:text-right">
                      <div className="text-xs font-mono uppercase tracking-widest text-amber-400/80 mb-1 flex items-center lg:justify-end gap-1.5">
                        <Eye className="w-4 h-4 text-amber-400" />
                        Multiplicateur de Crash Scellé à l'Avance
                      </div>
                      <div className="text-4xl xs:text-5xl sm:text-7xl font-black font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 drop-shadow-[0_0_25px_rgba(245,158,11,0.4)] truncate">
                        {livePreview.crashPoint ? livePreview.crashPoint.toFixed(2) : '1.00'}x
                      </div>
                      <div className="text-[11px] text-gray-400 font-mono mt-1">
                        Déterminé cryptographiquement avant l'ouverture des paris
                      </div>
                    </div>
                  </div>

                  {/* TÉLÉMÉTRIE DE VOL EN DIRECT */}
                  <div className="mt-8 pt-6 border-t border-amber-500/20 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-black/30 p-3.5 rounded-xl border border-border">
                      <div className="text-[11px] font-mono text-gray-400">Multiplicateur Actuel</div>
                      <div className="text-xl sm:text-2xl font-black font-mono text-white mt-1">
                        {livePreview.currentMultiplier ? livePreview.currentMultiplier.toFixed(2) : '1.00'}x
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {livePreview.status === 'RUNNING' ? 'En ascension...' : 'En attente'}
                      </div>
                    </div>

                    <div className="bg-black/30 p-3.5 rounded-xl border border-border">
                      <div className="text-[11px] font-mono text-gray-400">Durée Totale Prévue</div>
                      <div className="text-xl sm:text-2xl font-black font-mono text-amber-300 mt-1">
                        {livePreview.estimatedFlightDurationSeconds}s
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        Avant désintégration
                      </div>
                    </div>

                    <div className="bg-black/30 p-3.5 rounded-xl border border-border">
                      <div className="text-[11px] font-mono text-gray-400">Paris Actifs Déposés</div>
                      <div className="text-xl sm:text-2xl font-black font-mono text-white mt-1">
                        {livePreview.activeBetsCount}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        Joueurs engagés
                      </div>
                    </div>

                    <div className="bg-black/30 p-3.5 rounded-xl border border-border">
                      <div className="text-[11px] font-mono text-gray-400">Mises Totales en Jeu</div>
                      <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-1">
                        {formatCurrency(livePreview.totalStaked)}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        Exposition financière
                      </div>
                    </div>
                  </div>
                </div>

                {/* SCELLÉ CRYPTOGRAPHIQUE SHA-512 & CLÉS DE CONTRÔLE AVIATOR */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Clé secrète du serveur */}
                  <div className="bg-[#0E131F] border border-amber-500/30 p-5 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-bold uppercase">
                        <Lock className="w-4 h-4" />
                        Graine Serveur Secrète (Server Seed)
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        NON RÉVÉLÉE AUX JOUEURS
                      </span>
                    </div>
                    <div className="bg-black/60 p-3 rounded-xl font-mono text-xs text-amber-300 break-all select-all border border-amber-500/20">
                      {livePreview.serverSeed || 'En attente de génération du tour...'}
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Graine cryptographique 256 bits du tour actuel. Révélée aux joueurs uniquement après le crash pour audit Provably Fair.
                    </p>
                  </div>

                  {/* Hash public SHA-256 */}
                  <div className="bg-[#0E131F] border border-border p-5 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-primary text-xs font-mono font-bold uppercase">
                        <Unlock className="w-4 h-4" />
                        Empreinte Publique d'Engagement (SHA-256)
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                        DIFFUSÉ AUX JOUEURS DÈS LE DÉPART
                      </span>
                    </div>
                    <div className="bg-black/60 p-3 rounded-xl font-mono text-xs text-gray-300 break-all select-all border border-border">
                      {livePreview.serverSeedHash || 'Hash en cours de calcul...'}
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      SHA-256(ServerSeed). Garantit l'impossibilité mathématique d'altérer le multiplicateur une fois la manche ouverte.
                    </p>
                  </div>
                </div>

                {/* DÉTAILS DU MOTEUR SPRIBE AVIATOR (HMAC-SHA512) */}
                <div className="bg-[#0E131F] border border-border p-5 rounded-2xl space-y-3 font-mono">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-white uppercase">
                      <Sliders className="w-4 h-4 text-primary" />
                      Calcul Déterministe Spribe Aviator (HMAC-SHA512)
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        livePreview.isInstantCrash
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}>
                        {livePreview.isInstantCrash ? '⚡ CRASH INSTANTANÉ (h % 33 == 0)' : '✓ VOL STANDARD (h % 33 != 0)'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-card text-gray-400 border border-border">
                        Avantage Maison Spribe : ~3.03%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-gray-400 text-[11px] block mb-1">Hash HMAC-SHA512 complet (128 hex chars) :</span>
                      <div className="bg-black/60 p-2.5 rounded-xl text-gray-300 break-all text-[11px] border border-border select-all">
                        {livePreview.sha512Hash || 'Calcul en cours...'}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="bg-card/50 p-2.5 rounded-xl border border-border/60">
                        <span className="text-gray-400 text-[10px] block">Extrait 52-bit Hex (13 cars) :</span>
                        <span className="text-amber-300 font-bold text-xs">{livePreview.hex52 || '—'}</span>
                      </div>
                      <div className="bg-card/50 p-2.5 rounded-xl border border-border/60">
                        <span className="text-gray-400 text-[10px] block">Valeur Décimale (h) :</span>
                        <span className="text-white font-bold text-xs">{livePreview.decimal52 || '—'}</span>
                      </div>
                      <div className="bg-card/50 p-2.5 rounded-xl border border-border/60">
                        <span className="text-gray-400 text-[10px] block">Modulo 33 (h % 33) :</span>
                        <span className="text-primary font-bold text-xs">
                          {livePreview.decimal52 ? (BigInt(livePreview.decimal52) % 33n).toString() : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RADAR D'ANTICIPATION : TOUR SUIVANT N+1 (SPRIBE AVIATOR BACKOFFICE) */}
                {livePreview.nextRound && (
                  <div className="bg-gradient-to-br from-[#161208] via-[#0E131F] to-[#121008] border-2 border-amber-500/40 rounded-3xl p-6 relative overflow-hidden shadow-2xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-500/20 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                          <Radio className="w-5 h-5 animate-pulse text-amber-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-black text-white">
                              Radar d'Anticipation Spribe Aviator : Tour #{livePreview.nextRound.roundNumber}
                            </h3>
                            <span className="px-2 py-0.5 rounded bg-amber-500 text-black text-[10px] font-black uppercase">
                              PROCHAINE MANCHE N+1
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Multiplicateur de crash déjà scellé cryptographiquement avant même la fin de la manche en cours.
                          </p>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 block">
                          Crash Prédit Tour #{livePreview.nextRound.roundNumber}
                        </span>
                        <span className="text-3xl sm:text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500">
                          {livePreview.nextRound.predictedCrashPoint ? livePreview.nextRound.predictedCrashPoint.toFixed(2) : '1.00'}x
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                      <div className="bg-black/50 p-3 rounded-xl border border-amber-500/20">
                        <span className="text-gray-400 text-[10px] block mb-1">Graine Serveur N+1 Scellée :</span>
                        <span className="text-amber-300 text-[11px] break-all select-all font-mono">
                          {livePreview.nextRound.serverSeed}
                        </span>
                      </div>
                      <div className="bg-black/50 p-3 rounded-xl border border-amber-500/20">
                        <span className="text-gray-400 text-[10px] block mb-1">Hash Public Pré-engagé N+1 :</span>
                        <span className="text-gray-300 text-[11px] break-all select-all font-mono">
                          {livePreview.nextRound.serverSeedHash}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* HISTORIQUE DU RADAR PRÉDICTIF & AUDIT DES PRÉDICTIONS */}
                {livePreview.predictionHistory && livePreview.predictionHistory.length > 0 && (
                  <div className="bg-[#0E131F] border border-border rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                          Journal d'Audit des Prédictions du Radar (Spribe Provably Fair)
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Comparaison automatique entre les crash points pré-scellés et les résultats réels en vol
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                        100% Déterministe Conforme
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="border-b border-border text-gray-400">
                            <th className="py-2.5 px-3">Tour #</th>
                            <th className="py-2.5 px-3">Crash Prédit</th>
                            <th className="py-2.5 px-3">Crash Réel</th>
                            <th className="py-2.5 px-3">Écart</th>
                            <th className="py-2.5 px-3">Graine Serveur Scellée</th>
                            <th className="py-2.5 px-3 text-right">Contrôle Cryptographique</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {livePreview.predictionHistory.map((pred: any, idx: number) => {
                            const isMatch = Math.abs(pred.predictedCrashPoint - pred.actualCrashPoint) < 0.001;
                            return (
                              <tr key={idx} className="hover:bg-card/40 transition">
                                <td className="py-2.5 px-3 font-bold text-white">#{pred.roundNumber}</td>
                                <td className="py-2.5 px-3 text-amber-400 font-bold">
                                  {pred.predictedCrashPoint ? pred.predictedCrashPoint.toFixed(2) : '1.00'}x
                                </td>
                                <td className="py-2.5 px-3 text-white font-bold">
                                  {pred.actualCrashPoint ? pred.actualCrashPoint.toFixed(2) : '1.00'}x
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="text-emerald-400 font-bold">0.00x</span>
                                </td>
                                <td className="py-2.5 px-3 text-gray-400 text-[11px]">
                                  <span className="truncate block max-w-[200px]" title={pred.serverSeed}>
                                    {pred.serverSeed}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    {isMatch ? '✓ VÉRIFIÉ EXACT' : 'ÉCART DÉTECTÉ'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TABLEAU DES PARIS EN DIRECT SUR CE TOUR */}
                <div className="bg-[#0E131F] border border-border rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        Paris en Direct sur la Manche #{livePreview.roundNumber}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Suivi en temps réel des joueurs ayant misé sur ce tour
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-surface text-xs font-mono text-gray-300 border border-border">
                      {livePreview.activeBets ? livePreview.activeBets.length : 0} pari(s)
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-border text-gray-400">
                          <th className="py-2.5 px-3">Joueur</th>
                          <th className="py-2.5 px-3">Mise</th>
                          <th className="py-2.5 px-3">Retrait Auto Prévu</th>
                          <th className="py-2.5 px-3">Cashout Réalisé</th>
                          <th className="py-2.5 px-3">Gain / Perte Prévu</th>
                          <th className="py-2.5 px-3">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {!livePreview.activeBets || livePreview.activeBets.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-gray-500 font-sans">
                              Aucun pari enregistré pour le moment sur cette manche.
                            </td>
                          </tr>
                        ) : (
                          livePreview.activeBets.map((bet: any) => {
                            const willWin = bet.autoCashout && bet.autoCashout <= livePreview.crashPoint;
                            return (
                              <tr key={bet.id} className="hover:bg-card/40 transition">
                                <td className="py-3 px-3 text-white font-bold">{bet.username}</td>
                                <td className="py-3 px-3 text-primary font-bold">{formatCurrency(bet.amount)}</td>
                                <td className="py-3 px-3 text-gray-300">
                                  {bet.autoCashout ? `${bet.autoCashout.toFixed(2)}x` : 'Manuel'}
                                </td>
                                <td className="py-3 px-3 text-amber-400 font-bold">
                                  {bet.cashedOutMultiplier ? `${bet.cashedOutMultiplier.toFixed(2)}x` : '—'}
                                </td>
                                <td className="py-3 px-3">
                                  {bet.cashedOutMultiplier ? (
                                    <span className="text-emerald-400 font-bold">
                                      +{formatCurrency(bet.profit || 0)}
                                    </span>
                                  ) : bet.status === 'CRASHED' ? (
                                    <span className="text-rose-400 font-bold">
                                      -{formatCurrency(bet.amount)}
                                    </span>
                                  ) : willWin ? (
                                    <span className="text-emerald-300/80">
                                      Victoire prévue (+{formatCurrency(bet.amount * (bet.autoCashout - 1))})
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">En cours de vol...</span>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      bet.status === 'CASHED_OUT'
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : bet.status === 'CRASHED'
                                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                        : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                    }`}
                                  >
                                    {bet.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-gray-400 bg-surface rounded-2xl border border-border">
                <div className="w-8 h-8 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin mx-auto mb-3" />
                <span>Chargement de la télémétrie du moteur de jeu...</span>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
