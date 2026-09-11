import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().min(3, 'Le nom d’utilisateur doit comporter au moins 3 caractères').max(20),
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(6, 'Le mot de passe doit comporter au moins 6 caractères'),
  currency: z.enum(['FCFA', 'EUR', 'USD']).default('EUR'),
});

export const verifyEmailSchema = z.object({
  code: z.string().length(6, 'Le code doit contenir exactement 6 chiffres'),
  email: z.string().email('Adresse email requise').optional(),
});

export const resendVerificationSchema = z.object({
  email: z.string().email('Adresse email requise'),
});

export const loginSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(1, 'Le mot de passe est obligatoire'),
});

export const placeBetSchema = z.object({
  amount: z.number().positive('Le montant de la mise doit être supérieur à 0').min(0.01, 'Mise minimale invalide').max(10000000, 'Mise maximale dépassée'),
  panelIndex: z.number().int().min(1).max(2).default(1),
  autoCashout: z.number().min(1.01, 'L’auto cash-out doit être d’au moins 1.01x').max(10000, 'L’auto cash-out ne peut excéder 10000x').optional().nullable(),
});

export const cashoutSchema = z.object({
  betId: z.string().uuid('Identifiant de pari invalide'),
});

export const depositSchema = z.object({
  amount: z.number().positive('Le montant du dépôt doit être supérieur à 0').min(1, 'Dépôt minimal insuffisant').max(50000000, 'Dépôt maximal dépassé'),
});

export const withdrawalSchema = z.object({
  amount: z.number().positive('Le montant du retrait doit être supérieur à 0').min(1, 'Retrait minimal insuffisant').max(50000000, 'Retrait maximal dépassé'),
  destinationAccount: z.string().min(5, 'Compte de destination requis'),
});

export const updateLimitsSchema = z.object({
  dailyDepositLimit: z.number().positive().optional().nullable(),
  maxBetLimit: z.number().positive().optional().nullable(),
  sessionLossLimit: z.number().positive().optional().nullable(),
  selfExclusionHours: z.number().int().positive().optional().nullable(),
});

export const provablyFairVerifySchema = z.object({
  serverSeed: z.string().min(1, 'Graine serveur requise'),
  serverSeedHash: z.string().min(1, 'Hash de la graine serveur requis'),
  clientSeed: z.string().min(1, 'Graine client requise'),
  nonce: z.number().int().nonnegative('Le nonce doit être positif ou nul'),
  expectedCrashPoint: z.number().positive().optional(),
});
