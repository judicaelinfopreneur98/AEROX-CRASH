export type TransactionType = 'DEPOSIT' | 'BET' | 'CASHOUT' | 'WIN' | 'REFUND' | 'WITHDRAWAL';
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface WalletState {
  id: string;
  userId: string;
  balance: number;       // Solde liquide immédiatement disponible
  lockedBalance: number; // Fonds engagés dans des manches actives
  currency: string;
  version: number;
}

export interface LedgerTransaction {
  id: string;
  idempotencyKey: string;
  walletId: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  balanceAfter: number;
  referenceId?: string | null;
  metadata?: any;
  createdAt: Date;
}

export interface WalletOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: 'INSUFFICIENT_FUNDS' | 'DUPLICATE_REQUEST' | 'ALREADY_CASHED_OUT' | 'NOT_FOUND' | 'INVALID_STATUS' | 'CONCURRENCY_ERROR';
}
