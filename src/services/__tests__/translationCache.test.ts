import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getTranslation, 
  makeTranslationKey, 
  cacheMetrics,
  clearTranslationCache
} from '../translationCache';

// Mock fetch
global.fetch = vi.fn();

// Mock indexedDB
const mockObjectStore = {
  get: vi.fn(),
  put: vi.fn(),
  clear: vi.fn(() => {
    const req: any = {};
    setTimeout(() => req.onsuccess && req.onsuccess(), 0);
    return req;
  })
};

const mockTransaction = {
  objectStore: vi.fn(() => mockObjectStore)
};

const mockDb = {
  objectStoreNames: { contains: vi.fn(() => true) },
  transaction: vi.fn(() => mockTransaction)
};

global.indexedDB = {
  open: vi.fn(() => {
    const request: any = {
      result: mockDb,
      onsuccess: null,
      onerror: null
    };
    setTimeout(() => request.onsuccess && request.onsuccess(), 0);
    return request;
  })
} as any;

describe('Translation Cache System', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Reset metrics
    cacheMetrics.hitsMemory = 0;
    cacheMetrics.hitsDb = 0;
    cacheMetrics.misses = 0;
    cacheMetrics.errors = 0;
    
    // Clear cache state
    await clearTranslationCache();
  });

  it('should generate correct cache keys', () => {
    const key = makeTranslationKey('en.sahih', 2, 255);
    expect(key).toBe('en.sahih:2:255');
  });

  it('should fetch from API when cache is empty', async () => {
    // Setup mock for IndexedDB miss
    mockObjectStore.get.mockImplementation(() => {
      const req: any = { result: undefined };
      setTimeout(() => req.onsuccess && req.onsuccess(), 0);
      return req;
    });

    // Setup mock for API success
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { text: 'Allah! There is no deity except Him' } })
    });

    // Setup mock for save to IndexedDB
    mockObjectStore.put.mockImplementation(() => {
      const req: any = {};
      setTimeout(() => req.onsuccess && req.onsuccess(), 0);
      return req;
    });

    const result = await getTranslation('en.sahih', 2, 255);
    
    expect(result).toBe('Allah! There is no deity except Him');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(cacheMetrics.misses).toBe(1);
    expect(cacheMetrics.hitsMemory).toBe(0);
  });

  it('should return from memory cache on subsequent calls', async () => {
    // Setup mock for IndexedDB miss on first call
    mockObjectStore.get.mockImplementation(() => {
      const req: any = { result: undefined };
      setTimeout(() => req.onsuccess && req.onsuccess(), 0);
      return req;
    });

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { text: 'Allah! There is no deity except Him' } })
    });

    mockObjectStore.put.mockImplementation(() => {
      const req: any = {};
      setTimeout(() => req.onsuccess && req.onsuccess(), 0);
      return req;
    });

    // First call - should hit API
    await getTranslation('en.sahih', 2, 255);
    
    // Second call - should hit memory cache
    const result2 = await getTranslation('en.sahih', 2, 255);
    
    expect(result2).toBe('Allah! There is no deity except Him');
    expect(global.fetch).toHaveBeenCalledTimes(1); // Still 1
    expect(cacheMetrics.misses).toBe(1);
    expect(cacheMetrics.hitsMemory).toBe(1);
  });
});
