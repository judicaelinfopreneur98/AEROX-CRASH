'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { socketClient } from '@/websocket/SocketClient';
import { WS_EVENTS } from '@/websocket/events';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'USER' | 'SUPPORT' | 'ADMIN' | 'SUPER_ADMIN';
  currency: string;
  isEmailVerified: boolean;
  isSuspended: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  balance: number;
  lockedBalance: number;
  currency: string;
  isEmailVerified: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, email: string, pass: string, currency?: string) => Promise<{ success: boolean; error?: string }>;
  verifyEmail: (code: string) => Promise<{ success: boolean; error?: string }>;
  resendVerification: () => Promise<{ success: boolean; message?: string; error?: string }>;
  logout: () => void;
  refreshBalance: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateBalanceLocally: (newBalance: number) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(1000.0);
  const [lockedBalance, setLockedBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = useCallback(async (jwt: string) => {
    try {
      const res = await fetch('/api/user', {
        headers: { Authorization: `Bearer ${jwt}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setUser({
          id: data.id,
          username: data.username,
          email: data.email,
          role: data.role,
          currency: data.currency || 'EUR',
          isEmailVerified: data.isEmailVerified === true,
          isSuspended: data.isSuspended,
        });
        setBalance(data.balance);
        setLockedBalance(data.lockedBalance);
      } else if (res.status === 401) {
        logout();
      }
    } catch {
      // Mode déconnecté ou erreur réseau
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Restauration de la session sauvegardée
    const savedToken = localStorage.getItem('aerox_jwt');
    if (savedToken) {
      setToken(savedToken);
      try {
        const parts = savedToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          if (payload && payload.id) {
            setUser({
              id: payload.id,
              username: payload.username,
              email: payload.email,
              role: payload.role,
              currency: payload.currency || 'EUR',
              isEmailVerified: payload.isEmailVerified === true,
              isSuspended: payload.isSuspended || false,
            });
          }
        }
      } catch {}
      fetchUserData(savedToken);
      socketClient.connect(savedToken);
    } else {
      setIsLoading(false);
      socketClient.connect(null);
    }

    // Écoute des mises à jour du solde via WebSocket
    const unsubWallet = socketClient.on(WS_EVENTS.WALLET_UPDATED, (data: { balance: number }) => {
      if (typeof data.balance === 'number') {
        setBalance(data.balance);
      }
    });

    const unsubAuthSuccess = socketClient.on('auth.success', (data: any) => {
      if (data.user) {
        setUser((prev) => ({
          ...(prev || {}),
          ...data.user,
          currency: data.user.currency || prev?.currency || 'EUR',
          isEmailVerified: data.user.isEmailVerified === true,
        }));
      }
      if (typeof data.balance === 'number') setBalance(data.balance);
    });

    const handleAuthEvent = (e: any) => {
      if (e.detail?.isEmailVerified !== undefined) {
        setUser((prev) => (prev ? { ...prev, isEmailVerified: e.detail.isEmailVerified } : null));
      }
      const activeToken = localStorage.getItem('aerox_jwt');
      if (activeToken) fetchUserData(activeToken);
    };

    window.addEventListener('auth:user_updated', handleAuthEvent);

    return () => {
      unsubWallet();
      unsubAuthSuccess();
      window.removeEventListener('auth:user_updated', handleAuthEvent);
    };
  }, [fetchUserData]);

  const login = async (email: string, pass: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Identifiants invalides.' };
      }

      setToken(data.accessToken);
      setUser(data.user);
      localStorage.setItem('aerox_jwt', data.accessToken);
      socketClient.authenticate(data.accessToken);
      await fetchUserData(data.accessToken);
      return { success: true };
    } catch {
      return { success: false, error: 'Connexion impossible au serveur.' };
    }
  };

  const register = async (username: string, email: string, pass: string, currency: string = 'EUR') => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password: pass, currency }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Erreur lors de l’inscription.' };
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('aerox_jwt', data.token);
      socketClient.authenticate(data.token);
      await fetchUserData(data.token);
      return { success: true };
    } catch {
      return { success: false, error: 'Connexion impossible au serveur.' };
    }
  };

  const verifyEmail = async (code: string) => {
    try {
      const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('aerox_jwt') : null);
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({ code, email: user?.email }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Code invalide.' };
      }

      const newToken = data.token || activeToken;
      if (newToken) {
        setToken(newToken);
        localStorage.setItem('aerox_jwt', newToken);
        socketClient.authenticate(newToken);
      }
      if (data.user) {
        setUser({
          ...data.user,
          isEmailVerified: true,
        });
      } else {
        setUser((prev) => (prev ? { ...prev, isEmailVerified: true } : null));
      }

      // Forcer un rafraîchissement d'autorité depuis Supabase
      if (newToken) {
        await fetchUserData(newToken);
      }

      // Diffuser l'événement USER_UPDATED
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:user_updated', { detail: data.user }));
      }

      return { success: true };
    } catch {
      return { success: false, error: 'Erreur lors de la validation du code.' };
    }
  };

  const resendVerification = async () => {
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email: user?.email }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        return {
          success: false,
          error: data.error || "Impossible d'envoyer le code de vérification. Veuillez réessayer dans quelques instants.",
        };
      }
      return { success: true, message: data.message };
    } catch {
      return {
        success: false,
        error: "Impossible d'envoyer le code de vérification. Veuillez réessayer dans quelques instants.",
      };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setBalance(0);
    localStorage.removeItem('aerox_jwt');
    socketClient.disconnect();
    socketClient.connect(null);
  };

  const refreshBalance = async () => {
    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('aerox_jwt') : null);
    if (!activeToken) return;
    try {
      const res = await fetch('/api/wallet', {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.balance === 'number') {
          setBalance(data.balance);
        }
        if (typeof data.lockedBalance === 'number') {
          setLockedBalance(data.lockedBalance);
        }
      }
    } catch {}
  };

  const refreshUser = async () => {
    if (token) {
      await fetchUserData(token);
    }
  };

  const updateBalanceLocally = (newBal: number) => {
    setBalance(newBal);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        balance,
        lockedBalance,
        currency: user?.currency || 'EUR',
        isEmailVerified: user?.isEmailVerified ?? false,
        isLoading,
        login,
        register,
        verifyEmail,
        resendVerification,
        logout,
        refreshBalance,
        refreshUser,
        updateBalanceLocally,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return ctx;
}
