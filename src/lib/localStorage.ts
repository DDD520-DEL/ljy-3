import type { Project, PendingSyncItem } from '@/types';

const DB_NAME = 'stellar-spectra-db';
const DB_VERSION = 1;

const STORES = {
  PROJECTS: 'projects',
  PENDING_SYNC: 'pendingSync',
  SYNC_LOG: 'syncLog',
  METADATA: 'metadata',
} as const;

type StoreName = typeof STORES[keyof typeof STORES];

class LocalDatabase {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
          const projectStore = db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
          projectStore.createIndex('updatedAt', 'updatedAt');
        }

        if (!db.objectStoreNames.contains(STORES.PENDING_SYNC)) {
          const pendingStore = db.createObjectStore(STORES.PENDING_SYNC, { keyPath: 'id' });
          pendingStore.createIndex('createdAt', 'createdAt');
          pendingStore.createIndex('entityType', 'entityType');
        }

        if (!db.objectStoreNames.contains(STORES.SYNC_LOG)) {
          const logStore = db.createObjectStore(STORES.SYNC_LOG, { keyPath: 'id' });
          logStore.createIndex('timestamp', 'timestamp');
        }

        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
        }
      };
    });

    return this.initPromise;
  }

  private async getStore(storeName: StoreName, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.init();
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  private async runRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveProjects(projects: Project[]): Promise<void> {
    const store = await this.getStore(STORES.PROJECTS, 'readwrite');
    store.clear();
    for (const project of projects) {
      store.put(project);
    }
  }

  async loadProjects(): Promise<Project[]> {
    const store = await this.getStore(STORES.PROJECTS);
    return this.runRequest(store.getAll());
  }

  async saveProject(project: Project): Promise<void> {
    const store = await this.getStore(STORES.PROJECTS, 'readwrite');
    await this.runRequest(store.put(project));
  }

  async deleteProject(projectId: string): Promise<void> {
    const store = await this.getStore(STORES.PROJECTS, 'readwrite');
    await this.runRequest(store.delete(projectId));
  }

  async addPendingSyncItem(item: PendingSyncItem): Promise<void> {
    const store = await this.getStore(STORES.PENDING_SYNC, 'readwrite');
    await this.runRequest(store.put(item));
  }

  async getPendingSyncItems(): Promise<PendingSyncItem[]> {
    const store = await this.getStore(STORES.PENDING_SYNC);
    return this.runRequest(store.getAll());
  }

  async removePendingSyncItem(id: string): Promise<void> {
    const store = await this.getStore(STORES.PENDING_SYNC, 'readwrite');
    await this.runRequest(store.delete(id));
  }

  async clearPendingSyncItems(): Promise<void> {
    const store = await this.getStore(STORES.PENDING_SYNC, 'readwrite');
    await this.runRequest(store.clear());
  }

  async updatePendingSyncItem(item: PendingSyncItem): Promise<void> {
    const store = await this.getStore(STORES.PENDING_SYNC, 'readwrite');
    await this.runRequest(store.put(item));
  }

  async setMetadata(key: string, value: unknown): Promise<void> {
    const store = await this.getStore(STORES.METADATA, 'readwrite');
    await this.runRequest(store.put({ key, value }));
  }

  async getMetadata<T>(key: string): Promise<T | null> {
    const store = await this.getStore(STORES.METADATA);
    const result = await this.runRequest(store.get(key));
    return result ? (result.value as T) : null;
  }

  async close(): Promise<void> {
    if (this.db) this.db.close();
    this.db = null;
    this.initPromise = null;
  }
}

export const localDB = new LocalDatabase();
