export interface KeyValueStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
}

export function createMemoryStore(initial: Record<string, unknown> = {}): KeyValueStore {
  const values = new Map<string, unknown>(Object.entries(structuredClone(initial)));
  return {
    async get<T>(key: string) {
      return values.has(key) ? (structuredClone(values.get(key)) as T) : undefined;
    },
    async set<T>(key: string, value: T) {
      values.set(key, structuredClone(value));
    },
  };
}

export function createChromeStore(): KeyValueStore {
  return {
    async get<T>(key: string) {
      const result = await chrome.storage.local.get(key);
      return result[key] as T | undefined;
    },
    async set<T>(key: string, value: T) {
      await chrome.storage.local.set({ [key]: value });
    },
  };
}

const WEB_STORAGE_PREFIX = "github-inbox:";

export function createWebStorageStore(storage: Storage): KeyValueStore {
  return {
    async get<T>(key: string) {
      const stored = storage.getItem(WEB_STORAGE_PREFIX + key);
      return stored === null ? undefined : (JSON.parse(stored) as T);
    },
    async set<T>(key: string, value: T) {
      storage.setItem(WEB_STORAGE_PREFIX + key, JSON.stringify(value));
    },
  };
}
