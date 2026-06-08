import type { Project, SyncState, SyncProgress, SyncDirection, PendingSyncItem } from '@/types';
import { api } from './api';
import { localDB } from './localStorage';

const MAX_RETRY_COUNT = 5;
const RETRY_DELAY_BASE = 1000;
const RETRY_DELAY_MAX = 30000;

type SyncProgressCallback = (progress: SyncProgress) => void;
type SyncStateChangeCallback = (state: SyncState) => void;

class SyncManager {
  private state: SyncState = {
    status: 'idle',
    direction: 'both',
    progress: null,
    error: null,
    lastSyncAt: null,
    pendingChanges: 0,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  };

  private progressListeners: Set<SyncProgressCallback> = new Set();
  private stateListeners: Set<SyncStateChangeCallback> = new Set();
  private isSyncing = false;
  private retryTimer: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
    this.initPendingCount();
  }

  private async initPendingCount() {
    try {
      const pending = await localDB.getPendingSyncItems();
      this.updateState({ pendingChanges: pending.length });
    } catch (e) {
      console.error('初始化待同步计数失败:', e);
    }
  }

  private handleOnline = () => {
    this.updateState({ isOnline: true, status: this.state.status === 'offline' ? 'idle' : this.state.status });
    this.scheduleRetry();
  };

  private handleOffline = () => {
    this.updateState({ isOnline: false, status: 'offline' });
  };

  private scheduleRetry() {
    if (this.retryTimer) return;
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      if (this.state.isOnline && !this.isSyncing) {
        this.autoSyncPendingItems();
      }
    }, 2000);
  }

  getState(): SyncState {
    return { ...this.state };
  }

  onProgress(callback: SyncProgressCallback) {
    this.progressListeners.add(callback);
    return () => this.progressListeners.delete(callback);
  }

  onStateChange(callback: SyncStateChangeCallback) {
    this.stateListeners.add(callback);
    return () => this.stateListeners.delete(callback);
  }

  private updateState(partial: Partial<SyncState>) {
    this.state = { ...this.state, ...partial };
    for (const listener of this.stateListeners) {
      listener({ ...this.state });
    }
  }

  private updateProgress(progress: SyncProgress) {
    this.updateState({ progress });
    for (const listener of this.progressListeners) {
      listener({ ...progress });
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    onRetry?: (attempt: number, error: Error) => void
  ): Promise<T> {
    let attempt = 0;
    while (attempt < MAX_RETRY_COUNT) {
      try {
        return await fn();
      } catch (error) {
        attempt++;
        if (attempt >= MAX_RETRY_COUNT) {
          throw error;
        }
        const delayMs = Math.min(RETRY_DELAY_BASE * Math.pow(2, attempt - 1), RETRY_DELAY_MAX);
        if (onRetry) {
          onRetry(attempt, error as Error);
        }
        await this.delay(delayMs);
      }
    }
    throw new Error('重试次数已用尽');
  }

  async sync(direction: SyncDirection = 'both', projects: Project[]): Promise<Project[]> {
    if (this.isSyncing) {
      throw new Error('同步正在进行中，请稍候');
    }

    this.isSyncing = true;
    this.updateState({
      status: 'syncing',
      direction,
      error: null,
      progress: null,
    });

    try {
      if (!this.state.isOnline) {
        await this.savePendingSyncItems(projects);
        throw new Error('当前处于离线状态，数据已保存到本地待同步队列');
      }

      this.updateProgress({
        phase: 'connecting',
        percent: 5,
        message: '正在连接服务器...',
      });

      const result = await this.executeWithRetry(
        () => api.syncProjects(projects, (phase, percent) => {
          const phaseMap: Record<string, SyncProgress['phase']> = {
            '正在连接服务器': 'connecting',
            '正在上传本地数据': 'uploading',
            '正在下载云端数据': 'downloading',
            '正在合并数据': 'merging',
          };
          this.updateProgress({
            phase: phaseMap[phase] || 'connecting',
            percent: Math.min(percent, 95),
            message: phase,
          });
        }),
        (attempt, error) => {
          this.updateProgress({
            phase: 'connecting',
            percent: this.state.progress?.percent || 5,
            message: `连接失败，正在进行第 ${attempt} 次重试: ${error.message}`,
          });
        }
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || '同步失败');
      }

      this.updateProgress({
        phase: 'completed',
        percent: 100,
        message: '同步完成',
      });

      await localDB.saveProjects(result.data.projects);
      await localDB.clearPendingSyncItems();
      await localDB.setMetadata('lastSyncAt', result.data.lastSync);

      this.updateState({
        status: 'success',
        lastSyncAt: result.data.lastSync,
        pendingChanges: 0,
      });

      return result.data.projects;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      if (!this.state.isOnline) {
        await this.savePendingSyncItems(projects);
        this.updateState({
          status: 'offline',
          error: errorMessage,
          pendingChanges: projects.length,
        });
      } else {
        await this.savePendingSyncItems(projects);
        this.updateState({
          status: 'error',
          error: errorMessage,
          pendingChanges: projects.length,
        });
      }

      throw error;
    } finally {
      this.isSyncing = false;
      setTimeout(() => {
        if (this.state.status === 'success' || this.state.status === 'error') {
          this.updateState({
            progress: null,
            status: this.state.isOnline ? 'idle' : 'offline',
          });
        }
      }, 3000);
    }
  }

  private async savePendingSyncItems(projects: Project[]) {
    await localDB.clearPendingSyncItems();
    const items: PendingSyncItem[] = projects.map((p) => ({
      id: `${p.id}-${Date.now()}`,
      entityType: 'project',
      entityId: p.id,
      operation: 'update',
      data: p,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    }));
    for (const item of items) {
      await localDB.addPendingSyncItem(item);
    }
    this.updateState({ pendingChanges: items.length });
  }

  async autoSyncPendingItems(): Promise<Project[] | null> {
    if (!this.state.isOnline || this.isSyncing) {
      return null;
    }

    try {
      const pendingItems = await localDB.getPendingSyncItems();
      if (pendingItems.length === 0) {
        return null;
      }

      const projects = pendingItems
        .filter((item) => item.entityType === 'project')
        .map((item) => item.data as Project);

      if (projects.length === 0) {
        return null;
      }

      return await this.sync('both', projects);
    } catch (error) {
      console.error('自动同步待处理项目失败:', error);
      return null;
    }
  }

  async loadFromLocal(): Promise<Project[]> {
    try {
      const projects = await localDB.loadProjects();
      if (projects.length > 0) {
        return projects;
      }
    } catch (e) {
      console.warn('从本地数据库加载失败:', e);
    }
    return [];
  }

  async loadFromRemote(): Promise<Project[]> {
    if (!this.state.isOnline) {
      throw new Error('当前处于离线状态');
    }
    const result = await api.fetchProjects();
    if (!result.success || !result.data) {
      throw new Error(result.error || '从服务器加载数据失败');
    }
    return result.data;
  }

  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.progressListeners.clear();
    this.stateListeners.clear();
  }
}

export const syncManager = new SyncManager();
