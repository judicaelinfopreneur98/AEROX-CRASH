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
  register: (username: string, email: string, pass: string, currency?: string) => Promise<{ success: boolean; error?: string; verificationCode?: string }>;
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
      });
      if (res.ok) {
        const data = await res.json();
        setUser({
          id: data.id,
          username: data.username,
          email: data.email,
          role: data.role,
          currency: data.currency || 'EUR',
          isEmailVerified: data.isEmailVerified ?? false,
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
          isEmailVerified: data.user.isEmailVerified ?? prev?.isEmailVerified ?? false,
        }));
      }
      if (typeof data.balance === 'number') setBalance(data.balance);
    });

    return () => {
      unsubWallet();
      unsubAuthSuccess();
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
      return { success: true, verificationCode: data.verificationCode };
    } catch {
      return { success: false, error: 'Connexion impossible au serveur.' };
    }
  };

  const verifyEmail = async (code: string) => {
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ code, email: user?.email }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Code invalide.' };
      }

      if (data.token) {
        setToken(data.token);
        localStorage.setItem('aerox_jwt', data.token);
      }
      if (data.user) {
        setUser(data.user);
      } else {
        setUser((prev) => (prev ? { ...prev, isEmailVerified: true } : null));
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
      if (!res.ok) {
        return { success: false, error: data.error || 'Impossible de renvoyer le code.' };
      }
      return { success: true, message: data.message };
    } catch {
      return { success: false, error: 'Erreur lors de la demande de renvoi.' };
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
    if (!token) return;
    try {
      const res = await fetch('/api/wallet', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
        setLockedBalance(data.lockedBalance);
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
