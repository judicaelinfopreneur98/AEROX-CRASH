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

  it('doit enregistrer la devise choisie, sécuriser le code OTP (SHA-256) et ne jamais le divulguer dans la réponse API', async () => {
    const testEmail = `fcfa_${Date.now()}@aerox.io`;
    const res = await auth.register('FcfaMaster', testEmail, 'Password123!', 'FCFA');

    expect(res.user.currency).toBe('FCFA');
    expect(res.user.isEmailVerified).toBe(false);
    // Le code à 6 chiffres ne doit JAMAIS être retourné au client
    expect((res as any).verificationCode).toBeUndefined();

    // Configuration d'un code de test pour vérifier la validation du hash
    const testCode = '849201';
    auth._setVerificationCodeForTest(testEmail, testCode);

    // Tentative avec code incorrect (doit décompter les tentatives)
    await expect(auth.verifyEmailCode(testEmail, '000000')).rejects.toThrow('Code de vérification incorrect. (4 tentatives restantes)');

    // Vérification réussie avec le bon code
    const verified = await auth.verifyEmailCode(testEmail, testCode);
    expect(verified.user.isEmailVerified).toBe(true);

    // Une fois validé, une nouvelle tentative doit confirmer que le compte est déjà vérifié
    const already = await auth.verifyEmailCode(testEmail, testCode);
    expect(already.user.isEmailVerified).toBe(true);
  });

  it('doit invalider le code après 5 tentatives erronées consécutives', async () => {
    const testEmail = `bruteforce_${Date.now()}@aerox.io`;
    await auth.register('BruteTarget', testEmail, 'Password123!');
    auth._setVerificationCodeForTest(testEmail, '123456');

    // 4 tentatives erronées
    await expect(auth.verifyEmailCode(testEmail, '000001')).rejects.toThrow();
    await expect(auth.verifyEmailCode(testEmail, '000002')).rejects.toThrow();
    await expect(auth.verifyEmailCode(testEmail, '000003')).rejects.toThrow();
    await expect(auth.verifyEmailCode(testEmail, '000004')).rejects.toThrow();

    // 5ème tentative erronée -> code invalidé
    await expect(auth.verifyEmailCode(testEmail, '000005')).rejects.toThrow(/invalidé/);

    // Même avec le bon code après invalidation, doit refuser
    await expect(auth.verifyEmailCode(testEmail, '123456')).rejects.toThrow(/Aucun code de vérification actif|invalidé/);
  });

  it('doit rejeter un code de vérification expiré (plus de 10 minutes)', async () => {
    const testEmail = `expired_${Date.now()}@aerox.io`;
    await auth.register('ExpiredTarget', testEmail, 'Password123!');
    // Code expiré dans le passé (-1 seconde)
    auth._setVerificationCodeForTest(testEmail, '654321', -1000);

    await expect(auth.verifyEmailCode(testEmail, '654321')).rejects.toThrow(/expiré/);
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
