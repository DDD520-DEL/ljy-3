import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  SpectrumData,
  BeStarObservation,
  ClassificationResult,
  Project,
  ProjectData,
  SyncState,
  SyncDirection,
  WorkspaceState,
} from '@/types';
import { generateSampleSpectrum, SPECTRAL_LINES, MK_TEMPLATES } from '@/data/astronomy';
import { syncManager } from '@/lib/syncManager';
import { localDB } from '@/lib/localStorage';

const genId = () => Math.random().toString(36).substring(2, 9);

const PERSIST_QUEUE_KEY = 'stellar-spectra-workspace';

interface WriteQueueItem {
  projects: Project[];
  resolve: () => void;
  reject: (err: unknown) => void;
}

class PersistenceQueue {
  private queue: WriteQueueItem[] = [];
  private isFlushing = false;
  private latestProjects: Project[] | null = null;

  enqueue(projects: Project[]): Promise<void> {
    this.latestProjects = projects;
    return new Promise((resolve, reject) => {
      this.queue.push({ projects, resolve, reject });
      if (!this.isFlushing) {
        this.flush();
      }
    });
  }

  getLatest(): Project[] | null {
    return this.latestProjects;
  }

  private async flush() {
    if (this.isFlushing) return;
    this.isFlushing = true;

    try {
      while (this.queue.length > 0) {
        const batch = this.queue;
        this.queue = [];

        if (this.latestProjects) {
          try {
            await localDB.saveProjects(this.latestProjects);
            for (const item of batch) {
              item.resolve();
            }
          } catch (e) {
            console.error('写入 IndexedDB 失败:', e);
            for (const item of batch) {
              item.reject(e);
            }
          }
        }
      }
    } finally {
      this.isFlushing = false;
      if (this.queue.length > 0) {
        this.flush();
      }
    }
  }
}

const persistQueue = new PersistenceQueue();

const persistProjects = (projects: Project[]): Promise<void> => {
  return persistQueue.enqueue(projects);
};

const createEmptyProjectData = (): ProjectData => ({
  spectra: [],
  beObservations: [],
  currentSpectrumId: null,
  selectedTargetName: '',
  classificationResult: null,
});

const createSampleProjectData = (): ProjectData => {
  const sampleTypes = ['O9V', 'A0V', 'A5V', 'B0V', 'G2V', 'K0V', 'M0V'];
  const spectraList: SpectrumData[] = sampleTypes.map((type, idx) => {
    const wlPoints = generateSampleSpectrum(type, 0.015);
    return {
      id: genId(),
      name: `样本光谱 ${idx + 1} - ${type}`,
      targetName: idx < 3 ? 'HD 209458' : idx < 5 ? 'Gamma Cas' : 'Vega',
      observationDate: new Date(Date.now() - idx * 86400000 * 7).toISOString().split('T')[0],
      wavelengthMin: Math.min(...wlPoints.map((p) => p.wavelength)),
      wavelengthMax: Math.max(...wlPoints.map((p) => p.wavelength)),
      points: wlPoints,
      isNormalized: true,
    };
  });

  const obsList: BeStarObservation[] = [];
  for (let i = 0; i < 6; i++) {
    const date = new Date(Date.now() - i * 86400000 * 7);
    obsList.push({
      id: genId(),
      targetName: 'Gamma Cas',
      observationDate: date.toISOString().split('T')[0],
      spectrumId: spectraList[3 + (i % 3)].id,
      haEW: -8.5 - Math.sin(i * 0.8) * 2.5 - (Math.random() - 0.5),
      hbEW: -2.1 - Math.sin(i * 0.8) * 0.8,
      vMagnitude: 2.47 + (Math.random() - 0.5) * 0.05,
    });
  }

  return {
    spectra: spectraList,
    currentSpectrumId: spectraList[2].id,
    beObservations: obsList,
    selectedTargetName: 'Gamma Cas',
    classificationResult: null,
  };
};

const createDefaultProjects = (): Project[] => {
  const now = new Date().toISOString();
  return [
    {
      id: genId(),
      name: '昴星团巡天2026',
      description: '昴星团（M45）恒星光谱巡天观测项目',
      createdAt: now,
      updatedAt: now,
      data: createSampleProjectData(),
    },
    {
      id: genId(),
      name: 'Be星长期监测',
      description: 'Be星发射线长期监测计划',
      createdAt: now,
      updatedAt: now,
      data: createEmptyProjectData(),
    },
  ];
};

const migrateFromLocalStorage = async (): Promise<Project[] | null> => {
  try {
    const raw = localStorage.getItem(PERSIST_QUEUE_KEY);
    if (!raw) return null;

    let parsed: WorkspaceState | null = null;
    try {
      parsed = JSON.parse(raw) as WorkspaceState;
    } catch {
      return null;
    }

    if (!parsed || !Array.isArray(parsed.projects) || parsed.projects.length === 0) {
      return null;
    }

    const migrated: Project[] = parsed.projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      data: {
        spectra: Array.isArray(p.data?.spectra) ? p.data.spectra : [],
        beObservations: Array.isArray(p.data?.beObservations) ? p.data.beObservations : [],
        currentSpectrumId: p.data?.currentSpectrumId ?? null,
        selectedTargetName: p.data?.selectedTargetName ?? '',
        classificationResult: p.data?.classificationResult ?? null,
      },
    }));

    if (migrated.length > 0) {
      await localDB.saveProjects(migrated);
      console.info(`[迁移] 从 localStorage 迁移了 ${migrated.length} 个项目到 IndexedDB`);
    }

    return migrated;
  } catch (e) {
    console.warn('[迁移] localStorage 数据迁移失败:', e);
    return null;
  }
};

interface AppState {
  projects: Project[];
  currentProjectId: string | null;
  visibleLineCategories: { hydrogen: boolean; helium: boolean; metal: boolean };
  normalizationRange: { min: number; max: number } | null;

  spectra: SpectrumData[];
  currentSpectrumId: string | null;
  beObservations: BeStarObservation[];
  selectedTargetName: string;
  classificationResult: ClassificationResult | null;

  syncState: SyncState;
  isInitializing: boolean;
  initError: string | null;
  isMigrated: boolean;

  createProject: (name: string, description?: string, withSampleData?: boolean) => void;
  switchProject: (projectId: string) => void;
  deleteProject: (projectId: string) => void;
  renameProject: (projectId: string, name: string, description?: string) => void;
  getCurrentProject: () => Project | undefined;

  addSpectrum: (spectrum: SpectrumData) => void;
  setCurrentSpectrum: (id: string | null) => void;
  deleteSpectrum: (id: string) => void;
  addBeObservation: (obs: BeStarObservation) => void;
  setSelectedTarget: (name: string) => void;
  setClassificationResult: (result: ClassificationResult | null) => void;
  toggleLineCategory: (category: 'hydrogen' | 'helium' | 'metal') => void;
  setNormalizationRange: (range: { min: number; max: number } | null) => void;
  loadSampleData: () => void;
  clearAll: () => void;

  startSync: (direction?: SyncDirection) => Promise<void>;
  initializeData: () => Promise<void>;
  waitForPersistence: () => Promise<void>;
}

const syncProjectToState = (projects: Project[], projectId: string | null) => {
  const project = projects.find((p) => p.id === projectId);
  if (!project) {
    return {
      spectra: [],
      currentSpectrumId: null as string | null,
      beObservations: [],
      selectedTargetName: '',
      classificationResult: null as ClassificationResult | null,
    };
  }
  return {
    spectra: project.data.spectra,
    currentSpectrumId: project.data.currentSpectrumId,
    beObservations: project.data.beObservations,
    selectedTargetName: project.data.selectedTargetName,
    classificationResult: project.data.classificationResult,
  };
};

const updateProjectData = (
  projects: Project[],
  projectId: string,
  updater: (data: ProjectData) => ProjectData
): Project[] =>
  projects.map((p) =>
    p.id === projectId
      ? { ...p, data: updater(p.data), updatedAt: new Date().toISOString() }
      : p
  );

const defaultProjects = createDefaultProjects();
const initialProjectId = defaultProjects[0]?.id || null;
const initialSyncState = syncManager.getState();

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      projects: defaultProjects,
      currentProjectId: initialProjectId,
      visibleLineCategories: { hydrogen: true, helium: true, metal: false },
      normalizationRange: null,
      ...syncProjectToState(defaultProjects, initialProjectId),

      syncState: initialSyncState,
      isInitializing: false,
      initError: null,
      isMigrated: false,

      getCurrentProject: () => {
        const { projects, currentProjectId } = get();
        return projects.find((p) => p.id === currentProjectId);
      },

      createProject: (name, description, withSampleData = false) => {
        const now = new Date().toISOString();
        const newProject: Project = {
          id: genId(),
          name,
          description,
          createdAt: now,
          updatedAt: now,
          data: withSampleData ? createSampleProjectData() : createEmptyProjectData(),
        };
        set((state) => {
          const newProjects = [...state.projects, newProject];
          void persistProjects(newProjects);
          return {
            projects: newProjects,
            currentProjectId: newProject.id,
            ...syncProjectToState(newProjects, newProject.id),
          };
        });
      },

      switchProject: (projectId) => {
        set((state) => ({
          currentProjectId: projectId,
          ...syncProjectToState(state.projects, projectId),
        }));
      },

      deleteProject: (projectId) => {
        set((state) => {
          const filtered = state.projects.filter((p) => p.id !== projectId);
          const newCurrentId =
            state.currentProjectId === projectId ? filtered[0]?.id || null : state.currentProjectId;
          void persistProjects(filtered);
          return {
            projects: filtered,
            currentProjectId: newCurrentId,
            ...syncProjectToState(filtered, newCurrentId),
          };
        });
      },

      renameProject: (projectId, name, description) => {
        set((state) => {
          const newProjects = state.projects.map((p) =>
            p.id === projectId
              ? { ...p, name, description, updatedAt: new Date().toISOString() }
              : p
          );
          void persistProjects(newProjects);
          return { projects: newProjects };
        });
      },

      addSpectrum: (spectrum) =>
        set((state) => {
          if (!state.currentProjectId) return state;
          const newProjects = updateProjectData(
            state.projects,
            state.currentProjectId,
            (data) => ({
              ...data,
              spectra: [...data.spectra, spectrum],
              currentSpectrumId: data.currentSpectrumId || spectrum.id,
            })
          );
          void persistProjects(newProjects);
          return {
            projects: newProjects,
            ...syncProjectToState(newProjects, state.currentProjectId),
          };
        }),

      setCurrentSpectrum: (id) =>
        set((state) => {
          if (!state.currentProjectId) return state;
          const newProjects = updateProjectData(
            state.projects,
            state.currentProjectId,
            (data) => ({
              ...data,
              currentSpectrumId: id,
            })
          );
          void persistProjects(newProjects);
          return {
            projects: newProjects,
            ...syncProjectToState(newProjects, state.currentProjectId),
          };
        }),

      deleteSpectrum: (id) =>
        set((state) => {
          if (!state.currentProjectId) return state;
          const newProjects = updateProjectData(
            state.projects,
            state.currentProjectId,
            (data) => {
              const filtered = data.spectra.filter((s) => s.id !== id);
              return {
                ...data,
                spectra: filtered,
                currentSpectrumId:
                  data.currentSpectrumId === id ? filtered[0]?.id || null : data.currentSpectrumId,
              };
            }
          );
          void persistProjects(newProjects);
          return {
            projects: newProjects,
            ...syncProjectToState(newProjects, state.currentProjectId),
          };
        }),

      addBeObservation: (obs) =>
        set((state) => {
          if (!state.currentProjectId) return state;
          const newProjects = updateProjectData(
            state.projects,
            state.currentProjectId,
            (data) => ({
              ...data,
              beObservations: [...data.beObservations, obs],
            })
          );
          void persistProjects(newProjects);
          return {
            projects: newProjects,
            ...syncProjectToState(newProjects, state.currentProjectId),
          };
        }),

      setSelectedTarget: (name) =>
        set((state) => {
          if (!state.currentProjectId) return state;
          const newProjects = updateProjectData(
            state.projects,
            state.currentProjectId,
            (data) => ({
              ...data,
              selectedTargetName: name,
            })
          );
          void persistProjects(newProjects);
          return {
            projects: newProjects,
            ...syncProjectToState(newProjects, state.currentProjectId),
          };
        }),

      setClassificationResult: (result) =>
        set((state) => {
          if (!state.currentProjectId) return state;
          const newProjects = updateProjectData(
            state.projects,
            state.currentProjectId,
            (data) => ({
              ...data,
              classificationResult: result,
            })
          );
          void persistProjects(newProjects);
          return {
            projects: newProjects,
            ...syncProjectToState(newProjects, state.currentProjectId),
          };
        }),

      toggleLineCategory: (category) =>
        set((state) => ({
          visibleLineCategories: {
            ...state.visibleLineCategories,
            [category]: !state.visibleLineCategories[category],
          },
        })),

      setNormalizationRange: (range) => set({ normalizationRange: range }),

      loadSampleData: () =>
        set((state) => {
          if (!state.currentProjectId) return state;
          const newProjects = updateProjectData(
            state.projects,
            state.currentProjectId,
            () => createSampleProjectData()
          );
          void persistProjects(newProjects);
          return {
            projects: newProjects,
            ...syncProjectToState(newProjects, state.currentProjectId),
          };
        }),

      clearAll: () =>
        set((state) => {
          if (!state.currentProjectId) return state;
          const newProjects = updateProjectData(
            state.projects,
            state.currentProjectId,
            (data) => ({
              ...data,
              spectra: [],
              currentSpectrumId: null,
              beObservations: [],
              classificationResult: null,
            })
          );
          void persistProjects(newProjects);
          return {
            projects: newProjects,
            ...syncProjectToState(newProjects, state.currentProjectId),
          };
        }),

      startSync: async (direction: SyncDirection = 'both') => {
        const { projects } = get();
        try {
          const syncedProjects = await syncManager.sync(direction, projects);
          set((state) => {
            const newProjects = syncedProjects.length > 0 ? syncedProjects : state.projects;
            const newCurrentId = newProjects.find((p) => p.id === state.currentProjectId)?.id || newProjects[0]?.id || null;
            void persistProjects(newProjects);
            return {
              projects: newProjects,
              currentProjectId: newCurrentId,
              syncState: syncManager.getState(),
              ...syncProjectToState(newProjects, newCurrentId),
            };
          });
        } catch (error) {
          console.error('同步失败:', error);
          set({ syncState: syncManager.getState() });
        }
      },

      waitForPersistence: async () => {
        const latest = persistQueue.getLatest();
        if (latest) {
          await persistProjects(latest);
        }
      },

      initializeData: async () => {
        set({ isInitializing: true, initError: null });
        try {
          syncManager.onStateChange((newSyncState) => {
            set({ syncState: newSyncState });
          });

          let localProjects = await syncManager.loadFromLocal();
          let migrated = false;

          if (localProjects.length === 0) {
            const migratedProjects = await migrateFromLocalStorage();
            if (migratedProjects && migratedProjects.length > 0) {
              localProjects = migratedProjects;
              migrated = true;
            }
          }

          if (localProjects.length > 0) {
            const newCurrentId = localProjects[0]?.id || null;
            set((state) => ({
              projects: localProjects,
              currentProjectId: newCurrentId,
              ...syncProjectToState(localProjects, newCurrentId),
              syncState: syncManager.getState(),
              isMigrated: migrated,
            }));
          } else {
            const defaults = createDefaultProjects();
            const defaultCurrentId = defaults[0]?.id || null;
            void persistProjects(defaults);
            set((state) => ({
              projects: defaults,
              currentProjectId: defaultCurrentId,
              ...syncProjectToState(defaults, defaultCurrentId),
            }));
          }

          if (syncManager.getState().isOnline) {
            try {
              const currentProjects = get().projects;
              const syncedProjects = await syncManager.sync('both', currentProjects);
              set((state) => {
                const projects = syncedProjects.length > 0 ? syncedProjects : state.projects;
                const currentId = projects.find((p) => p.id === state.currentProjectId)?.id || projects[0]?.id || null;
                void persistProjects(projects);
                return {
                  projects,
                  currentProjectId: currentId,
                  ...syncProjectToState(projects, currentId),
                  syncState: syncManager.getState(),
                };
              });
            } catch (e) {
              console.warn('初始同步失败，将使用本地数据:', e);
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '初始化失败';
          set({ initError: errorMessage });
          console.error('初始化数据失败:', error);
        } finally {
          set({ isInitializing: false, syncState: syncManager.getState() });
        }
      },
    }),
    {
      name: PERSIST_QUEUE_KEY,
      partialize: (state) => ({
        visibleLineCategories: state.visibleLineCategories,
        normalizationRange: state.normalizationRange,
      }),
    }
  )
);

export { SPECTRAL_LINES, MK_TEMPLATES, persistQueue, migrateFromLocalStorage, PERSIST_QUEUE_KEY };
