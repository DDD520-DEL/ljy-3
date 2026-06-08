import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  SpectrumData,
  BeStarObservation,
  ClassificationResult,
  Project,
  ProjectData,
} from '@/types';
import { generateSampleSpectrum, SPECTRAL_LINES, MK_TEMPLATES } from '@/data/astronomy';

const genId = () => Math.random().toString(36).substring(2, 9);

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

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      projects: defaultProjects,
      currentProjectId: initialProjectId,
      visibleLineCategories: { hydrogen: true, helium: true, metal: false },
      normalizationRange: null,
      ...syncProjectToState(defaultProjects, initialProjectId),

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
          return {
            projects: filtered,
            currentProjectId: newCurrentId,
            ...syncProjectToState(filtered, newCurrentId),
          };
        });
      },

      renameProject: (projectId, name, description) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, name, description, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
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
          return {
            projects: newProjects,
            ...syncProjectToState(newProjects, state.currentProjectId),
          };
        }),
    }),
    {
      name: 'stellar-spectra-workspace',
      partialize: (state) => ({
        projects: state.projects,
        currentProjectId: state.currentProjectId,
        visibleLineCategories: state.visibleLineCategories,
        normalizationRange: state.normalizationRange,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const synced = syncProjectToState(state.projects, state.currentProjectId);
          Object.assign(state, synced);
        }
      },
    }
  )
);

export { SPECTRAL_LINES, MK_TEMPLATES };
