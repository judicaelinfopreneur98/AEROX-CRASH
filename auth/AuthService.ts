import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserPayload, Role, AuthTokens } from './types';
import { WalletEngine } from '../wallet/WalletEngine';
import { sendVerificationEmail } from '../lib/email';

const JWT_SECRET = process.env.JWT_SECRET || 'aerox-quantum-jwt-secret-key-production-change-in-env-2026';
const JWT_EXPIRES_IN = '7d';

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: Role;
  currency: string;
  isEmailVerified: boolean;
  verificationCodeHash?: string;
  verificationToken?: string;
  verificationExpires?: Date;
  verificationAttempts?: number;
  isSuspended: boolean;
  createdAt: Date;
}

export class AuthService {
  private static instance: AuthService;
  private users: Map<string, UserRecord> = new Map();
  private usersByEmail: Map<string, string> = new Map();
  private usersByUsername: Map<string, string> = new Map();

  private constructor() {
    this.seedDefaultAccounts();
  }

  public static getInstance(): AuthService {
    const g = globalThis as any;
    if (!g.__aerox_auth_service__) {
      g.__aerox_auth_service__ = AuthService.instance || new AuthService();
      AuthService.instance = g.__aerox_auth_service__;
    }
    return g.__aerox_auth_service__;
  }

  private seedDefaultAccounts() {
    // Compte Super Administrateur par défaut
    const adminId = 'usr_admin_001';
    const adminHash = bcrypt.hashSync('Admin123!', 10);
    const admin: UserRecord = {
      id: adminId,
      username: 'AeroxAdmin',
      email: 'admin@aerox.io',
      passwordHash: adminHash,
      role: 'SUPER_ADMIN',
      currency: 'EUR',
      isEmailVerified: true,
      isSuspended: false,
      createdAt: new Date(),
    };
    this.users.set(admin.id, admin);
    this.usersByEmail.set(admin.email.toLowerCase(), admin.id);
    this.usersByUsername.set(admin.username.toLowerCase(), admin.id);
    WalletEngine.getInstance().getOrCreateWallet(adminId, 100000.0, 'EUR');

    // Compte Joueur Démo par défaut
    const demoId = 'usr_demo_001';
    const demoHash = bcrypt.hashSync('Demo123!', 10);
    const demo: UserRecord = {
      id: demoId,
      username: 'PiloteDemo',
      email: 'demo@aerox.io',
      passwordHash: demoHash,
      role: 'USER',
      currency: 'EUR',
      isEmailVerified: true,
      isSuspended: false,
      createdAt: new Date(),
    };
    this.users.set(demo.id, demo);
    this.usersByEmail.set(demo.email.toLowerCase(), demo.id);
    this.usersByUsername.set(demo.username.toLowerCase(), demo.id);
    WalletEngine.getInstance().getOrCreateWallet(demoId, 1500.0, 'EUR');
  }

  public async register(
    username: string,
    email: string,
    password: string,
    currency: string = 'EUR'
  ): Promise<{ user: UserPayload; token: string }> {
    const emailKey = email.toLowerCase().trim();
    const usernameKey = username.toLowerCase().trim();

    if (this.usersByEmail.has(emailKey)) {
      throw new Error('Un compte existe déjà avec cette adresse email.');
    }

    if (this.usersByUsername.has(usernameKey)) {
      throw new Error('Ce nom d’utilisateur est déjà utilisé.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Code de vérification aléatoire 6 chiffres (100000 à 999999) généré côté serveur
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    // Stockage uniquement sous forme de hash SHA-256 (jamais en clair côté serveur ou client)
    const verificationCodeHash = crypto.createHash('sha256').update(verificationCode).digest('hex');
    const verificationToken = crypto.randomBytes(24).toString('hex');
    // Expiration stricte de 10 minutes
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000);

    const validCurrency = ['FCFA', 'EUR', 'USD'].includes(currency) ? currency : 'EUR';

    const newUser: UserRecord = {
      id,
      username,
      email: emailKey,
      passwordHash,
      role: 'USER',
      currency: validCurrency,
      isEmailVerified: false,
      verificationCodeHash,
      verificationToken,
      verificationExpires,
      verificationAttempts: 0,
      isSuspended: false,
      createdAt: new Date(),
    };

    this.users.set(id, newUser);
    this.usersByEmail.set(emailKey, id);
    this.usersByUsername.set(usernameKey, id);

    // Initialiser le portefeuille avec 1 000 FCFA (ou 1 000 € / $)
    const initialBalance = 1000.0;
    WalletEngine.getInstance().getOrCreateWallet(id, initialBalance, validCurrency);

    // Envoi du code exclusivement par email à la boîte de l'utilisateur
    sendVerificationEmail({
      to: emailKey,
      username,
      code: verificationCode,
      token: verificationToken,
    }).catch((err) => {
      console.error('[AuthService] Erreur envoi email vérification:', err);
    });

    const payload = this.toPayload(newUser);
    const token = this.generateToken(payload);
    // Le code à 6 chiffres n'est JAMAIS renvoyé dans la réponse API
    return { user: payload, token };
  }

  public async login(email: string, password: string): Promise<AuthTokens> {
    const emailKey = email.toLowerCase().trim();
    const userId = this.usersByEmail.get(emailKey);

    if (!userId) {
      throw new Error('Identifiants incorrects.');
    }

    const user = this.users.get(userId);
    if (!user) {
      throw new Error('Utilisateur introuvable.');
    }

    if (user.isSuspended) {
      throw new Error('Votre compte est suspendu par un administrateur.');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new Error('Identifiants incorrects.');
    }

    const payload = this.toPayload(user);
    const accessToken = this.generateToken(payload);
    return { accessToken, user: payload };
  }

  public async verifyEmailCode(emailOrUserId: string, code: string): Promise<{ user: UserPayload; token: string }> {
    const key = emailOrUserId.toLowerCase().trim();
    let user: UserRecord | undefined;

    const userId = this.usersByEmail.get(key);
    if (userId) {
      user = this.users.get(userId);
    } else {
      user = this.users.get(emailOrUserId);
    }

    if (!user) {
      throw new Error('Utilisateur introuvable.');
    }

    if (user.isEmailVerified) {
      const payload = this.toPayload(user);
      return { user: payload, token: this.generateToken(payload) };
    }

    // Vérifier l'expiration (10 minutes max)
    if (user.verificationExpires && user.verificationExpires.getTime() < Date.now()) {
      user.verificationCodeHash = undefined;
      user.verificationToken = undefined;
      user.verificationExpires = undefined;
      user.verificationAttempts = 0;
      throw new Error('Le code de vérification a expiré (durée : 10 minutes). Veuillez en demander un nouveau.');
    }

    // Vérifier le nombre d'essais incorrects (max 5)
    const attempts = user.verificationAttempts || 0;
    if (attempts >= 5) {
      user.verificationCodeHash = undefined;
      user.verificationToken = undefined;
      user.verificationExpires = undefined;
      user.verificationAttempts = 0;
      throw new Error('Nombre maximal de tentatives atteint (5/5). Le code a été invalidé par sécurité. Veuillez en demander un nouveau.');
    }

    if (!user.verificationCodeHash) {
      throw new Error('Aucun code de vérification actif. Veuillez demander un nouveau code.');
    }

    // Comparer le hash SHA-256 du code saisi
    const inputHash = crypto.createHash('sha256').update(code.trim()).digest('hex');
    if (user.verificationCodeHash !== inputHash) {
      user.verificationAttempts = attempts + 1;
      const remaining = 5 - user.verificationAttempts;
      if (remaining <= 0) {
        user.verificationCodeHash = undefined;
        user.verificationToken = undefined;
        user.verificationExpires = undefined;
        user.verificationAttempts = 0;
        throw new Error('Code de vérification incorrect. Nombre maximal de tentatives atteint (5/5), le code a été invalidé.');
      }
      throw new Error(`Code de vérification incorrect. (${remaining} tentative${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''})`);
    }

    // Code valide : marquer l'email comme vérifié et INVALIDER IMMÉDIATEMENT le code
    user.isEmailVerified = true;
    user.verificationCodeHash = undefined;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    user.verificationAttempts = 0;

    const payload = this.toPayload(user);
    return { user: payload, token: this.generateToken(payload) };
  }

  public async verifyEmailToken(token: string): Promise<{ user: UserPayload; token: string }> {
    let foundUser: UserRecord | undefined;
    for (const u of this.users.values()) {
      if (u.verificationToken === token.trim()) {
        foundUser = u;
        break;
      }
    }

    if (!foundUser) {
      throw new Error('Lien de vérification invalide ou déjà utilisé.');
    }

    if (foundUser.verificationExpires && foundUser.verificationExpires.getTime() < Date.now()) {
      foundUser.verificationCodeHash = undefined;
      foundUser.verificationToken = undefined;
      foundUser.verificationExpires = undefined;
      foundUser.verificationAttempts = 0;
      throw new Error('Ce lien de vérification a expiré.');
    }

    // Invalider immédiatement le code et marquer vérifié
    foundUser.isEmailVerified = true;
    foundUser.verificationCodeHash = undefined;
    foundUser.verificationToken = undefined;
    foundUser.verificationExpires = undefined;
    foundUser.verificationAttempts = 0;

    const payload = this.toPayload(foundUser);
    return { user: payload, token: this.generateToken(payload) };
  }

  public async resendVerification(emailOrUserId: string): Promise<{ success: boolean; message: string }> {
    const key = emailOrUserId.toLowerCase().trim();
    const userId = this.usersByEmail.get(key) || emailOrUserId;
    const user = this.users.get(userId);

    if (!user) {
      throw new Error('Utilisateur introuvable.');
    }

    if (user.isEmailVerified) {
      return { success: true, message: 'Votre compte est déjà vérifié.' };
    }

    // Invalider immédiatement l'ancien code et générer un nouveau code 6 chiffres
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeHash = crypto.createHash('sha256').update(verificationCode).digest('hex');
    const verificationToken = crypto.randomBytes(24).toString('hex');
    // Expiration stricte de 10 minutes
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000);

    user.verificationCodeHash = verificationCodeHash;
    user.verificationToken = verificationToken;
    user.verificationExpires = verificationExpires;
    user.verificationAttempts = 0;

    await sendVerificationEmail({
      to: user.email,
      username: user.username,
      code: verificationCode,
      token: verificationToken,
    });

    return { success: true, message: 'Un nouveau code de sécurité vous a été envoyé par email.' };
  }

  /**
   * Méthode interne réservée aux suites de tests automatisés (injecte un hash de test)
   */
  public _setVerificationCodeForTest(userIdOrEmail: string, rawCode: string, expiresMsFromNow = 10 * 60 * 1000) {
    const key = userIdOrEmail.toLowerCase().trim();
    const userId = this.usersByEmail.get(key) || userIdOrEmail;
    const user = this.users.get(userId);
    if (user) {
      user.verificationCodeHash = crypto.createHash('sha256').update(rawCode.trim()).digest('hex');
      user.verificationExpires = new Date(Date.now() + expiresMsFromNow);
      user.verificationAttempts = 0;
    }
  }

  public toPayload(user: UserRecord): UserPayload {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      currency: user.currency || 'EUR',
      isEmailVerified: user.isEmailVerified ?? false,
      isSuspended: user.isSuspended,
    };
  }

  public generateToken(user: UserPayload): string {
    return jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  public verifyToken(token: string): UserPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as UserPayload;
    } catch {
      return null;
    }
  }

  public getUserById(userId: string): UserRecord | null {
    return this.users.get(userId) || null;
  }

  public getAllUsers(): UserRecord[] {
    return Array.from(this.users.values());
  }

  public setSuspended(userId: string, isSuspended: boolean): boolean {
    const user = this.users.get(userId);
    if (!user) return false;
    user.isSuspended = isSuspended;
    return true;
  }
}
