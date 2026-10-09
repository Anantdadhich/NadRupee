/**
 * Universal Storage Service for NadRupee Mobile
 * Provides safe, cross-platform persistence across React Native, Expo Web, and SSR.
 */

// In-memory fallback dictionary for native or environments where window.localStorage is not accessible
const memoryStorage: Record<string, string> = {};

const isLocalStorageAvailable = (): boolean => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return true;
    }
  } catch {
    // LocalStorage blocked, private mode, or native runtime
  }
  return false;
};

export const storage = {
  getItem: (key: string): string | null => {
    try {
      if (isLocalStorageAvailable()) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn(`[Storage] Failed to read key "${key}" from localStorage:`, e);
    }
    return memoryStorage[key] ?? null;
  },

  setItem: (key: string, value: string): void => {
    try {
      if (isLocalStorageAvailable()) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn(`[Storage] Failed to set key "${key}" in localStorage:`, e);
    }
    memoryStorage[key] = value;
  },

  removeItem: (key: string): void => {
    try {
      if (isLocalStorageAvailable()) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`[Storage] Failed to remove key "${key}" from localStorage:`, e);
    }
    delete memoryStorage[key];
  },

  getJSON: <T>(key: string, fallback: T): T => {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch (e) {
      console.warn(`[Storage] Failed to parse JSON for key "${key}":`, e);
      return fallback;
    }
  },

  setJSON: <T>(key: string, value: T): void => {
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`[Storage] Failed to serialize JSON for key "${key}":`, e);
    }
  },
};
