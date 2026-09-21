'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { AlertTriangle, ArrowRight } from 'lucide-react';

export function EmailVerificationBanner() {
  const { user, isEmailVerified, isLoading } = useAuth();

  if (isLoading || !user || isEmailVerified) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-yellow-500/20 via-yellow-600/15 to-yellow-500/20 border-b border-yellow-500/30 px-3 sm:px-4 py-2 text-xs">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 text-yellow-300">
          <AlertTriangle className="w-4 h-4 shrink-0 text-yellow-400 animate-pulse" />
          <span className="text-[11px] sm:text-xs">
            <strong>Action requise :</strong> Votre adresse email ({user.email}) n'est pas vérifiée. Confirmez-la pour débloquer dépôts, retraits et mises réelles.
          </span>
        </div>
        <Link
          href={`/auth/verify-email?email=${encodeURIComponent(user.email)}`}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-400 text-black font-bold text-xs hover:bg-yellow-300 transition shadow-sm shrink-0"
        >
          <span>Saisir mon code</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
