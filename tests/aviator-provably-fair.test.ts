import { describe, it, expect } from 'vitest';
import {
  generateServerSeed,
  hashServerSeed,
  calculateCrashPoint,
  calculateCrashPointDetailed,
  verifyProvablyFair,
} from '../lib/provably-fair';

describe('Moteur Provably Fair Spribe Aviator (SHA-512)', () => {
  it('garantit que le même jeu de seeds produit toujours STRICTEMENT le même multiplicateur (Déterminisme absolu)', () => {
    const serverSeed = 'b10a8db164e0754105b7a99be72e3fe5aa29c4bc8073b6fe811b7a2b97f39b6e';
    const clientSeed = 'aviator-spribe-client-seed-2026';
    const nonce = 100;

    const crash1 = calculateCrashPoint(serverSeed, clientSeed, nonce);
    const crash2 = calculateCrashPoint(serverSeed, clientSeed, nonce);
    const crash3 = calculateCrashPoint(serverSeed, clientSeed, nonce);

    expect(crash1).toBe(crash2);
    expect(crash2).toBe(crash3);
    expect(typeof crash1).toBe('number');
    expect(crash1).toBeGreaterThanOrEqual(1.00);
  });

  it('produit exactement le même résultat sur 500 itérations indépendantes avec les mêmes paramètres', () => {
    const serverSeed = 'f4c288960e6f21d3e8e19c3b88a5202611a91e5e6b7c8d9a0f1e2d3c4b5a6978';
    const clientSeed = 'shared-client-seed';
    const nonce = 42;

    const baseline = calculateCrashPoint(serverSeed, clientSeed, nonce);

    for (let i = 0; i < 500; i++) {
      const current = calculateCrashPoint(serverSeed, clientSeed, nonce);
      expect(current).toBe(baseline);
    }
  });

  it('génère un hash HMAC-SHA512 de 128 caractères hexadécimaux', () => {
    const serverSeed = generateServerSeed();
    const clientSeed = 'test-client';
    const nonce = 1;

    const details = calculateCrashPointDetailed(serverSeed, clientSeed, nonce);

    expect(details.sha512Hash).toHaveLength(128);
    expect(/^[0-9a-f]{128}$/i.test(details.sha512Hash)).toBe(true);
    expect(details.hex52).toHaveLength(13);
    expect(details.serverSeedHash).toHaveLength(64);
  });

  it('garantit un multiplicateur toujours supérieur ou égal à 1.00x', () => {
    for (let nonce = 0; nonce < 100; nonce++) {
      const serverSeed = generateServerSeed();
      const crashPoint = calculateCrashPoint(serverSeed, 'client-test', nonce);
      expect(crashPoint).toBeGreaterThanOrEqual(1.00);
    }
  });

  it('garantit que le multiplicateur est toujours calibré à exactement 2 décimales', () => {
    for (let nonce = 0; nonce < 50; nonce++) {
      const serverSeed = generateServerSeed();
      const crashPoint = calculateCrashPoint(serverSeed, 'precision-test', nonce);
      const str = crashPoint.toString();
      const parts = str.split('.');
      if (parts.length > 1) {
        expect(parts[1].length).toBeLessThanOrEqual(2);
      }
    }
  });

  it('applique correctement la règle Spribe Aviator de crash instantané à 1.00x (avantage maison h % 33 === 0)', () => {
    const serverSeed = 'd9f3b145a8726c0e41b9d7e5f3a1c8b2d4e6f8a0b3c5d7e9f1a2b4c6d8e0f2a4';
    let foundInstantCrash = false;

    // Sur 200 nonces, la probabilité de trouver au moins un h % 33 === 0 est > 99.8%
    for (let nonce = 0; nonce < 200; nonce++) {
      const details = calculateCrashPointDetailed(serverSeed, 'aviator-instant-test', nonce);
      if (details.isInstantCrash) {
        foundInstantCrash = true;
        expect(details.crashPoint).toBe(1.00);
        break;
      }
    }

    expect(foundInstantCrash).toBe(true);
  });

  it('valide avec succès le protocole Provably Fair complet', () => {
    const serverSeed = generateServerSeed();
    const serverSeedHash = hashServerSeed(serverSeed);
    const clientSeed = 'audit-client-seed';
    const nonce = 77;

    const crashPoint = calculateCrashPoint(serverSeed, clientSeed, nonce);

    const verification = verifyProvablyFair(
      serverSeed,
      serverSeedHash,
      clientSeed,
      nonce,
      crashPoint
    );

    expect(verification.isValid).toBe(true);
    expect(verification.hashMatches).toBe(true);
    expect(verification.crashPointMatches).toBe(true);
    expect(verification.computedCrashPoint).toBe(crashPoint);
    expect(verification.sha512Hash).toHaveLength(128);
    expect(verification.hex52).toHaveLength(13);
  });

  it('rejette fermement une tentative de manipulation du crash point après scellement', () => {
    const serverSeed = generateServerSeed();
    const serverSeedHash = hashServerSeed(serverSeed);
    const clientSeed = 'audit-client-seed';
    const nonce = 77;

    const realCrashPoint = calculateCrashPoint(serverSeed, clientSeed, nonce);
    const manipulatedCrashPoint = realCrashPoint + 0.01;

    const verification = verifyProvablyFair(
      serverSeed,
      serverSeedHash,
      clientSeed,
      nonce,
      manipulatedCrashPoint
    );

    expect(verification.isValid).toBe(false);
    expect(verification.crashPointMatches).toBe(false);
  });
});
