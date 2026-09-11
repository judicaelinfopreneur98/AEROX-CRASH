import crypto from 'crypto';

export interface ProvablyFairRound {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  crashPoint: number;
}

export interface VerificationResult {
  isValid: boolean;
  computedHash: string;
  computedCrashPoint: number;
  hashMatches: boolean;
  crashPointMatches: boolean;
  sha512Hash: string;
  hex52: string;
  decimal52: string;
  isInstantCrash: boolean;
}

/**
 * Génère une graine de serveur cryptographiquement sécurisée (chaîne hex de 32 octets).
 * Dans Aviator de Spribe, le Server Seed est composé de symboles aléatoires côté serveur.
 */
export function generateServerSeed(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Calcule l'engagement cryptographique public (SHA-256) de la graine serveur.
 * Ce hash est publié aux joueurs avant le début de la manche pour garantir
 * qu'aucun changement n'est possible a posteriori.
 */
export function hashServerSeed(serverSeed: string): string {
  return crypto.createHash('sha256').update(serverSeed).digest('hex');
}

/**
 * Génère ou combine les graines client (Client Seeds).
 * Comme dans Aviator (Spribe), jusqu'à 3 graines clients des premiers parieurs sont combinées.
 */
export function combineClientSeeds(seeds: string[]): string {
  const validSeeds = seeds.filter(Boolean);
  if (validSeeds.length === 0) {
    return 'aerox_quantum_seed_001';
  }
  return validSeeds.join('_');
}

/**
 * Calcule le hash SHA-512 à partir de la graine serveur et de la graine client (ou nonce).
 * Utilise HMAC-SHA512 produisant 128 caractères hexadécimaux (512 bits).
 */
export function computeSha512Hash(serverSeed: string, clientSeed: string, nonce: number = 0): string {
  const message = nonce > 0 ? `${clientSeed}:${nonce}` : clientSeed;
  return crypto.createHmac('sha512', serverSeed).update(message).digest('hex');
}

/**
 * Moteur Provably Fair strict conforme au principe Spribe Aviator :
 * 1. HMAC-SHA512(serverSeed, clientSeed:nonce)
 * 2. Extraction des 52 premiers bits (13 caractères hexadécimaux)
 * 3. Test de l'avantage maison de ~3.03% (1 chance sur 33 de crash instantané à 1.00x)
 * 4. Multiplicateur = floor((100 * 2^52 - h) / (2^52 - h)) / 100
 * 5. Minimum 1.00x garanti, arrondi à 2 décimales.
 */
export function calculateCrashPoint(
  serverSeed: string,
  clientSeed: string,
  nonce: number = 0
): number {
  const hmac = computeSha512Hash(serverSeed, clientSeed, nonce);

  // Extraction des 13 premiers caractères hex (52 bits)
  const hex52 = hmac.substring(0, 13);
  const h = parseInt(hex52, 16);
  const e = Math.pow(2, 52);

  // Règle Spribe Aviator : 1 chance sur 33 d'un crash direct à 1.00x
  if (h % 33 === 0) {
    return 1.00;
  }

  // Formule déterministe de distribution inverse
  const result = Math.floor((100 * e - h) / (e - h)) / 100;
  return Math.max(1.00, Number(result.toFixed(2)));
}

/**
 * Analyse détaillée de calcul Provably Fair pour vérificateur et radar.
 */
export function calculateCrashPointDetailed(
  serverSeed: string,
  clientSeed: string,
  nonce: number = 0
) {
  const sha512Hash = computeSha512Hash(serverSeed, clientSeed, nonce);
  const hex52 = sha512Hash.substring(0, 13);
  const h = parseInt(hex52, 16);
  const e = Math.pow(2, 52);
  const isInstantCrash = h % 33 === 0;

  let crashPoint = 1.00;
  if (!isInstantCrash) {
    const raw = Math.floor((100 * e - h) / (e - h)) / 100;
    crashPoint = Math.max(1.00, Number(raw.toFixed(2)));
  }

  return {
    crashPoint,
    sha512Hash,
    hex52,
    decimal52: h.toString(),
    isInstantCrash,
    serverSeedHash: hashServerSeed(serverSeed),
  };
}

/**
 * Vérification indépendante d'une manche Provably Fair.
 */
export function verifyProvablyFair(
  serverSeed: string,
  serverSeedHash: string,
  clientSeed: string,
  nonce: number = 0,
  expectedCrashPoint?: number
): VerificationResult {
  const computedHash = hashServerSeed(serverSeed);
  const detailed = calculateCrashPointDetailed(serverSeed, clientSeed, nonce);

  const hashMatches = computedHash.toLowerCase() === serverSeedHash.toLowerCase();
  const crashPointMatches = expectedCrashPoint !== undefined
    ? Math.abs(detailed.crashPoint - expectedCrashPoint) < 0.001
    : true;

  return {
    isValid: hashMatches && crashPointMatches,
    computedHash,
    computedCrashPoint: detailed.crashPoint,
    hashMatches,
    crashPointMatches,
    sha512Hash: detailed.sha512Hash,
    hex52: detailed.hex52,
    decimal52: detailed.decimal52,
    isInstantCrash: detailed.isInstantCrash,
  };
}
