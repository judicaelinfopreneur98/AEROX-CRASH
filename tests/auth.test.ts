import { describe, it, expect } from 'vitest';
import { AuthService } from '../auth/AuthService';
import { canAccessAdmin, canAdjustBalance, canManageUsers } from '../auth/rbac';

describe('Authentification et Contrôle d’Accès (RBAC)', () => {
  const auth = AuthService.getInstance();

  it('doit connecter le Super Administrateur avec les identifiants préconfigurés', async () => {
    const res = await auth.login('admin@aerox.io', 'Admin123!');
    expect(res.accessToken).toBeDefined();
    expect(res.user.role).toBe('SUPER_ADMIN');
    expect(res.user.username).toBe('AeroxAdmin');
  });

  it('doit connecter le joueur démo avec les identifiants préconfigurés', async () => {
    const res = await auth.login('demo@aerox.io', 'Demo123!');
    expect(res.accessToken).toBeDefined();
    expect(res.user.role).toBe('USER');
    expect(res.user.username).toBe('PiloteDemo');
  });

  it('doit inscrire un nouvel utilisateur avec succès et lui attribuer un portefeuille', async () => {
    const testEmail = `newuser_${Date.now()}@aerox.io`;
    const res = await auth.register('SkyRunner', testEmail, 'Password123!');

    expect(res.token).toBeDefined();
    expect(res.user.username).toBe('SkyRunner');
    expect(res.user.role).toBe('USER');
  });

  it('doit rejeter une inscription avec une adresse email déjà existante', async () => {
    await expect(
      auth.register('AnotherPilot', 'demo@aerox.io', 'Password123!')
    ).rejects.toThrow('compte existe déjà');
  });

  it('doit enregistrer la devise choisie et initialiser le statut email non vérifié', async () => {
    const testEmail = `fcfa_${Date.now()}@aerox.io`;
    const res = await auth.register('FcfaMaster', testEmail, 'Password123!', 'FCFA');

    expect(res.user.currency).toBe('FCFA');
    expect(res.user.isEmailVerified).toBe(false);
    expect(res.verificationCode).toBeDefined();

    // Vérification du code email
    const verified = await auth.verifyEmailCode(testEmail, res.verificationCode!);
    expect(verified.user.isEmailVerified).toBe(true);
  });

  it('doit vérifier les permissions RBAC avec rigueur', () => {
    // SUPER_ADMIN
    expect(canAccessAdmin('SUPER_ADMIN')).toBe(true);
    expect(canAdjustBalance('SUPER_ADMIN')).toBe(true);
    expect(canManageUsers('SUPER_ADMIN')).toBe(true);

    // ADMIN
    expect(canAccessAdmin('ADMIN')).toBe(true);
    expect(canAdjustBalance('ADMIN')).toBe(false); // Réservé au SUPER_ADMIN
    expect(canManageUsers('ADMIN')).toBe(true);

    // USER standard
    expect(canAccessAdmin('USER')).toBe(false);
    expect(canAdjustBalance('USER')).toBe(false);
    expect(canManageUsers('USER')).toBe(false);
  });
});
