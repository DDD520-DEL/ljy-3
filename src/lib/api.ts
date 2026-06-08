import type { Project } from '@/types';

const SIMULATED_LATENCY = {
  MIN: 300,
  MAX: 800,
} as const;

const SIMULATED_FAILURE_RATE = 0.08;

let serverProjects: Project[] = [];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const simulateLatency = async () => {
  const delay = SIMULATED_LATENCY.MIN + Math.random() * (SIMULATED_LATENCY.MAX - SIMULATED_LATENCY.MIN);
  await sleep(delay);
};

const maybeFail = async () => {
  if (Math.random() < SIMULATED_FAILURE_RATE) {
    throw new Error('网络连接超时，请稍后重试');
  }
};

const genId = () => Math.random().toString(36).substring(2, 9);

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const api = {
  async checkConnect(): Promise<ApiResponse<{ serverTime: string }>> {
    await simulateLatency();
    await maybeFail();
    return {
      success: true,
      data: { serverTime: new Date().toISOString() },
    };
  },

  async fetchProjects(): Promise<ApiResponse<Project[]>> {
    await simulateLatency();
    await maybeFail();
    return {
      success: true,
      data: JSON.parse(JSON.stringify(serverProjects)),
    };
  },

  async uploadProjects(projects: Project[]): Promise<ApiResponse<{ updatedAt: string }>> {
    await simulateLatency();
    await maybeFail();
    const updatedAt = new Date().toISOString();
    serverProjects = JSON.parse(JSON.stringify(projects));
    return {
      success: true,
      data: { updatedAt },
    };
  },

  async syncProjects(
    localProjects: Project[],
    onProgress?: (phase: string, percent: number) => void
  ): Promise<ApiResponse<{ projects: Project[]; lastSync: string }>> {
    const totalSteps = Math.max(localProjects.length, 5);
    for (let i = 0; i < totalSteps; i++) {
      await simulateLatency();
      await maybeFail();
      if (onProgress) {
        const phase = i < totalSteps * 0.3 ? '正在连接服务器' : i < totalSteps * 0.7 ? '正在上传本地数据' : i < totalSteps * 0.9 ? '正在下载云端数据' : '正在合并数据';
        onProgress(phase, Math.min(((i + 1) / totalSteps) * 100, 100));
      }
    }
    const merged = mergeProjects(localProjects, serverProjects);
    serverProjects = JSON.parse(JSON.stringify(merged));
    return {
      success: true,
      data: {
        projects: JSON.parse(JSON.stringify(serverProjects)),
        lastSync: new Date().toISOString(),
      },
    };
  },
};

function mergeProjects(local: Project[], remote: Project[]): Project[] {
  const mergedMap = new Map<string, Project>();
  for (const p of remote) {
    mergedMap.set(p.id, { ...p });
  }
  for (const p of local) {
    const existing = mergedMap.get(p.id);
    if (!existing || new Date(p.updatedAt) > new Date(existing.updatedAt)) {
      mergedMap.set(p.id, { ...p });
    }
  }
  return Array.from(mergedMap.values());
}

export { sleep, genId };
