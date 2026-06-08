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
  alertConfig: AlertRuleConfig;
  alerts: BeStarAlert[];
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

export type AlertLineKey = 'haEW' | 'hbEW';

export interface AlertRuleConfig {
  enabled: boolean;
  sigmaThreshold: number;
  consecutiveObservations: number;
  monitoredLines: AlertLineKey[];
  enableEmailNotification: boolean;
  enableInAppNotification: boolean;
  emailRecipients: string[];
  customAbsoluteThreshold?: number;
  useCustomAbsoluteThreshold: boolean;
}

export interface AlertStatistics {
  mean: number;
  std: number;
  count: number;
  upperBound: number;
  lowerBound: number;
}

export interface AlertTriggerInfo {
  lineKey: AlertLineKey;
  lineLabel: string;
  previousValue: number;
  currentValue: number;
  change: number;
  changePercent: number;
  threshold: number;
  stats: AlertStatistics;
  isOutlier: boolean;
}

export interface BeStarAlert {
  id: string;
  targetName: string;
  observationId: string;
  observationDate: string;
  triggers: AlertTriggerInfo[];
  severity: 'warning' | 'critical';
  createdAt: string;
  acknowledged: boolean;
  message: string;
}

export interface AlertEvaluationResult {
  targetName: string;
  hasAlert: boolean;
  alerts: BeStarAlert[];
  perLineStats: Record<AlertLineKey, AlertStatistics | null>;
}

export type ProcessingStepType =
  | 'sky_subtraction'
  | 'cosmic_ray_removal'
  | 'wavelength_calibration'
  | 'normalization';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface StepConfig {
  enabled: boolean;
  params: Record<string, number | string | boolean>;
}

export interface StepPreview {
  before: SpectrumPoint[];
  after: SpectrumPoint[];
}

export interface PipelineStepState {
  stepType: ProcessingStepType;
  status: TaskStatus;
  progress: number;
  message: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  preview?: StepPreview;
}

export interface PipelineConfig {
  sky_subtraction: StepConfig & { params: { skyWindowSize: number; polynomialOrder: number } };
  cosmic_ray_removal: StepConfig & { params: { sigmaThreshold: number; maxIterations: number; windowSize: number } };
  wavelength_calibration: StepConfig & { params: { referenceLines: number[]; shiftTolerance: number } };
  normalization: StepConfig & { params: { sigma: number; maxIterations: number } };
}

export interface ProcessingPipeline {
  id: string;
  spectrumId: string;
  spectrumName: string;
  config: PipelineConfig;
  steps: PipelineStepState[];
  overallStatus: TaskStatus;
  overallProgress: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  originalPoints: SpectrumPoint[];
  finalPoints?: SpectrumPoint[];
}

export interface ProcessingTask {
  id: string;
  pipelineId: string;
  spectrumId: string;
  spectrumName: string;
  status: TaskStatus;
  progress: number;
  currentStep: ProcessingStepType | null;
  message: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  result?: SpectrumData;
}

export interface TaskQueueState {
  tasks: ProcessingTask[];
  isPaused: boolean;
  activeTaskId: string | null;
}

export interface PipelineStepDefinition {
  type: ProcessingStepType;
  name: string;
  description: string;
  defaultConfig: StepConfig;
  process: (points: SpectrumPoint[], params: Record<string, number | string | boolean>, onProgress: (p: number) => void) => Promise<SpectrumPoint[]>;
}

export interface StepResult {
  points: SpectrumPoint[];
  previewBefore: SpectrumPoint[];
  previewAfter: SpectrumPoint[];
}
