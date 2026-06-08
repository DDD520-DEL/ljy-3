export interface SpectrumPoint {
  wavelength: number;
  intensity: number;
}

export interface SpectrumData {
  id: string;
  name: string;
  targetName: string;
  observationDate: string;
  wavelengthMin: number;
  wavelengthMax: number;
  points: SpectrumPoint[];
  isNormalized: boolean;
}

export interface SpectralLine {
  element: string;
  ion: string;
  label: string;
  wavelength: number;
  color: string;
  category: 'hydrogen' | 'helium' | 'metal';
}

export interface MKTemplate {
  spectralType: string;
  luminosityClass: string;
  label: string;
  colorTemp: number;
  lineRatios: Record<string, number>;
}

export interface ClassificationResult {
  spectralType: string;
  luminosityClass: string;
  confidence: number;
  matchedFeatures: string[];
  deviationRegions: { start: number; end: number; description: string }[];
}

export interface BeStarObservation {
  id: string;
  targetName: string;
  observationDate: string;
  spectrumId: string;
  haEW: number;
  hbEW?: number;
  vMagnitude?: number;
  notes?: string;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
  label?: string;
}
