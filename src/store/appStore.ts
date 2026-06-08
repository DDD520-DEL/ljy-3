import { create } from 'zustand';
import type { SpectrumData, BeStarObservation, ClassificationResult } from '@/types';
import { generateSampleSpectrum, SPECTRAL_LINES, MK_TEMPLATES } from '@/data/astronomy';

interface AppState {
  spectra: SpectrumData[];
  currentSpectrumId: string | null;
  beObservations: BeStarObservation[];
  selectedTargetName: string;
  classificationResult: ClassificationResult | null;
  visibleLineCategories: { hydrogen: boolean; helium: boolean; metal: boolean };
  normalizationRange: { min: number; max: number } | null;

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

const genId = () => Math.random().toString(36).substring(2, 9);

export const useAppStore = create<AppState>((set) => ({
  spectra: [],
  currentSpectrumId: null,
  beObservations: [],
  selectedTargetName: '',
  classificationResult: null,
  visibleLineCategories: { hydrogen: true, helium: true, metal: false },
  normalizationRange: null,

  addSpectrum: (spectrum) =>
    set((state) => ({
      spectra: [...state.spectra, spectrum],
      currentSpectrumId: state.currentSpectrumId || spectrum.id,
    })),

  setCurrentSpectrum: (id) => set({ currentSpectrumId: id }),

  deleteSpectrum: (id) =>
    set((state) => {
      const filtered = state.spectra.filter((s) => s.id !== id);
      return {
        spectra: filtered,
        currentSpectrumId: state.currentSpectrumId === id ? filtered[0]?.id || null : state.currentSpectrumId,
      };
    }),

  addBeObservation: (obs) => set((state) => ({ beObservations: [...state.beObservations, obs] })),

  setSelectedTarget: (name) => set({ selectedTargetName: name }),

  setClassificationResult: (result) => set({ classificationResult: result }),

  toggleLineCategory: (category) =>
    set((state) => ({
      visibleLineCategories: { ...state.visibleLineCategories, [category]: !state.visibleLineCategories[category] },
    })),

  setNormalizationRange: (range) => set({ normalizationRange: range }),

  loadSampleData: () => {
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

    set({
      spectra: spectraList,
      currentSpectrumId: spectraList[2].id,
      beObservations: obsList,
      selectedTargetName: 'Gamma Cas',
    });
  },

  clearAll: () =>
    set({
      spectra: [],
      currentSpectrumId: null,
      beObservations: [],
      classificationResult: null,
    }),
}));

export { SPECTRAL_LINES, MK_TEMPLATES };
