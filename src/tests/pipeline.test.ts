import type { SpectrumPoint } from '@/types';
import {
  skySubtraction,
  cosmicRayRemoval,
  wavelengthCalibration,
  normalizationStep,
  processStep,
  DEFAULT_PIPELINE_CONFIG,
  STEP_ORDER,
  STEP_NAMES,
} from '@/lib/pipelineSteps';
import { pipelineEngine } from '@/lib/pipelineEngine';

const makePoint = (wl: number, int: number): SpectrumPoint => ({ wavelength: wl, intensity: int });

function assert(condition: boolean, msg: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function assertClose(actual: number, expected: number, tolerance: number, msg: string): void {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(
      `Assertion failed: ${msg}. Expected ${expected} ±${tolerance}, got ${actual}`
    );
  }
}

const makeTestSpectrum = (count: number = 200, withNoise: boolean = true): SpectrumPoint[] => {
  const points: SpectrumPoint[] = [];
  for (let i = 0; i < count; i++) {
    const wl = 4000 + i * 10;
    let intensity = 100 + 20 * Math.sin((i / count) * Math.PI * 4);
    if (withNoise) {
      intensity += (Math.random() - 0.5) * 5;
    }
    points.push(makePoint(wl, intensity));
  }
  return points;
};

export const testSkySubtractionRemovesBaseline = async () => {
  const points: SpectrumPoint[] = [];
  for (let i = 0; i < 100; i++) {
    const wl = 4000 + i * 10;
    const baseline = 50 + 0.01 * (wl - 4000) + 0.00001 * (wl - 4000) ** 2;
    const signal = 10 * Math.sin((i / 100) * Math.PI * 6);
    points.push(makePoint(wl, baseline + signal));
  }

  const result = await skySubtraction(points, { skyWindowSize: 20, polynomialOrder: 3 });
  assert(result.points.length === 100, 'sky subtraction preserves number of points');

  const intensities = result.points.map((p) => p.intensity);
  const mean = intensities.reduce((s, v) => s + v, 0) / intensities.length;
  assertClose(mean, 10, 8, 'baseline removed, mean around signal level');

  assert(result.previewBefore.length > 0, 'preview before generated');
  assert(result.previewAfter.length > 0, 'preview after generated');
};

export const testSkySubtractionEmptyInput = async () => {
  const result = await skySubtraction([], { skyWindowSize: 50, polynomialOrder: 3 });
  assert(result.points.length === 0, 'empty input returns empty result');
};

export const testCosmicRayRemovalDetectsSpikes = async () => {
  const points = makeTestSpectrum(150, false);
  const spikeIdx = 75;
  const originalIntensity = points[spikeIdx].intensity;
  points[spikeIdx] = makePoint(points[spikeIdx].wavelength, originalIntensity * 10);

  const result = await cosmicRayRemoval(points, { sigmaThreshold: 3, maxIterations: 3, windowSize: 5 });
  assert(result.points.length === 150, 'cosmic ray removal preserves point count');

  const processed = result.points[spikeIdx].intensity;
  assert(processed < originalIntensity * 5, `cosmic spike reduced: was ${originalIntensity * 10}, now ${processed}`);
  assert(processed > 0, 'processed intensity positive');
};

export const testCosmicRayRemovalEmptyInput = async () => {
  const result = await cosmicRayRemoval([], { sigmaThreshold: 5, maxIterations: 3, windowSize: 5 });
  assert(result.points.length === 0, 'empty input returns empty');
};

export const testWavelengthCalibrationNoReferenceLines = async () => {
  const points = makeTestSpectrum(50);
  const result = await wavelengthCalibration(points, { referenceLines: [], shiftTolerance: 10 });
  assert(result.points.length === 50, 'no ref lines preserves points');
  for (let i = 0; i < points.length; i++) {
    assertClose(result.points[i].wavelength, points[i].wavelength, 1e-6, 'wavelength unchanged without refs');
    assertClose(result.points[i].intensity, points[i].intensity, 1e-6, 'intensity unchanged');
  }
};

export const testWavelengthCalibrationShiftDetection = async () => {
  const points: SpectrumPoint[] = [];
  const refLines = [4500, 5000, 5500, 6000, 6500];
  const trueShift = 3;

  for (let wl = 4000; wl <= 7000; wl += 5) {
    let intensity = 1.0;
    for (const ref of refLines) {
      const dist = Math.abs(wl - (ref - trueShift));
      if (dist < 15) {
        intensity += 0.5 * Math.exp(-(dist * dist) / (2 * 5 * 5));
      }
    }
    points.push(makePoint(wl, intensity));
  }

  const result = await wavelengthCalibration(
    points,
    { referenceLines: refLines, shiftTolerance: 10 }
  );
  assert(result.points.length === points.length, 'calibration preserves count');
};

export const testWavelengthCalibrationEmptyInput = async () => {
  const result = await wavelengthCalibration([], { referenceLines: [5000], shiftTolerance: 10 });
  assert(result.points.length === 0, 'empty input returns empty');
};

export const testNormalizationStepPreservesPoints = async () => {
  const points = makeTestSpectrum(80);
  const result = await normalizationStep(points, { sigma: 3, maxIterations: 10 });
  assert(result.points.length === 80, 'normalization preserves point count');
  const intensities = result.points.map((p) => p.intensity);
  const max = Math.max(...intensities);
  assert(max > 0, 'normalized intensities positive');
};

export const testProcessStepRoutesCorrectly = async () => {
  const points = makeTestSpectrum(30);

  const normResult = await processStep('normalization', points, { sigma: 3, maxIterations: 10 });
  assert(normResult.points.length === 30, 'processStep normalization works');

  const skyResult = await processStep('sky_subtraction', points, { skyWindowSize: 20, polynomialOrder: 2 });
  assert(skyResult.points.length === 30, 'processStep sky_subtraction works');

  const cosmicResult = await processStep('cosmic_ray_removal', points, { sigmaThreshold: 5, maxIterations: 2, windowSize: 3 });
  assert(cosmicResult.points.length === 30, 'processStep cosmic_ray_removal works');
};

export const testStepOrderAndNames = () => {
  assert(STEP_ORDER.length === 4, 'four processing steps defined');
  assert(STEP_ORDER[0] === 'sky_subtraction', 'first step is sky subtraction');
  assert(STEP_ORDER[1] === 'cosmic_ray_removal', 'second step is cosmic ray removal');
  assert(STEP_ORDER[2] === 'wavelength_calibration', 'third step is wavelength calibration');
  assert(STEP_ORDER[3] === 'normalization', 'fourth step is normalization');

  for (const step of STEP_ORDER) {
    assert(typeof STEP_NAMES[step] === 'string' && STEP_NAMES[step].length > 0, `name for ${step} exists`);
  }
};

export const testDefaultPipelineConfig = () => {
  const cfg = DEFAULT_PIPELINE_CONFIG;
  assert(cfg.sky_subtraction.enabled === true, 'sky subtraction enabled by default');
  assert(cfg.cosmic_ray_removal.enabled === true, 'cosmic ray removal enabled by default');
  assert(cfg.wavelength_calibration.enabled === false, 'wavelength calibration disabled by default');
  assert(cfg.normalization.enabled === true, 'normalization enabled by default');

  assert(typeof cfg.sky_subtraction.params.skyWindowSize === 'number', 'sky window size defined');
  assert(typeof cfg.cosmic_ray_removal.params.sigmaThreshold === 'number', 'sigma threshold defined');
  assert(typeof cfg.normalization.params.sigma === 'number', 'normalization sigma defined');
};

export const testPipelineEngineCreatesTask = () => {
  const points = makeTestSpectrum(40);
  const task = pipelineEngine.createTask('Test Spectrum', points, DEFAULT_PIPELINE_CONFIG);
  assert(task.id.length > 0, 'task has id');
  assert(task.status === 'pending', 'new task is pending');
  assert(task.spectrumName === 'Test Spectrum', 'task name correct');

  const pipeline = pipelineEngine.getPipeline(task.pipelineId);
  assert(pipeline !== undefined, 'pipeline created for task');
  assert(pipeline!.originalPoints.length === 40, 'pipeline stores original points');
  assert(pipeline!.steps.length === 4, 'pipeline has 4 steps');
};

export const testPipelineEngineTaskList = () => {
  const initialCount = pipelineEngine.getTasks().length;
  const points = makeTestSpectrum(20);
  pipelineEngine.createTask('List Test', points, DEFAULT_PIPELINE_CONFIG);
  assert(pipelineEngine.getTasks().length === initialCount + 1, 'task added to list');
};

export const runAllPipelineTests = async (): Promise<{
  passed: string[];
  failed: { name: string; error: string }[];
}> => {
  const tests: { name: string; fn: () => void | Promise<void> }[] = [
    { name: 'skySubtractionRemovesBaseline', fn: testSkySubtractionRemovesBaseline },
    { name: 'skySubtractionEmptyInput', fn: testSkySubtractionEmptyInput },
    { name: 'cosmicRayRemovalDetectsSpikes', fn: testCosmicRayRemovalDetectsSpikes },
    { name: 'cosmicRayRemovalEmptyInput', fn: testCosmicRayRemovalEmptyInput },
    { name: 'wavelengthCalibrationNoReferenceLines', fn: testWavelengthCalibrationNoReferenceLines },
    { name: 'wavelengthCalibrationShiftDetection', fn: testWavelengthCalibrationShiftDetection },
    { name: 'wavelengthCalibrationEmptyInput', fn: testWavelengthCalibrationEmptyInput },
    { name: 'normalizationStepPreservesPoints', fn: testNormalizationStepPreservesPoints },
    { name: 'processStepRoutesCorrectly', fn: testProcessStepRoutesCorrectly },
    { name: 'stepOrderAndNames', fn: testStepOrderAndNames },
    { name: 'defaultPipelineConfig', fn: testDefaultPipelineConfig },
    { name: 'pipelineEngineCreatesTask', fn: testPipelineEngineCreatesTask },
    { name: 'pipelineEngineTaskList', fn: testPipelineEngineTaskList },
  ];

  const passed: string[] = [];
  const failed: { name: string; error: string }[] = [];

  for (const test of tests) {
    try {
      await test.fn();
      passed.push(test.name);
    } catch (e) {
      failed.push({ name: test.name, error: (e as Error).message });
    }
  }

  return { passed, failed };
};
