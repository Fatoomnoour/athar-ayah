const DB_NAME = "athar-ayah-cache";
const STORE_NAME = "translations";
const DB_VERSION = 1;
const CACHE_TTL = 1000 * 60 * 60 * 24 * 60; // 60 days

interface CachedTranslation {
  key: string;
  source: string;
  surahId: number;
  verseNumber: number;
  text: string;
  savedAt: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedTranslation(key: string): Promise<string | null> {
  try {
    const db = await openDatabase();

    return await new Promise<string | null>((resolve, reject) => {
      const request = db
        .transaction(STORE_NAME, "readonly")
        .objectStore(STORE_NAME)
        .get(key);

      request.onsuccess = () => {
        const item = request.result as CachedTranslation | undefined;

        if (!item) {
          resolve(null);
          return;
        }

        const isExpired = Date.now() - item.savedAt > CACHE_TTL;
        resolve(isExpired ? null : item.text);
      };

      request.onerror = () => reject(request.error);
    });
  } catch {
    // Fallback if IndexedDB is not available or fails
    return null;
  }
}

export async function clearTranslationCache(): Promise<void> {
  // Clear memory cache
  memoryCache.clear();
  
  // Clear IndexedDB
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const request = db
        .transaction(STORE_NAME, "readwrite")
        .objectStore(STORE_NAME)
        .clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    console.log("Translation cache cleared successfully");
  } catch (error) {
    console.warn("Translation cache clear failed", error);
  }
}

export async function saveCachedTranslation(item: CachedTranslation): Promise<void> {
  try {
    const db = await openDatabase();

    await new Promise<void>((resolve, reject) => {
      const request = db
        .transaction(STORE_NAME, "readwrite")
        .objectStore(STORE_NAME)
        .put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn("Translation cache write failed", error);
  }
}

export type TranslationSource = "en.sahih" | "en.pickthall" | "en.yusufali";

const memoryCache = new Map<string, string>();
const pendingRequests = new Map<string, Promise<string | null>>();
const MAX_MEMORY_ITEMS = 300;

// Simple metrics for production monitoring
export const cacheMetrics = {
  hitsMemory: 0,
  hitsDb: 0,
  misses: 0,
  errors: 0,
  
  getStats() {
    const total = this.hitsMemory + this.hitsDb + this.misses;
    const hitRate = total === 0 ? 0 : ((this.hitsMemory + this.hitsDb) / total) * 100;
    return {
      totalRequests: total,
      memoryHits: this.hitsMemory,
      dbHits: this.hitsDb,
      apiFetches: this.misses,
      errors: this.errors,
      hitRatePercent: hitRate.toFixed(2) + "%",
      memoryUsage: memoryCache.size
    };
  },
  
  logStats() {
    // Only log occasionally to avoid console spam in production
    if (Math.random() < 0.05) {
      console.log("Translation Cache Stats:", this.getStats());
    }
  }
};

export function makeTranslationKey(
  source: TranslationSource | string,
  surahId: number,
  verseNumber: number
) {
  return `${source}:${surahId}:${verseNumber}`;
}

function setMemoryTranslation(key: string, text: string) {
  memoryCache.delete(key);
  memoryCache.set(key, text);

  while (memoryCache.size > MAX_MEMORY_ITEMS) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) {
      memoryCache.delete(oldestKey);
    } else {
      break;
    }
  }
}

export async function getTranslation(
  source: TranslationSource | string,
  surahId: number,
  verseNumber: number
): Promise<string | null> {
  const key = makeTranslationKey(source, surahId, verseNumber);

  const memoryValue = memoryCache.get(key);
  if (memoryValue) {
    cacheMetrics.hitsMemory++;
    cacheMetrics.logStats();
    return memoryValue;
  }

  const pending = pendingRequests.get(key);
  if (pending) return pending;

  const request = (async () => {
    const storedValue = await getCachedTranslation(key);

    if (storedValue) {
      cacheMetrics.hitsDb++;
      cacheMetrics.logStats();
      setMemoryTranslation(key, storedValue);
      return storedValue;
    }
    
    cacheMetrics.misses++;

    try {
      const response = await fetch(
        `https://api.alquran.cloud/v1/ayah/${surahId}:${verseNumber}/${source}`
      );

      if (!response.ok) return null;

      const result = await response.json();
      const text = String(result.data?.text || "").trim();

      if (!text) return null;

      setMemoryTranslation(key, text);
      await saveCachedTranslation({
        key,
        source,
        surahId,
        verseNumber,
        text,
        savedAt: Date.now(),
      });

      return text;
    } catch (error) {
      cacheMetrics.errors++;
      console.warn("Translation request failed", { key, error });
      return null;
    } finally {
      pendingRequests.delete(key);
    }
  })();

  pendingRequests.set(key, request);
  return request;
}

export async function loadInBatches<T>(
  items: T[],
  batchSize: number,
  worker: (item: T) => Promise<void>
) {
  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    await Promise.all(batch.map(worker));
  }
}
