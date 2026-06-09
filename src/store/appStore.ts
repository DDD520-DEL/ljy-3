import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  SpectrumData,
  BeStarObservation,
  ObservationLogEntry,
  ClassificationResult,
  Project,
  ProjectData,
  SyncState,
  SyncDirection,
  WorkspaceState,
  ComparisonModeState,
  VersionCompareState,
  AlertRuleConfig,
  BeStarAlert,
  AlertEvaluationResult,
  ManualTuningState,
  ManualClassificationResult,
  VisibilityType,
  SharedClassificationResult,
  VersionOperationType,
  SpectrumPoint,
} from '@/types';
import { generateSampleSpectrum, SPECTRAL_LINES, MK_TEMPLATES } from '@/data/astronomy';
import { syncManager } from '@/lib/syncManager';
import { localDB } from '@/lib/localStorage';
import {
  DEFAULT_ALERT_CONFIG,
  evaluateAllTargets,
  sendInAppNotification,
} from '@/lib/alertEngine';
import {
  initializeSpectrumWithVersion,
  switchToVersion,
  rollbackToVersion,
  applyProcessingWithVersion,
} from '@/lib/versionManager';

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
  observationLogs: [],
  currentSpectrumId: null,
  selectedTargetName: '',
  classificationResult: null,
  manualClassificationResult: null,
  alertConfig: { ...DEFAULT_ALERT_CONFIG },
  alerts: [],
});

const getDefaultUser = () => {
  try {
    const { useTeamStore } = require('@/store/teamStore');
    const state = useTeamStore.getState();
    return state.currentUser;
  } catch {
    return {
      id: 'default-user',
      name: '当前用户',
      email: 'user@example.com',
      avatarColor: '#06b6d4',
      createdAt: new Date().toISOString(),
    };
  }
};

const createSampleProjectData = (): ProjectData => {
  const user = getDefaultUser();
  const sampleTypes = ['O9V', 'A0V', 'A5V', 'B0V', 'G2V', 'K0V', 'M0V'];
  const spectraList: SpectrumData[] = sampleTypes.map((type, idx) => {
    const wlPoints = generateSampleSpectrum(type, 0.015);
    const baseSpectrum = {
      id: genId(),
      name: `样本光谱 ${idx + 1} - ${type}`,
      targetName: idx < 3 ? 'HD 209458' : idx < 5 ? 'Gamma Cas' : 'Vega',
      observationDate: new Date(Date.now() - idx * 86400000 * 7).toISOString().split('T')[0],
      wavelengthMin: Math.min(...wlPoints.map((p) => p.wavelength)),
      wavelengthMax: Math.max(...wlPoints.map((p) => p.wavelength)),
      points: wlPoints,
      isNormalized: true,
      visibility: (idx < 2 ? 'private' : idx < 5 ? 'team' : 'public') as VisibilityType,
      ownerId: user.id,
      ownerName: user.name,
      teamIds: idx < 2 ? [] : undefined,
      sharedClassifications: [],
    };
    return initializeSpectrumWithVersion(baseSpectrum, user.id);
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
    observationLogs: obsList.map((obs, i) => ({
      id: genId(),
      targetName: obs.targetName,
      observationDate: obs.observationDate,
      observationTime: `${20 + (i % 3)}:${String(15 * i).padStart(2, '0')}`,
      weatherCondition: i % 3 === 0 ? 'clear' : i % 3 === 1 ? 'partly_cloudy' : 'hazy',
      equipmentStatus: i % 4 === 0 ? 'excellent' : 'good',
      seeingQuality: i % 2 === 0 ? 'good' : 'fair',
      temperature: 12 + Math.random() * 8,
      humidity: 40 + Math.random() * 30,
      exposureParams: {
        exposureTime: 300,
        numberOfExposures: 5,
        binning: '2x2',
        filter: 'Clear',
        gain: 100,
        temperature: -10,
      },
      notes: i % 2 === 0 ? '观测条件良好，光谱质量较高' : '有薄云，信噪比略低',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    selectedTargetName: 'Gamma Cas',
    classificationResult: null,
    manualClassificationResult: null,
    alertConfig: { ...DEFAULT_ALERT_CONFIG },
    alerts: [],
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

    const user = getDefaultUser();
    const migrated: Project[] = parsed.projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      data: {
        spectra: Array.isArray(p.data?.spectra)
          ? p.data.spectra.map((s: any) => {
              const baseSpectrum = {
                visibility: (s.visibility ?? 'private') as any,
                ownerId: s.ownerId ?? user.id,
                ownerName: s.ownerName ?? user.name,
                sharedClassifications: s.sharedClassifications ?? [],
                ...s,
              };
              return initializeSpectrumWithVersion(baseSpectrum, baseSpectrum.ownerId);
            })
          : [],
        beObservations: Array.isArray(p.data?.beObservations) ? p.data.beObservations : [],
        observationLogs: Array.isArray((p.data as any)?.observationLogs) ? (p.data as any).observationLogs : [],
        currentSpectrumId: p.data?.currentSpectrumId ?? null,
        selectedTargetName: p.data?.selectedTargetName ?? '',
        classificationResult: p.data?.classificationResult ?? null,
        manualClassificationResult: (p.data as any)?.manualClassificationResult ?? null,
        alertConfig: (p.data as any)?.alertConfig ?? { ...DEFAULT_ALERT_CONFIG },
        alerts: Array.isArray((p.data as any)?.alerts) ? (p.data as any).alerts : [],
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
  observationLogs: ObservationLogEntry[];
  selectedTargetName: string;
  classificationResult: ClassificationResult | null;
  manualClassificationResult: ManualClassificationResult | null;
  alertConfig: AlertRuleConfig;
  alerts: BeStarAlert[];
  alertEvaluations: AlertEvaluationResult[];

  comparisonMode: ComparisonModeState;
  manualTuning: ManualTuningState;
  versionCompare: VersionCompareState;

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
  setSpectrumVisibility: (spectrumId: string, visibility: VisibilityType, teamIds?: string[]) => void;
  addSharedClassification: (spectrumId: string, classification: SharedClassificationResult) => void;
  addBeObservation: (obs: BeStarObservation) => void;
  setSelectedTarget: (name: string) => void;
  setClassificationResult: (result: ClassificationResult | null) => void;
  setManualClassificationResult: (result: ManualClassificationResult | null) => void;
  clearManualClassificationResult: () => void;
  toggleLineCategory: (category: 'hydrogen' | 'helium' | 'metal') => void;
  setNormalizationRange: (range: { min: number; max: number } | null) => void;
  loadSampleData: () => void;
  clearAll: () => void;

  addObservationLog: (log: Omit<ObservationLogEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateObservationLog: (id: string, updates: Partial<ObservationLogEntry>) => void;
  deleteObservationLog: (id: string) => void;

  toggleComparisonMode: () => void;
  toggleComparisonSpectrum: (id: string) => void;
  setComparisonSpectra: (ids: string[]) => void;
  clearComparisonSelection: () => void;
  setDifferenceThreshold: (threshold: number) => void;
  toggleShowResiduals: () => void;
  toggleShowDifferenceRegions: () => void;

  toggleManualTuning: () => void;
  setSelectedTemplateLabel: (label: string | null) => void;
  setSubtypeOffset: (offset: number) => void;
  setLuminosityOffset: (offset: number) => void;
  setShowTemplateOverlay: (show: boolean) => void;
  setShowDeviationHighlight: (show: boolean) => void;
  setTuningDeviationThreshold: (threshold: number) => void;
  setTemplateIntensityScale: (scale: number) => void;
  resetManualTuning: () => void;

  switchSpectrumVersion: (spectrumId: string, versionId: string) => void;
  rollbackSpectrumToVersion: (spectrumId: string, versionId: string) => void;
  processSpectrumWithVersion: (
    spectrumId: string,
    processedPoints: SpectrumPoint[],
    operation: VersionOperationType,
    params?: Record<string, number | string | boolean>,
    description?: string
  ) => void;
  toggleVersionCompare: () => void;
  setVersionCompareA: (versionId: string | null) => void;
  setVersionCompareB: (versionId: string | null) => void;
  setVersionCompareSpectrum: (spectrumId: string | null) => void;

  updateAlertConfig: (config: Partial<AlertRuleConfig>) => void;
  runAlertEvaluation: () => void;
  acknowledgeAlert: (alertId: string) => void;
  acknowledgeAllAlerts: () => void;
  clearAlerts: () => void;

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
      observationLogs: [] as ObservationLogEntry[],
      selectedTargetName: '',
      classificationResult: null as ClassificationResult | null,
      manualClassificationResult: null as ManualClassificationResult | null,
      alertConfig: { ...DEFAULT_ALERT_CONFIG },
      alerts: [] as BeStarAlert[],
      alertEvaluations: [] as AlertEvaluationResult[],
    };
  }
  return {
    spectra: project.data.spectra,
    currentSpectrumId: project.data.currentSpectrumId,
    beObservations: project.data.beObservations,
    observationLogs: project.data.observationLogs ?? [],
    selectedTargetName: project.data.selectedTargetName,
    classificationResult: project.data.classificationResult,
    manualClassificationResult: project.data.manualClassificationResult ?? null,
    alertConfig: project.data.alertConfig ?? { ...DEFAULT_ALERT_CONFIG },
    alerts: project.data.alerts ?? [],
    alertEvaluations: [] as AlertEvaluationResult[],
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

      comparisonMode: {
        enabled: false,
        selectedSpectrumIds: [],
        differenceThreshold: 0.05,
        showResiduals: true,
        showDifferenceRegions: true,
      },

      manualTuning: {
        enabled: false,
        selectedTemplateLabel: null,
        subtypeOffset: 0,
        luminosityOffset: 0,
        showTemplateOverlay: true,
        showDeviationHighlight: true,
        deviationThreshold: 0.05,
        templateIntensityScale: 1.0,
        lockedResult: null,
      },

      versionCompare: {
        enabled: false,
        spectrumId: null,
        versionAId: null,
        versionBId: null,
      },

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
          const user = getDefaultUser();
          const baseSpectrum = {
            visibility: 'private' as VisibilityType,
            ownerId: user.id,
            ownerName: user.name,
            sharedClassifications: [],
            ...spectrum,
          };
          const enrichedSpectrum: SpectrumData = initializeSpectrumWithVersion(
            baseSpectrum,
            user.id
          );
          const newProjects = updateProjectData(
            state.projects,
            state.currentProjectId,
            (data) => ({
              ...data,
              spectra: [...data.spectra, enrichedSpectrum],
              currentSpectrumId: data.currentSpectrumId || enrichedSpectrum.id,
            })
          );
          void persistProjects(newProjects);
          return {
            projects: newProjects,
            ...syncProjectToState(newProjects, state.currentProjectId),
          };
        }),

      setSpectrumVisibility: (spectrumId: string, visibility: VisibilityType, teamIds?: string[]) =>
        set((state) => {
          if (!state.currentProjectId) return state;
          const newProjects = updateProjectData(
            state.projects,
            state.currentProjectId,
            (data) => ({
              ...data,
              spectra: data.spectra.map((s) =>
                s.id === spectrumId
                  ? { ...s, visibility, teamIds: teamIds ?? s.teamIds }
                  : s
              ),
            })
          );
          void persistProjects(newProjects);
          return {
            projects: newProjects,
            ...syncProjectToState(newProjects, state.currentProjectId),
          };
        }),

      addSharedClassification: (spectrumId: string, classification: SharedClassificationResult) =>
        set((state) => {
          if (!state.currentProjectId) return state;
          const newProjects = updateProjectData(
            state.projects,
            state.currentProjectId,
            (data) => ({
              ...data,
              spectra: data.spectra.map((s) => {
                if (s.id !== spectrumId) return s;
                const others = (s.sharedClassifications || []).filter(
                  (c) => c.author.userId !== classification.author.userId
                );
                return {
                  ...s,
                  sharedClassifications: [...others, classification],
                };
              }),
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
          const newObservations = [...state.beObservations, obs];
          const evaluations = evaluateAllTargets(newObservations, state.alertConfig, state.alerts);
          const newAlerts = evaluations.flatMap((e) => e.alerts);
          const dedupedAlerts = Array.from(
            new Map([...state.alerts, ...newAlerts].map((a) => [a.id, a])).values()
          );

          if (state.alertConfig.enableInAppNotification) {
            const brandNewAlerts = newAlerts.filter(
              (a) => !state.alerts.some((existing) => existing.id === a.id)
            );
            brandNewAlerts.forEach((a) => sendInAppNotification(a));
          }

          const newProjects = updateProjectData(
            state.projects,
            state.currentProjectId,
            (data) => ({
              ...data,
              beObservations: newObservations,
              alerts: dedupedAlerts,
            })
          );
          void persistProjects(newProjects);
          const synced = syncProjectToState(newProjects, state.currentProjectId);
          return {
            projects: newProjects,
            ...synced,
            alerts: dedupedAlerts,
            alertEvaluations: evaluations,
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

      setManualClassificationResult: (result) =>
        set((state) => {
          if (!state.currentProjectId) return state;
          const newProjects = updateProjectData(
            state.projects,
            state.currentProjectId,
            (data) => ({
              ...data,
              manualClassificationResult: result,
            })
          );
          void persistProjects(newProjects);
          return {
            projects: newProjects,
            manualClassificationResult: result,
            manualTuning: {
              ...state.manualTuning,
              lockedResult: result,
            },
          };
        }),

      clearManualClassificationResult: () =>
        set((state) => {
          if (!state.currentProjectId) return state;
          const newProjects = updateProjectData(
            state.projects,
            state.currentProjectId,
            (data) => ({
              ...data,
              manualClassificationResult: null,
            })
          );
          void persistProjects(newProjects);
          return {
            projects: newProjects,
            manualClassificationResult: null,
            manualTuning: {
              ...state.manualTuning,
              lockedResult: null,
            },
          };
        }),

      toggleManualTuning: () =>
        set((state) => ({
          manualTuning: {
            ...state.manualTuning,
            enabled: !state.manualTuning.enabled,
          },
        })),

      setSelectedTemplateLabel: (label) =>
        set((state) => ({
          manualTuning: {
            ...state.manualTuning,
            selectedTemplateLabel: label,
            subtypeOffset: 0,
            luminosityOffset: 0,
          },
        })),

      setSubtypeOffset: (offset) =>
        set((state) => ({
          manualTuning: {
            ...state.manualTuning,
            subtypeOffset: Math.max(-2, Math.min(2, offset)),
          },
        })),

      setLuminosityOffset: (offset) =>
        set((state) => ({
          manualTuning: {
            ...state.manualTuning,
            luminosityOffset: Math.max(-2, Math.min(2, offset)),
          },
        })),

      setShowTemplateOverlay: (show) =>
        set((state) => ({
          manualTuning: {
            ...state.manualTuning,
            showTemplateOverlay: show,
          },
        })),

      setShowDeviationHighlight: (show) =>
        set((state) => ({
          manualTuning: {
            ...state.manualTuning,
            showDeviationHighlight: show,
          },
        })),

      setTuningDeviationThreshold: (threshold) =>
        set((state) => ({
          manualTuning: {
            ...state.manualTuning,
            deviationThreshold: Math.max(0.01, Math.min(0.2, threshold)),
          },
        })),

      setTemplateIntensityScale: (scale) =>
        set((state) => ({
          manualTuning: {
            ...state.manualTuning,
            templateIntensityScale: Math.max(0.5, Math.min(1.5, scale)),
          },
        })),

      resetManualTuning: () =>
        set((state) => ({
          manualTuning: {
            ...state.manualTuning,
            selectedTemplateLabel: null,
            subtypeOffset: 0,
            luminosityOffset: 0,
            templateIntensityScale: 1.0,
          },
        })),

      switchSpectrumVersion: (spectrumId, versionId) =>
        set((state) => {
          if (!state.currentProjectId) return state;
          const user = getDefaultUser();
          const newProjects = updateProjectData(
            state.projects,
            state.currentProjectId,
            (data) => ({
              ...data,
              spectra: data.spectra.map((s) => {
                if (s.id !== spectrumId) return s;
                const switched = switchToVersion(s, versionId);
                return switched ?? s;
              }),
            })
          );
          void persistProjects(newProjects);
          return {
            projects: newProjects,
            ...syncProjectToState(newProjects, state.currentProjectId),
          };
        }),

      rollbackSpectrumToVersion: (spectrumId, versionId) =>
        set((state) => {
          if (!state.currentProjectId) return state;
          const user = getDefaultUser();
          const newProjects = updateProjectData(
            state.projects,
            state.currentProjectId,
            (data) => ({
              ...data,
              spectra: data.spectra.map((s) => {
                if (s.id !== spectrumId) return s;
                const rolledBack = rollbackToVersion(s, versionId, user.id);
                return rolledBack ?? s;
              }),
            })
          );
          void persistProjects(newProjects);
          return {
            projects: newProjects,
            ...syncProjectToState(newProjects, state.currentProjectId),
          };
        }),

      processSpectrumWithVersion: (spectrumId, processedPoints, operation, params = {}, description) =>
        set((state) => {
          if (!state.currentProjectId) return state;
          const user = getDefaultUser();
          const newProjects = updateProjectData(
            state.projects,
            state.currentProjectId,
            (data) => ({
              ...data,
              spectra: data.spectra.map((s) => {
                if (s.id !== spectrumId) return s;
                return applyProcessingWithVersion(
                  s,
                  processedPoints,
                  operation,
                  user.id,
                  params,
                  description
                );
              }),
            })
          );
          void persistProjects(newProjects);
          return {
            projects: newProjects,
            ...syncProjectToState(newProjects, state.currentProjectId),
          };
        }),

      toggleVersionCompare: () =>
        set((state) => ({
          versionCompare: {
            ...state.versionCompare,
            enabled: !state.versionCompare.enabled,
          },
        })),

      setVersionCompareSpectrum: (spectrumId) =>
        set((state) => {
          const spectrum = state.spectra.find((s) => s.id === spectrumId);
          return {
            versionCompare: {
              enabled: state.versionCompare.enabled,
              spectrumId,
              versionAId: spectrum?.currentVersionId ?? null,
              versionBId: null,
            },
          };
        }),

      setVersionCompareA: (versionId) =>
        set((state) => ({
          versionCompare: {
            ...state.versionCompare,
            versionAId: versionId,
          },
        })),

      setVersionCompareB: (versionId) =>
        set((state) => ({
          versionCompare: {
            ...state.versionCompare,
            versionBId: versionId,
          },
        })),

      toggleLineCategory: (category) =>
        set((state) => ({
          visibleLineCategories: {
            ...state.visibleLineCategories,
            [category]: !state.visibleLineCategories[category],
          },
        })),

      setNormalizationRange: (range) => set({ normalizationRange: range }),

      toggleComparisonMode: () =>
        set((state) => ({
          comparisonMode: {
            ...state.comparisonMode,
            enabled: !state.comparisonMode.enabled,
            selectedSpectrumIds: !state.comparisonMode.enabled
              ? (state.currentSpectrumId ? [state.currentSpectrumId] : [])
              : [],
          },
        })),

      toggleComparisonSpectrum: (id) =>
        set((state) => {
          const current = state.comparisonMode.selectedSpectrumIds;
          const isSelected = current.includes(id);
          let newSelected: string[];
          if (isSelected) {
            newSelected = current.filter((s) => s !== id);
          } else {
            if (current.length >= 3) return state;
            newSelected = [...current, id];
          }
          return {
            comparisonMode: {
              ...state.comparisonMode,
              selectedSpectrumIds: newSelected,
            },
          };
        }),

      setComparisonSpectra: (ids) =>
        set((state) => ({
          comparisonMode: {
            ...state.comparisonMode,
            selectedSpectrumIds: ids.slice(0, 3),
          },
        })),

      clearComparisonSelection: () =>
        set((state) => ({
          comparisonMode: {
            ...state.comparisonMode,
            selectedSpectrumIds: [],
          },
        })),

      setDifferenceThreshold: (threshold) =>
        set((state) => ({
          comparisonMode: {
            ...state.comparisonMode,
            differenceThreshold: Math.max(0.001, Math.min(0.5, threshold)),
          },
        })),

      toggleShowResiduals: () =>
        set((state) => ({
          comparisonMode: {
            ...state.comparisonMode,
            showResiduals: !state.comparisonMode.showResiduals,
          },
        })),

      toggleShowDifferenceRegions: () =>
        set((state) => ({
          comparisonMode: {
            ...state.comparisonMode,
            showDifferenceRegions: !state.comparisonMode.showDifferenceRegions,
          },
        })),

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
              observationLogs: [],
              classificationResult: null,
              manualClassificationResult: null,
              alerts: [],
            })
          );
          void persistProjects(newProjects);
          return {
            projects: newProjects,
            alertEvaluations: [],
            manualTuning: {
              ...state.manualTuning,
              enabled: false,
              selectedTemplateLabel: null,
              subtypeOffset: 0,
              luminosityOffset: 0,
              lockedResult: null,
            },
            ...syncProjectToState(newProjects, state.currentProjectId),
          };
        }),

      addObservationLog: (logData) =>
        set((state) => {
          if (!state.currentProjectId) return state;
          const now = new Date().toISOString();
          const newLog: ObservationLogEntry = {
            ...logData,
            id: genId(),
            createdAt: now,
            updatedAt: now,
          };
          const newProjects = updateProjectData(
            state.projects,
            state.currentProjectId,
            (data) => ({
              ...data,
              observationLogs: [...data.observationLogs, newLog],
            })
          );
          void persistProjects(newProjects);
          return {
            projects: newProjects,
            ...syncProjectToState(newProjects, state.currentProjectId),
          };
        }),

      updateObservationLog: (id, updates) =>
        set((state) => {
          if (!state.currentProjectId) return state;
          const newProjects = updateProjectData(
            state.projects,
            state.currentProjectId,
            (data) => ({
              ...data,
              observationLogs: data.observationLogs.map((log) =>
                log.id === id ? { ...log, ...updates, updatedAt: new Date().toISOString() } : log
              ),
            })
          );
          void persistProjects(newProjects);
          return {
            projects: newProjects,
            ...syncProjectToState(newProjects, state.currentProjectId),
          };
        }),

      deleteObservationLog: (id) =>
        set((state) => {
          if (!state.currentProjectId) return state;
          const newProjects = updateProjectData(
            state.projects,
            state.currentProjectId,
            (data) => ({
              ...data,
              observationLogs: data.observationLogs.filter((log) => log.id !== id),
            })
          );
          void persistProjects(newProjects);
          return {
            projects: newProjects,
            ...syncProjectToState(newProjects, state.currentProjectId),
          };
        }),

      updateAlertConfig: (partialConfig) =>
        set((state) => {
          if (!state.currentProjectId) return state;
          const newConfig = { ...state.alertConfig, ...partialConfig };
          const newProjects = updateProjectData(
            state.projects,
            state.currentProjectId,
            (data) => ({
              ...data,
              alertConfig: newConfig,
            })
          );
          void persistProjects(newProjects);
          return {
            projects: newProjects,
            alertConfig: newConfig,
          };
        }),

      runAlertEvaluation: () =>
        set((state) => {
          if (!state.currentProjectId) return state;
          const evaluations = evaluateAllTargets(state.beObservations, state.alertConfig, state.alerts);
          const allAlerts = evaluations.flatMap((e) => e.alerts);
          const dedupedAlerts = Array.from(
            new Map([...state.alerts, ...allAlerts].map((a) => [a.id, a])).values()
          );

          if (state.alertConfig.enableInAppNotification) {
            const brandNewAlerts = allAlerts.filter(
              (a) => !state.alerts.some((existing) => existing.id === a.id)
            );
            brandNewAlerts.forEach((a) => sendInAppNotification(a));
          }

          const newProjects = updateProjectData(
            state.projects,
            state.currentProjectId,
            (data) => ({
              ...data,
              alerts: dedupedAlerts,
            })
          );
          void persistProjects(newProjects);
          return {
            projects: newProjects,
            alerts: dedupedAlerts,
            alertEvaluations: evaluations,
          };
        }),

      acknowledgeAlert: (alertId) =>
        set((state) => {
          if (!state.currentProjectId) return state;
          const updatedAlerts = state.alerts.map((a) =>
            a.id === alertId ? { ...a, acknowledged: true } : a
          );
          const newProjects = updateProjectData(
            state.projects,
            state.currentProjectId,
            (data) => ({
              ...data,
              alerts: updatedAlerts,
            })
          );
          void persistProjects(newProjects);
          return {
            projects: newProjects,
            alerts: updatedAlerts,
          };
        }),

      acknowledgeAllAlerts: () =>
        set((state) => {
          if (!state.currentProjectId) return state;
          const updatedAlerts = state.alerts.map((a) => ({ ...a, acknowledged: true }));
          const newProjects = updateProjectData(
            state.projects,
            state.currentProjectId,
            (data) => ({
              ...data,
              alerts: updatedAlerts,
            })
          );
          void persistProjects(newProjects);
          return {
            projects: newProjects,
            alerts: updatedAlerts,
          };
        }),

      clearAlerts: () =>
        set((state) => {
          if (!state.currentProjectId) return state;
          const newProjects = updateProjectData(
            state.projects,
            state.currentProjectId,
            (data) => ({
              ...data,
              alerts: [],
            })
          );
          void persistProjects(newProjects);
          return {
            projects: newProjects,
            alerts: [],
            alertEvaluations: [],
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
          setTimeout(() => {
            const state = get();
            if (state.alertConfig.enabled && state.beObservations.length > 0) {
              state.runAlertEvaluation();
            }
          }, 100);
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
