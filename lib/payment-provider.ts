/**
 * Interface abstraite pour les fournisseurs de paiement conformes.
 * Permet d'intégrer des prestataires agréés (ex: Stripe, Crypto Gateway, Checkout, PSP régulé)
 * sans modifier le cœur métier ni prétendre traiter du vrai argent sans passerelle légale.
 */

export interface DepositRequest {
  userId: string;
  amount: number;
  currency: string;
  returnUrl?: string;
  metadata?: Record<string, any>;
}

export interface DepositResponse {
  paymentId: string;
  redirectUrl?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  provider: string;
  expiresAt?: Date;
}

export interface DepositVerification {
  paymentId: string;
  userId: string;
  amount: number;
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
  transactionHash?: string;
}

export interface WithdrawalRequest {
  userId: string;
  amount: number;
  currency: string;
  destinationAccount: string; // IBAN, adresse crypto, ou compte externe
  metadata?: Record<string, any>;
}

export interface WithdrawalResponse {
  payoutId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  provider: string;
}

export interface WithdrawalVerification {
  payoutId: string;
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
  externalReference?: string;
}

export interface PaymentProvider {
  readonly providerName: string;

  /**
   * Initialise une intention de dépôt auprès du prestataire externe.
   */
  createDeposit(request: DepositRequest): Promise<DepositResponse>;

  /**
   * Valide un webhook ou une confirmation de paiement retournée par le prestataire.
   */
  verifyDeposit(paymentId: string, payload: any, signature?: string): Promise<DepositVerification>;

  /**
   * Demande un retrait vers un compte externe vérifié.
   */
  createWithdrawal(request: WithdrawalRequest): Promise<WithdrawalResponse>;

  /**
   * Vérifie le statut d'une transaction de retrait externe.
   */
  verifyWithdrawal(payoutId: string): Promise<WithdrawalVerification>;
}

/**
 * Implémentation de simulation pour environnement de test / sandbox.
 * Documentée explicitement comme simulation pédagogique de développement.
 */
export class SandboxPaymentProvider implements PaymentProvider {
  readonly providerName = 'SANDBOX_PAYMENT_SIMULATOR';

  async createDeposit(request: DepositRequest): Promise<DepositResponse> {
    const paymentId = `dep_sbx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return {
      paymentId,
      redirectUrl: `/sandbox/checkout?id=${paymentId}&amount=${request.amount}`,
      status: 'COMPLETED', // En sandbox, valide automatiquement pour tester l'architecture
      provider: this.providerName,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };
  }

  async verifyDeposit(paymentId: string, payload: any): Promise<DepositVerification> {
    return {
      paymentId,
      userId: payload.userId,
      amount: payload.amount,
      status: 'COMPLETED',
      transactionHash: `sbx_tx_${Date.now()}`,
    };
  }

  async createWithdrawal(request: WithdrawalRequest): Promise<WithdrawalResponse> {
    const payoutId = `wth_sbx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return {
      payoutId,
      status: 'COMPLETED',
      provider: this.providerName,
    };
  }

  async verifyWithdrawal(payoutId: string): Promise<WithdrawalVerification> {
    return {
      payoutId,
      status: 'COMPLETED',
      externalReference: `sbx_ref_${Date.now()}`,
    };
  }
}
