import fs from 'fs';
import path from 'path';
import { CacheStats } from '../types/index';

interface CacheEntry<T> {
  data: T;
  cachedAt: number; // timestamp in ms
  expiresAt: number; // timestamp in ms
}

class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private hits: number = 0;
  private misses: number = 0;
  private cacheFilePath: string;

  constructor() {
    this.cacheFilePath = path.resolve(process.cwd(), 'data', 'cache.json');
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const raw = fs.readFileSync(this.cacheFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        const now = Date.now();
        for (const [key, entry] of Object.entries<CacheEntry<any>>(parsed)) {
          if (entry.expiresAt > now) {
            this.cache.set(key, entry);
          }
        }
      }
    } catch (e) {
      console.warn('[CacheService] Falha ao carregar cache do disco, iniciando vazio:', e);
    }
  }

  private persistToDisk(): void {
    try {
      const dataDir = path.dirname(this.cacheFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const obj: Record<string, CacheEntry<any>> = {};
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (entry.expiresAt > now) {
          obj[key] = entry;
        }
      }
      const tempPath = `${this.cacheFilePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(obj, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.cacheFilePath);
    } catch (e) {
      console.warn('[CacheService] Falha ao persistir cache:', e);
    }
  }

  /**
   * Recupera item do cache se ainda válido.
   */
  get<T>(key: string): { data: T; ageSeconds: number } | null {
    const entry = this.cache.get(key);
    const now = Date.now();

    if (!entry) {
      this.misses++;
      return null;
    }

    if (entry.expiresAt <= now) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    const ageSeconds = Math.round((now - entry.cachedAt) / 1000);
    return { data: entry.data as T, ageSeconds };
  }

  /**
   * Armazena item no cache com TTL em segundos.
   * Default: 1800s (30 minutos)
   */
  set<T>(key: string, data: T, ttlSeconds: number = 1800): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      cachedAt: now,
      expiresAt: now + ttlSeconds * 1000
    });
    this.persistToDisk();
  }

  /**
   * Limpa cache por prefixo ou todo o cache.
   */
  clear(prefix?: string): number {
    let clearedCount = 0;
    if (!prefix) {
      clearedCount = this.cache.size;
      this.cache.clear();
    } else {
      for (const key of Array.from(this.cache.keys())) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
          clearedCount++;
        }
      }
    }
    this.persistToDisk();
    return clearedCount;
  }

  /**
   * Estatísticas de desempenho do cache.
   */
  getStats(): CacheStats {
    const now = Date.now();
    // Limpeza de chaves expiradas
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }

    const total = this.hits + this.misses;
    const hitRate = total > 0 ? Number(((this.hits / total) * 100).toFixed(1)) : 0;

    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate,
      cachedKeys: Array.from(this.cache.keys())
    };
  }
}

export const cacheService = new CacheService();
