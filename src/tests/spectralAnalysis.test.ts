import type { SpectrumPoint, ClassificationResult } from '@/types';
import {
  normalizeSpectrumSigmaClipping,
  measureEquivalentWidth,
  classifySpectrum,
  computeLineRatios,
} from '@/lib/spectralAnalysis';

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

export const testNormalizeFlatSpectrum = () => {
  const flat: SpectrumPoint[] = Array.from({ length: 100 }, (_, i) =>
    makePoint(4000 + i * 10, 200)
  );
  const result = normalizeSpectrumSigmaClipping(flat);
  assert(result.length === 100, 'normalize should preserve all points');
  const avg = result.reduce((s, p) => s + p.intensity, 0) / result.length;
  assertClose(avg, 1.0, 1e-6, 'flat spectrum should normalize to 1.0');
};

export const testNormalizeBeStarEmission = () => {
  const points: SpectrumPoint[] = [];
  for (let wl = 6400; wl <= 6700; wl += 2) {
    let int = 100;
    const dist = Math.abs(wl - 6562.8);
    if (dist < 40) {
      int += 150 * Math.exp(-(dist * dist) / (2 * 15 * 15));
    }
    int += (Math.random() - 0.5) * 2;
    points.push(makePoint(wl, int));
  }
  const result = normalizeSpectrumSigmaClipping(points);
  const continuumAvg =
    result
      .filter((p) => Math.abs(p.wavelength - 6562.8) > 80)
      .reduce((s, p) => s + p.intensity, 0) /
    result.filter((p) => Math.abs(p.wavelength - 6562.8) > 80).length;
  assertClose(continuumAvg, 1.0, 0.05, 'continuum around H-alpha should be ~1.0');
  const haPeak = result.reduce(
    (max, p) => (p.intensity > max.intensity ? p : max),
    result[0]
  );
  assert(haPeak.intensity > 1.5, `Be star H-alpha peak should be in emission: ${haPeak.intensity}`);
};

export const testNormalizeAbsorptionLine = () => {
  const points: SpectrumPoint[] = [];
  for (let wl = 4800; wl <= 4920; wl += 1) {
    let int = 100;
    const dist = Math.abs(wl - 4861.3);
    if (dist < 20) {
      int -= 40 * Math.exp(-(dist * dist) / (2 * 8 * 8));
    }
    points.push(makePoint(wl, int));
  }
  const result = normalizeSpectrumSigmaClipping(points);
  const continuumAvg =
    result
      .filter((p) => Math.abs(p.wavelength - 4861.3) > 40)
      .reduce((s, p) => s + p.intensity, 0) /
    result.filter((p) => Math.abs(p.wavelength - 4861.3) > 40).length;
  assertClose(continuumAvg, 1.0, 0.02, 'absorption line continuum normalizes to 1.0');
};

export const testEquivalentWidthEmission = () => {
  const points: SpectrumPoint[] = [];
  for (let wl = 6400; wl <= 6720; wl += 1) {
    let int = 1.0;
    const dist = Math.abs(wl - 6562.8);
    if (dist < 60) {
      int += 0.8 * Math.exp(-(dist * dist) / (2 * 20 * 20));
    }
    points.push(makePoint(wl, int));
  }
  const ew = measureEquivalentWidth(points, 6562.8, 60, 100);
  assert(ew < 0, `emission line EW should be negative, got ${ew}`);
  assert(Math.abs(ew) > 10, `strong emission EW magnitude should be significant, got ${ew}`);
};

export const testEquivalentWidthAbsorption = () => {
  const points: SpectrumPoint[] = [];
  for (let wl = 4800; wl <= 4920; wl += 1) {
    let int = 1.0;
    const dist = Math.abs(wl - 4861.3);
    if (dist < 30) {
      int -= 0.4 * Math.exp(-(dist * dist) / (2 * 10 * 10));
    }
    points.push(makePoint(wl, int));
  }
  const ew = measureEquivalentWidth(points, 4861.3, 40, 60);
  assert(ew > 0, `absorption line EW should be positive, got ${ew}`);
};

export const testClassifyAType = () => {
  const points: SpectrumPoint[] = [];
  for (let wl = 3800; wl <= 7000; wl += 3) {
    let int = 1.0;
    const balmerLines = [6562.8, 4861.3, 4340.5, 4101.7, 3970.1];
    for (const lineWl of balmerLines) {
      const dist = Math.abs(wl - lineWl);
      if (dist < 50) {
        int -= 0.35 * Math.exp(-(dist * dist) / (2 * 10 * 10));
      }
    }
    int += (Math.random() - 0.5) * 0.01;
    points.push(makePoint(wl, int));
  }
  const result: ClassificationResult = classifySpectrum(points);
  assert(typeof result.confidence === 'number', 'confidence should be a number');
  assert(!isNaN(result.confidence), 'confidence should not be NaN');
  assert(result.confidence >= 0 && result.confidence <= 100, `confidence should be 0-100, got ${result.confidence}`);
  assert(typeof result.spectralType === 'string', 'spectralType should be a string');
  assert(result.spectralType.length > 0, 'spectralType should not be empty');
  assert(Array.isArray(result.matchedFeatures), 'matchedFeatures should be an array');
  assert(Array.isArray(result.deviationRegions), 'deviationRegions should be an array');
};

export const testLineRatiosFinite = () => {
  const points: SpectrumPoint[] = [];
  for (let wl = 3800; wl <= 7000; wl += 5) {
    points.push(makePoint(wl, 1.0));
  }
  const ratios = computeLineRatios(points);
  for (const [key, value] of Object.entries(ratios)) {
    assert(typeof value === 'number', `ratio ${key} should be a number`);
    assert(isFinite(value), `ratio ${key} should be finite, got ${value}`);
  }
};

export const testNormalizeEmptyInput = () => {
  const empty: SpectrumPoint[] = [];
  const result = normalizeSpectrumSigmaClipping(empty);
  assert(result.length === 0, 'empty input should return empty result');
  const single: SpectrumPoint[] = [makePoint(5000, 42)];
  const resultSingle = normalizeSpectrumSigmaClipping(single);
  assert(resultSingle.length === 1, 'single point input preserved');
};

export const runAllTests = (): { passed: string[]; failed: { name: string; error: string }[] } => {
  const tests = [
    { name: 'normalizeFlatSpectrum', fn: testNormalizeFlatSpectrum },
    { name: 'normalizeBeStarEmission', fn: testNormalizeBeStarEmission },
    { name: 'normalizeAbsorptionLine', fn: testNormalizeAbsorptionLine },
    { name: 'equivalentWidthEmission', fn: testEquivalentWidthEmission },
    { name: 'equivalentWidthAbsorption', fn: testEquivalentWidthAbsorption },
    { name: 'classifyAType', fn: testClassifyAType },
    { name: 'lineRatiosFinite', fn: testLineRatiosFinite },
    { name: 'normalizeEmptyInput', fn: testNormalizeEmptyInput },
  ];

  const passed: string[] = [];
  const failed: { name: string; error: string }[] = [];

  for (const test of tests) {
    try {
      test.fn();
      passed.push(test.name);
    } catch (e) {
      failed.push({ name: test.name, error: (e as Error).message });
    }
  }

  return { passed, failed };
};
