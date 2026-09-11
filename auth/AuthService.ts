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
  verificationCode?: string;
  verificationToken?: string;
  verificationExpires?: Date;
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
  ): Promise<{ user: UserPayload; token: string; verificationCode?: string }> {
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

    // Code de vérification 6 chiffres et token direct
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationToken = crypto.randomBytes(24).toString('hex');
    const verificationExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

    const validCurrency = ['FCFA', 'EUR', 'USD'].includes(currency) ? currency : 'EUR';

    const newUser: UserRecord = {
      id,
      username,
      email: emailKey,
      passwordHash,
      role: 'USER',
      currency: validCurrency,
      isEmailVerified: false,
      verificationCode,
      verificationToken,
      verificationExpires,
      isSuspended: false,
      createdAt: new Date(),
    };

    this.users.set(id, newUser);
    this.usersByEmail.set(emailKey, id);
    this.usersByUsername.set(usernameKey, id);

    // Initialiser le portefeuille avec 1 000 FCFA (ou 1 000 € / $)
    const initialBalance = 1000.0;
    WalletEngine.getInstance().getOrCreateWallet(id, initialBalance, validCurrency);

    // Envoi du mail de vérification
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
    return { user: payload, token, verificationCode };
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

    if (!user.verificationCode || user.verificationCode !== code.trim()) {
      throw new Error('Code de vérification invalide.');
    }

    if (user.verificationExpires && user.verificationExpires.getTime() < Date.now()) {
      throw new Error('Le code de vérification a expiré. Veuillez en demander un nouveau.');
    }

    user.isEmailVerified = true;
    user.verificationCode = undefined;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;

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
      throw new Error('Ce lien de vérification a expiré.');
    }

    foundUser.isEmailVerified = true;
    foundUser.verificationCode = undefined;
    foundUser.verificationToken = undefined;
    foundUser.verificationExpires = undefined;

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

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationToken = crypto.randomBytes(24).toString('hex');
    const verificationExpires = new Date(Date.now() + 60 * 60 * 1000);

    user.verificationCode = verificationCode;
    user.verificationToken = verificationToken;
    user.verificationExpires = verificationExpires;

    await sendVerificationEmail({
      to: user.email,
      username: user.username,
      code: verificationCode,
      token: verificationToken,
    });

    return { success: true, message: 'Un nouveau code vous a été envoyé par email.' };
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
