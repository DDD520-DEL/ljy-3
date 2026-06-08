import type { SpectrumPoint, ProcessingStepType, StepResult, PipelineConfig } from '@/types';
import { normalizeSpectrumSigmaClipping } from './spectralAnalysis';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const downsampleForPreview = (points: SpectrumPoint[], maxPoints: number = 500): SpectrumPoint[] => {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  const sampled: SpectrumPoint[] = [];
  for (let i = 0; i < points.length; i += step) {
    sampled.push(points[i]);
  }
  return sampled;
};

const polyFit = (x: number[], y: number[], order: number): number[] => {
  const n = x.length;
  const m = order + 1;
  const X: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < m; j++) {
      row.push(Math.pow(x[i], j));
    }
    X.push(row);
  }
  const AtA: number[][] = [];
  for (let i = 0; i < m; i++) {
    AtA.push(new Array(m).fill(0));
    for (let j = 0; j < m; j++) {
      for (let k = 0; k < n; k++) {
        AtA[i][j] += X[k][i] * X[k][j];
      }
    }
  }
  const AtY: number[] = [];
  for (let i = 0; i < m; i++) {
    let sum = 0;
    for (let k = 0; k < n; k++) {
      sum += X[k][i] * y[k];
    }
    AtY.push(sum);
  }
  const coeffs = solveLinearSystem(AtA, AtY);
  return coeffs;
};

const solveLinearSystem = (A: number[][], b: number[]): number[] => {
  const n = A.length;
  const augmented: number[][] = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
    const pivot = augmented[i][i];
    if (Math.abs(pivot) < 1e-12) continue;
    for (let j = i; j <= n; j++) {
      augmented[i][j] /= pivot;
    }
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const factor = augmented[k][i];
      for (let j = i; j <= n; j++) {
        augmented[k][j] -= factor * augmented[i][j];
      }
    }
  }
  return augmented.map((row) => row[n]);
};

const polyEval = (coeffs: number[], x: number): number => {
  let result = 0;
  for (let i = 0; i < coeffs.length; i++) {
    result += coeffs[i] * Math.pow(x, i);
  }
  return result;
};

export const skySubtraction = async (
  points: SpectrumPoint[],
  params: { skyWindowSize: number; polynomialOrder: number },
  onProgress?: (p: number) => void
): Promise<StepResult> => {
  const n = points.length;
  if (n < 10) {
    return { points, previewBefore: points, previewAfter: points };
  }
  const windowSize = Math.max(5, params.skyWindowSize || 50);
  const order = Math.max(1, Math.min(5, params.polynomialOrder || 3));

  const skyPoints: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    if (i % Math.floor(windowSize / 2) === 0) {
      const start = Math.max(0, i - windowSize / 2);
      const end = Math.min(n, i + windowSize / 2);
      const window = points.slice(start, end);
      const sorted = [...window].sort((a, b) => a.intensity - b.intensity);
      const median = sorted[Math.floor(sorted.length / 2)].intensity;
      skyPoints.push({ x: points[i].wavelength, y: median });
    }
    if (onProgress && i % 100 === 0) {
      onProgress(Math.min(0.5, (i / n) * 0.5));
    }
  }
  await sleep(10);

  const xVals = skyPoints.map((p) => p.x);
  const yVals = skyPoints.map((p) => p.y);
  const coeffs = polyFit(xVals, yVals, order);

  if (onProgress) onProgress(0.75);
  await sleep(10);

  const result: SpectrumPoint[] = [];
  for (let i = 0; i < n; i++) {
    const skyVal = polyEval(coeffs, points[i].wavelength);
    result.push({
      wavelength: points[i].wavelength,
      intensity: Math.max(0, points[i].intensity - skyVal),
    });
    if (onProgress && i % 100 === 0) {
      onProgress(0.75 + (i / n) * 0.25);
    }
  }

  return {
    points: result,
    previewBefore: downsampleForPreview(points),
    previewAfter: downsampleForPreview(result),
  };
};

export const cosmicRayRemoval = async (
  points: SpectrumPoint[],
  params: { sigmaThreshold: number; maxIterations: number; windowSize: number },
  onProgress?: (p: number) => void
): Promise<StepResult> => {
  const n = points.length;
  if (n < 10) {
    return { points, previewBefore: points, previewAfter: points };
  }

  const sigma = params.sigmaThreshold || 5;
  const maxIter = params.maxIterations || 3;
  const winSize = Math.max(3, params.windowSize || 5);

  let result = points.map((p) => ({ ...p }));

  for (let iter = 0; iter < maxIter; iter++) {
    const intensities = result.map((p) => p.intensity);
    const mean = intensities.reduce((s, v) => s + v, 0) / n;
    const variance = intensities.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    const std = Math.sqrt(variance);

    if (std === 0) break;

    let changed = false;
    for (let i = 0; i < n; i++) {
      const start = Math.max(0, i - winSize);
      const end = Math.min(n, i + winSize + 1);
      const neighbors = result.slice(start, end).filter((_, idx) => start + idx !== i);
      if (neighbors.length === 0) continue;
      const localMean = neighbors.reduce((s, p) => s + p.intensity, 0) / neighbors.length;
      const localStd = Math.sqrt(
        neighbors.reduce((s, p) => s + (p.intensity - localMean) ** 2, 0) / neighbors.length
      );
      const deviation = Math.abs(result[i].intensity - localMean);
      if (deviation > sigma * (localStd || std) && deviation > sigma * std) {
        result[i] = { ...result[i], intensity: localMean };
        changed = true;
      }
      if (onProgress) {
        const base = iter / maxIter;
        const frac = (i / n) / maxIter;
        onProgress(base + frac);
      }
    }
    await sleep(10);
    if (!changed) break;
  }

  if (onProgress) onProgress(1);

  return {
    points: result,
    previewBefore: downsampleForPreview(points),
    previewAfter: downsampleForPreview(result),
  };
};

export const wavelengthCalibration = async (
  points: SpectrumPoint[],
  params: { referenceLines: number[]; shiftTolerance: number },
  onProgress?: (p: number) => void
): Promise<StepResult> => {
  const n = points.length;
  if (n < 10) {
    return { points, previewBefore: points, previewAfter: points };
  }

  const tolerance = params.shiftTolerance || 10;
  const refLines = params.referenceLines || [];

  if (refLines.length === 0) {
    if (onProgress) onProgress(1);
    return { points, previewBefore: points, previewAfter: points };
  }

  if (onProgress) onProgress(0.2);
  await sleep(10);

  const findPeaks = (pts: SpectrumPoint[], minProminence: number = 0.05): number[] => {
    const intensities = pts.map((p) => p.intensity);
    const mean = intensities.reduce((s, v) => s + v, 0) / n;
    const peaks: number[] = [];
    for (let i = 2; i < n - 2; i++) {
      if (
        pts[i].intensity > pts[i - 1].intensity &&
        pts[i].intensity > pts[i - 2].intensity &&
        pts[i].intensity > pts[i + 1].intensity &&
        pts[i].intensity > pts[i + 2].intensity &&
        pts[i].intensity > mean * (1 + minProminence)
      ) {
        peaks.push(pts[i].wavelength);
      }
    }
    return peaks.sort((a, b) => b - a).slice(0, refLines.length * 2);
  };

  const peaks = findPeaks(points);
  if (onProgress) onProgress(0.5);
  await sleep(10);

  if (peaks.length === 0) {
    if (onProgress) onProgress(1);
    return { points, previewBefore: points, previewAfter: points };
  }

  let bestShift = 0;
  let bestMatches = 0;
  for (let shift = -tolerance; shift <= tolerance; shift += 0.5) {
    let matches = 0;
    for (const peak of peaks) {
      const shifted = peak + shift;
      for (const ref of refLines) {
        if (Math.abs(shifted - ref) < 2) {
          matches++;
          break;
        }
      }
    }
    if (matches > bestMatches) {
      bestMatches = matches;
      bestShift = shift;
    }
  }

  if (onProgress) onProgress(0.8);
  await sleep(10);

  const result: SpectrumPoint[] = [];
  if (Math.abs(bestShift) > 0.01) {
    for (let i = 0; i < n; i++) {
      result.push({
        wavelength: points[i].wavelength + bestShift,
        intensity: points[i].intensity,
      });
    }
  } else {
    result = points.map((p) => ({ ...p }));
  }

  if (onProgress) onProgress(1);

  return {
    points: result,
    previewBefore: downsampleForPreview(points),
    previewAfter: downsampleForPreview(result),
  };
};

export const normalizationStep = async (
  points: SpectrumPoint[],
  params: { sigma: number; maxIterations: number },
  onProgress?: (p: number) => void
): Promise<StepResult> => {
  if (onProgress) onProgress(0.3);
  await sleep(10);

  const sigma = params.sigma || 3;
  const maxIter = params.maxIterations || 10;
  const result = normalizeSpectrumSigmaClipping(points, sigma, maxIter);

  if (onProgress) onProgress(1);
  await sleep(10);

  return {
    points: result,
    previewBefore: downsampleForPreview(points),
    previewAfter: downsampleForPreview(result),
  };
};

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  sky_subtraction: {
    enabled: true,
    params: { skyWindowSize: 50, polynomialOrder: 3 },
  },
  cosmic_ray_removal: {
    enabled: true,
    params: { sigmaThreshold: 5, maxIterations: 3, windowSize: 5 },
  },
  wavelength_calibration: {
    enabled: false,
    params: { referenceLines: [], shiftTolerance: 10 },
  },
  normalization: {
    enabled: true,
    params: { sigma: 3, maxIterations: 10 },
  },
};

export const STEP_NAMES: Record<ProcessingStepType, string> = {
  sky_subtraction: '天光扣除',
  cosmic_ray_removal: '宇宙线剔除',
  wavelength_calibration: '波长定标',
  normalization: '光谱归一化',
};

export const STEP_DESCRIPTIONS: Record<ProcessingStepType, string> = {
  sky_subtraction: '通过多项式拟合扣除背景天光噪声',
  cosmic_ray_removal: '使用局部统计检测并修复宇宙线尖峰',
  wavelength_calibration: '基于参考谱线自动校准波长轴',
  normalization: '使用 Sigma-Clipping 算法进行连续谱归一化',
};

export const processStep = async (
  type: ProcessingStepType,
  points: SpectrumPoint[],
  params: Record<string, number | string | boolean>,
  onProgress?: (p: number) => void
): Promise<StepResult> => {
  switch (type) {
    case 'sky_subtraction':
      return skySubtraction(points, params as any, onProgress);
    case 'cosmic_ray_removal':
      return cosmicRayRemoval(points, params as any, onProgress);
    case 'wavelength_calibration':
      return wavelengthCalibration(points, params as any, onProgress);
    case 'normalization':
      return normalizationStep(points, params as any, onProgress);
    default:
      return { points, previewBefore: points, previewAfter: points };
  }
};

export const STEP_ORDER: ProcessingStepType[] = [
  'sky_subtraction',
  'cosmic_ray_removal',
  'wavelength_calibration',
  'normalization',
];
