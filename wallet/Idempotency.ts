/**
 * Gestionnaire d'idempotence en mémoire / base pour neutraliser les requêtes dupliquées
 * et les attaques par rejeu réseau.
 */

export interface IdempotencyRecord {
  key: string;
  response: any;
  createdAt: number;
}

export class IdempotencyManager {
  private static instance: IdempotencyManager;
  private cache: Map<string, IdempotencyRecord> = new Map();
  private readonly ttlMs: number = 24 * 60 * 60 * 1000; // 24h

  private constructor() {
    // Nettoyage périodique toutes les 30 minutes
    setInterval(() => this.cleanup(), 30 * 60 * 1000).unref();
  }

  public static getInstance(): IdempotencyManager {
    if (!IdempotencyManager.instance) {
      IdempotencyManager.instance = new IdempotencyManager();
    }
    return IdempotencyManager.instance;
  }

  public get(key: string): any | null {
    const record = this.cache.get(key);
    if (!record) return null;
    if (Date.now() - record.createdAt > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return record.response;
  }

  public set(key: string, response: any): void {
    this.cache.set(key, {
      key,
      response,
      createdAt: Date.now(),
    });
  }

  public clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.cache.entries()) {
      if (now - record.createdAt > this.ttlMs) {
        this.cache.delete(key);
      }
    }
  }
}
