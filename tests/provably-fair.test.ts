import { describe, it, expect } from 'vitest';
import {
  generateServerSeed,
  hashServerSeed,
  calculateCrashPoint,
  verifyProvablyFair,
} from '../lib/provably-fair';

describe('Moteur Cryptographique Provably Fair', () => {
  it('doit générer une graine serveur de 64 caractères hexadécimaux aléatoires', () => {
    const seed1 = generateServerSeed();
    const seed2 = generateServerSeed();

    expect(seed1).toHaveLength(64);
    expect(seed2).toHaveLength(64);
    expect(seed1).not.toBe(seed2);
    expect(/^[0-9a-f]{64}$/i.test(seed1)).toBe(true);
  });

  it('doit calculer un hash SHA-256 déterministe pour l’engagement', () => {
    const seed = '4a7d8c912e5f3b601a9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a';
    const hash1 = hashServerSeed(seed);
    const hash2 = hashServerSeed(seed);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('doit produire un multiplicateur de crash déterministe et reproductible', () => {
    const serverSeed = 'abc1234567890defabc1234567890defabc1234567890defabc1234567890def';
    const clientSeed = 'aerox-test-seed';
    const nonce = 5;

    const crash1 = calculateCrashPoint(serverSeed, clientSeed, nonce);
    const crash2 = calculateCrashPoint(serverSeed, clientSeed, nonce);

    expect(crash1).toBe(crash2);
    expect(crash1).toBeGreaterThanOrEqual(1.00);
  });

  it('doit valider avec succès une manche authentique via verifyProvablyFair', () => {
    const serverSeed = generateServerSeed();
    const serverSeedHash = hashServerSeed(serverSeed);
    const clientSeed = 'client-seed-v1';
    const nonce = 12;

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
  });

  it('doit détecter toute altération du hash d’engagement', () => {
    const serverSeed = generateServerSeed();
    const fakeHash = '0000000000000000000000000000000000000000000000000000000000000000';
    const clientSeed = 'client-seed-v1';
    const nonce = 1;

    const verification = verifyProvablyFair(serverSeed, fakeHash, clientSeed, nonce);
    expect(verification.isValid).toBe(false);
    expect(verification.hashMatches).toBe(false);
  });

  it('doit détecter toute divergence de multiplicateur', () => {
    const serverSeed = generateServerSeed();
    const serverSeedHash = hashServerSeed(serverSeed);
    const clientSeed = 'client-seed-v1';
    const nonce = 1;

    const realCrashPoint = calculateCrashPoint(serverSeed, clientSeed, nonce);
    const fakeCrashPoint = realCrashPoint + 5.0; // altéré

    const verification = verifyProvablyFair(
      serverSeed,
      serverSeedHash,
      clientSeed,
      nonce,
      fakeCrashPoint
    );

    expect(verification.isValid).toBe(false);
    expect(verification.crashPointMatches).toBe(false);
  });
});
