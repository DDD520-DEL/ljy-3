import type {
  SpectrumData,
  SpectrumVersion,
  VersionOperationType,
  SpectrumPoint,
} from '@/types';

const genId = () => Math.random().toString(36).substring(2, 9);

const OPERATION_LABELS: Record<VersionOperationType, string> = {
  normalization: '归一化',
  wavelength_crop: '波长裁剪',
  wavelength_calibration: '波长定标',
  sky_subtraction: '天光扣除',
  cosmic_ray_removal: '宇宙线剔除',
  manual_edit: '手动编辑',
  import: '数据导入',
};

export const getOperationLabel = (op: VersionOperationType): string => {
  return OPERATION_LABELS[op] || op;
};

export const createInitialVersion = (
  points: SpectrumPoint[],
  createdBy: string,
  isNormalized: boolean = false
): SpectrumVersion => {
  const wavelengthMin = Math.min(...points.map((p) => p.wavelength));
  const wavelengthMax = Math.max(...points.map((p) => p.wavelength));
  return {
    id: genId(),
    version: 1,
    createdAt: new Date().toISOString(),
    createdBy,
    operation: 'import',
    description: '初始数据导入',
    params: {},
    parentVersionId: null,
    points: points.map((p) => ({ ...p })),
    wavelengthMin,
    wavelengthMax,
    isNormalized,
  };
};

export const createNewVersion = (
  spectrum: SpectrumData,
  newPoints: SpectrumPoint[],
  operation: VersionOperationType,
  createdBy: string,
  params: Record<string, number | string | boolean> = {},
  description?: string
): SpectrumVersion => {
  const currentVersion = spectrum.versions.find(
    (v) => v.id === spectrum.currentVersionId
  );
  const nextVersionNumber = currentVersion ? currentVersion.version + 1 : 1;
  const wavelengthMin = Math.min(...newPoints.map((p) => p.wavelength));
  const wavelengthMax = Math.max(...newPoints.map((p) => p.wavelength));

  let isNormalized = currentVersion?.isNormalized ?? false;
  if (operation === 'normalization') {
    isNormalized = true;
  }

  return {
    id: genId(),
    version: nextVersionNumber,
    createdAt: new Date().toISOString(),
    createdBy,
    operation,
    description: description || getOperationLabel(operation),
    params,
    parentVersionId: spectrum.currentVersionId,
    points: newPoints.map((p) => ({ ...p })),
    wavelengthMin,
    wavelengthMax,
    isNormalized,
  };
};

export const initializeSpectrumWithVersion = (
  base: Omit<SpectrumData, 'currentVersionId' | 'versions'>,
  createdBy: string
): SpectrumData => {
  const initialVersion = createInitialVersion(
    base.points,
    createdBy,
    base.isNormalized
  );
  return {
    ...base,
    currentVersionId: initialVersion.id,
    versions: [initialVersion],
  };
};

export const switchToVersion = (
  spectrum: SpectrumData,
  versionId: string
): SpectrumData | null => {
  const targetVersion = spectrum.versions.find((v) => v.id === versionId);
  if (!targetVersion) return null;

  return {
    ...spectrum,
    currentVersionId: versionId,
    points: targetVersion.points.map((p) => ({ ...p })),
    wavelengthMin: targetVersion.wavelengthMin,
    wavelengthMax: targetVersion.wavelengthMax,
    isNormalized: targetVersion.isNormalized,
  };
};

export const getCurrentVersion = (
  spectrum: SpectrumData
): SpectrumVersion | undefined => {
  return spectrum.versions.find((v) => v.id === spectrum.currentVersionId);
};

export const getVersionChain = (
  spectrum: SpectrumData,
  versionId?: string
): SpectrumVersion[] => {
  const startId = versionId ?? spectrum.currentVersionId;
  const chain: SpectrumVersion[] = [];
  const idMap = new Map(spectrum.versions.map((v) => [v.id, v]));

  let current: SpectrumVersion | undefined = idMap.get(startId);
  while (current) {
    chain.unshift(current);
    current = current.parentVersionId
      ? idMap.get(current.parentVersionId)
      : undefined;
  }

  return chain;
};

export const compareVersions = (
  spectrum: SpectrumData,
  versionIdA: string,
  versionIdB: string
): {
  versionA: SpectrumVersion | undefined;
  versionB: SpectrumVersion | undefined;
  commonPoints: { wavelength: number; intensityA: number; intensityB: number; diff: number }[];
  wavelengthRangeA: { min: number; max: number };
  wavelengthRangeB: { min: number; max: number };
} => {
  const versionA = spectrum.versions.find((v) => v.id === versionIdA);
  const versionB = spectrum.versions.find((v) => v.id === versionIdB);

  const commonPoints: { wavelength: number; intensityA: number; intensityB: number; diff: number }[] = [];

  if (versionA && versionB) {
    const mapB = new Map(versionB.points.map((p) => [p.wavelength, p.intensity]));
    for (const pointA of versionA.points) {
      const intensityB = mapB.get(pointA.wavelength);
      if (intensityB !== undefined) {
        commonPoints.push({
          wavelength: pointA.wavelength,
          intensityA: pointA.intensity,
          intensityB,
          diff: pointA.intensity - intensityB,
        });
      }
    }
  }

  return {
    versionA,
    versionB,
    commonPoints,
    wavelengthRangeA: versionA
      ? { min: versionA.wavelengthMin, max: versionA.wavelengthMax }
      : { min: 0, max: 0 },
    wavelengthRangeB: versionB
      ? { min: versionB.wavelengthMin, max: versionB.wavelengthMax }
      : { min: 0, max: 0 },
  };
};

export const rollbackToVersion = (
  spectrum: SpectrumData,
  targetVersionId: string,
  createdBy: string
): SpectrumData | null => {
  const targetVersion = spectrum.versions.find((v) => v.id === targetVersionId);
  if (!targetVersion) return null;

  const rollbackVersion: SpectrumVersion = {
    id: genId(),
    version: (getCurrentVersion(spectrum)?.version ?? 0) + 1,
    createdAt: new Date().toISOString(),
    createdBy,
    operation: 'manual_edit',
    description: `回退到版本 v${targetVersion.version}`,
    params: { rolledBackFromVersion: targetVersionId },
    parentVersionId: spectrum.currentVersionId,
    points: targetVersion.points.map((p) => ({ ...p })),
    wavelengthMin: targetVersion.wavelengthMin,
    wavelengthMax: targetVersion.wavelengthMax,
    isNormalized: targetVersion.isNormalized,
  };

  return {
    ...spectrum,
    currentVersionId: rollbackVersion.id,
    versions: [...spectrum.versions, rollbackVersion],
    points: rollbackVersion.points.map((p) => ({ ...p })),
    wavelengthMin: rollbackVersion.wavelengthMin,
    wavelengthMax: rollbackVersion.wavelengthMax,
    isNormalized: rollbackVersion.isNormalized,
  };
};

export const applyProcessingWithVersion = (
  spectrum: SpectrumData,
  processedPoints: SpectrumPoint[],
  operation: VersionOperationType,
  createdBy: string,
  params: Record<string, number | string | boolean> = {},
  description?: string
): SpectrumData => {
  const newVersion = createNewVersion(
    spectrum,
    processedPoints,
    operation,
    createdBy,
    params,
    description
  );

  return {
    ...spectrum,
    currentVersionId: newVersion.id,
    versions: [...spectrum.versions, newVersion],
    points: newVersion.points.map((p) => ({ ...p })),
    wavelengthMin: newVersion.wavelengthMin,
    wavelengthMax: newVersion.wavelengthMax,
    isNormalized: newVersion.isNormalized,
  };
};

export const getVersionSummary = (version: SpectrumVersion): string => {
  const date = new Date(version.createdAt);
  const dateStr = date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `v${version.version} · ${getOperationLabel(version.operation)} · ${dateStr}`;
};
