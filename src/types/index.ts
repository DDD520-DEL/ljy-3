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

export interface ProjectData {
  spectra: SpectrumData[];
  beObservations: BeStarObservation[];
  currentSpectrumId: string | null;
  selectedTargetName: string;
  classificationResult: ClassificationResult | null;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  data: ProjectData;
}

export interface WorkspaceState {
  projects: Project[];
  currentProjectId: string | null;
  visibleLineCategories: { hydrogen: boolean; helium: boolean; metal: boolean };
  normalizationRange: { min: number; max: number } | null;
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

export type SyncDirection = 'upload' | 'download' | 'both';

export interface SyncProgress {
  phase: 'connecting' | 'uploading' | 'downloading' | 'merging' | 'completed';
  percent: number;
  message: string;
  currentItem?: string;
  totalItems?: number;
  processedItems?: number;
}

export interface SyncState {
  status: SyncStatus;
  direction: SyncDirection;
  progress: SyncProgress | null;
  error: string | null;
  lastSyncAt: string | null;
  pendingChanges: number;
  isOnline: boolean;
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface ResidualPoint {
  wavelength: number;
  diff: number;
  absDiff: number;
}

export interface DifferenceRegion {
  start: number;
  end: number;
  maxDiff: number;
  meanDiff: number;
  spectrumIds: [string, string];
}

export interface EWComparisonRow {
  lineLabel: string;
  wavelength: number;
  values: Record<string, number>;
  maxDiff: number;
  meanValue: number;
}

export interface ComparisonModeState {
  enabled: boolean;
  selectedSpectrumIds: string[];
  differenceThreshold: number;
  showResiduals: boolean;
  showDifferenceRegions: boolean;
}

export interface PendingSyncItem {
  id: string;
  entityType: 'project' | 'spectrum' | 'observation';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  data: unknown;
  createdAt: string;
  retryCount: number;
}
