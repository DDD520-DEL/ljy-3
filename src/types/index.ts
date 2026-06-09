export interface SpectrumPoint {
  wavelength: number;
  intensity: number;
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

export interface ManualClassificationResult extends ClassificationResult {
  source: 'manual';
  reviewerNotes?: string;
  confirmedAt: string;
}

export type ClassificationSource = 'auto' | 'manual';

export interface ArchivedClassification {
  auto: ClassificationResult | null;
  manual: ManualClassificationResult | null;
}

export interface ManualTuningState {
  enabled: boolean;
  selectedTemplateLabel: string | null;
  subtypeOffset: number;
  luminosityOffset: number;
  showTemplateOverlay: boolean;
  showDeviationHighlight: boolean;
  deviationThreshold: number;
  templateIntensityScale: number;
  lockedResult: ManualClassificationResult | null;
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

export interface VersionCompareState {
  enabled: boolean;
  spectrumId: string | null;
  versionAId: string | null;
  versionBId: string | null;
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

export type WeatherCondition = 'clear' | 'partly_cloudy' | 'cloudy' | 'rainy' | 'snowy' | 'windy' | 'hazy';
export type EquipmentStatus = 'excellent' | 'good' | 'fair' | 'poor' | 'malfunction';
export type SeeingQuality = 'excellent' | 'good' | 'fair' | 'poor';

export interface ExposureParams {
  exposureTime?: number;
  numberOfExposures?: number;
  binning?: string;
  filter?: string;
  gain?: number;
  temperature?: number;
}

export interface ObservationLogEntry {
  id: string;
  targetName: string;
  observationDate: string;
  observationTime?: string;
  weatherCondition?: WeatherCondition;
  equipmentStatus?: EquipmentStatus;
  seeingQuality?: SeeingQuality;
  temperature?: number;
  humidity?: number;
  exposureParams?: ExposureParams;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type VisibilityType = 'private' | 'team' | 'public';

export type TeamRole = 'owner' | 'admin' | 'member';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  createdAt: string;
}

export interface TeamMember {
  userId: string;
  userName: string;
  userEmail: string;
  avatarColor: string;
  role: TeamRole;
  joinedAt: string;
  invitedBy?: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  members: TeamMember[];
  createdAt: string;
  updatedAt: string;
}

export interface ClassificationAuthor {
  userId: string;
  userName: string;
  avatarColor: string;
}

export interface SharedClassificationResult extends ManualClassificationResult {
  author: ClassificationAuthor;
  classifiedAt: string;
  spectrumId: string;
}

export interface SpectrumObservationMeta {
  observationTime?: string;
  exposureTime?: number;
  telescope?: string;
  instrument?: string;
  observatory?: string;
  observer?: string;
  grating?: string;
  dispersion?: number;
  wavelengthPixelSize?: number;
  centralWavelength?: number;
  binning?: string;
  filter?: string;
  gain?: number;
  temperature?: number;
  airmass?: number;
  ra?: string;
  dec?: string;
  jd?: number;
  mjd?: number;
  equinox?: number;
  radialVelocity?: number;
  resolution?: number;
  notes?: string;
  rawHeaders?: Record<string, string | number | boolean | null>;
}

export type VersionOperationType =
  | 'normalization'
  | 'wavelength_crop'
  | 'wavelength_calibration'
  | 'sky_subtraction'
  | 'cosmic_ray_removal'
  | 'manual_edit'
  | 'import';

export interface SpectrumVersion {
  id: string;
  version: number;
  createdAt: string;
  createdBy: string;
  operation: VersionOperationType;
  description: string;
  params: Record<string, number | string | boolean>;
  parentVersionId: string | null;
  points: SpectrumPoint[];
  wavelengthMin: number;
  wavelengthMax: number;
  isNormalized: boolean;
}

export interface SpectrumData extends SpectrumObservationMeta {
  id: string;
  name: string;
  targetName: string;
  observationDate: string;
  wavelengthMin: number;
  wavelengthMax: number;
  points: SpectrumPoint[];
  isNormalized: boolean;
  visibility: VisibilityType;
  ownerId: string;
  ownerName: string;
  teamIds?: string[];
  sharedClassifications: SharedClassificationResult[];
  currentVersionId: string;
  versions: SpectrumVersion[];
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  teamName: string;
  invitedBy: string;
  invitedByName: string;
  inviteeEmail: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
  expiresAt: string;
}

export interface TeamState {
  teams: Team[];
  currentTeamId: string | null;
  currentUser: User;
  invitations: TeamInvitation[];
}

export interface ProjectData {
  spectra: SpectrumData[];
  beObservations: BeStarObservation[];
  observationLogs: ObservationLogEntry[];
  currentSpectrumId: string | null;
  selectedTargetName: string;
  classificationResult: ClassificationResult | null;
  manualClassificationResult: ManualClassificationResult | null;
  alertConfig: AlertRuleConfig;
  alerts: BeStarAlert[];
}

export type CelestialObjectType = 'star' | 'planet' | 'deep_sky' | 'moon' | 'sun';

export interface CelestialObject {
  id: string;
  name: string;
  commonNames?: string[];
  type: CelestialObjectType;
  ra: number;
  dec: number;
  magnitude?: number;
  distance?: number;
  distanceUnit?: 'ly' | 'pc' | 'au';
  spectralType?: string;
  constellation?: string;
  description?: string;
  hasDynamicCoords?: boolean;
}

export interface EquatorialCoordinates {
  ra: number;
  dec: number;
  raHours?: string;
  decDegrees?: string;
}

export interface HorizontalCoordinates {
  altitude: number;
  azimuth: number;
}

export interface ApparentPosition {
  ra: number;
  dec: number;
  altitude: number;
  azimuth: number;
  hourAngle: number;
  airmass: number;
}

export interface SunTimes {
  sunrise: Date;
  sunset: Date;
  civilTwilightStart: Date;
  civilTwilightEnd: Date;
  nauticalTwilightStart: Date;
  nauticalTwilightEnd: Date;
  astronomicalTwilightStart: Date;
  astronomicalTwilightEnd: Date;
  solarNoon: Date;
}

export interface ObservationWindow {
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  description: string;
  altitudeRange: { min: number; max: number };
  airmassRange: { min: number; max: number };
}

export interface EphemerisResult {
  object: CelestialObject;
  j2000: EquatorialCoordinates;
  apparent: ApparentPosition;
  sunTimes: SunTimes;
  observationWindows: ObservationWindow[];
  riseTime: Date | null;
  setTime: Date | null;
  transitTime: Date | null;
  transitAltitude: number;
  isCircumpolar: boolean;
  isNeverRises: boolean;
  observerLocation: ObserverLocation;
  calculationTime: Date;
}

export interface ObserverLocation {
  latitude: number;
  longitude: number;
  elevation?: number;
  name?: string;
  timezone?: string;
}

export interface TimelineEvent {
  id: string;
  time: Date;
  label: string;
  type: 'sunrise' | 'sunset' | 'twilight' | 'rise' | 'transit' | 'set' | 'observation_start' | 'observation_end';
  description?: string;
}
