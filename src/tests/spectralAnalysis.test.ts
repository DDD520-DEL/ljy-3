import type { SpectrumPoint, ClassificationResult } from '@/types';
import { SPECTRAL_LINES } from '@/data/astronomy';
import {
  normalizeSpectrumSigmaClipping,
  measureEquivalentWidth,
  classifySpectrum,
  computeLineRatios,
  WAVELENGTHS,
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

const findLineWl = (label: string): number => {
  const line = SPECTRAL_LINES.find((l) => l.label === label);
  if (!line) throw new Error(`Line ${label} not found in SPECTRAL_LINES`);
  return line.wavelength;
};

export const testWavelengthConstantsMatchSpectralLines = () => {
  const cases: [string, number][] = [
    ['Hα', WAVELENGTHS.H_ALPHA],
    ['Hβ', WAVELENGTHS.H_BETA],
    ['Hγ', WAVELENGTHS.H_GAMMA],
    ['Hδ', WAVELENGTHS.H_DELTA],
    ['He I 4471', WAVELENGTHS.HE_I_4471],
    ['He II 4686', WAVELENGTHS.HE_II_4686],
    ['Ca II K', WAVELENGTHS.CA_II_K],
    ['Ca II H', WAVELENGTHS.CA_II_H],
    ['Na I D1', WAVELENGTHS.NA_I_D1],
    ['Na I D2', WAVELENGTHS.NA_I_D2],
    ['Mg I b1', WAVELENGTHS.MG_I_B1],
    ['Mg I b2', WAVELENGTHS.MG_I_B2],
    ['Si II 6347', WAVELENGTHS.SI_II_6347],
  ];
  for (const [label, constant] of cases) {
    const expected = findLineWl(label);
    assertClose(constant, expected, 1e-6, `WAVELENGTHS for ${label} should match SPECTRAL_LINES`);
  }
};

export const testNaIDNotUsingArtificialAverage = () => {
  const d1 = findLineWl('Na I D1');
  const d2 = findLineWl('Na I D2');
  const artificial = 5892.9;
  assert(d1 === 5895.9, 'Na I D1 should be 5895.9 Å');
  assert(d2 === 5889.9, 'Na I D2 should be 5889.9 Å');
  assert(WAVELENGTHS.NA_I_D1 !== artificial, 'Na I D1 must not be the artificial average');
  assert(WAVELENGTHS.NA_I_D2 !== artificial, 'Na I D2 must not be the artificial average');
};

export const testMgIbUsesB2NotArtificialAverage = () => {
  const artificial = 5178.2;
  assert(WAVELENGTHS.MG_I_B2 === 5172.7, 'Mg I b2 should be 5172.7 Å');
  assert(WAVELENGTHS.MG_I_B2 !== artificial, 'Mg I b measurement must not use artificial average 5178.2');
};

export const testNaIDWeightedAverage = () => {
  const points: SpectrumPoint[] = [];
  for (let wl = 5850; wl <= 5940; wl += 1) {
    let int = 1.0;
    const d1Dist = Math.abs(wl - WAVELENGTHS.NA_I_D1);
    const d2Dist = Math.abs(wl - WAVELENGTHS.NA_I_D2);
    if (d1Dist < 15) int -= 0.3 * Math.exp(-(d1Dist * d1Dist) / (2 * 4 * 4));
    if (d2Dist < 15) int -= 0.4 * Math.exp(-(d2Dist * d2Dist) / (2 * 4 * 4));
    points.push(makePoint(wl, int));
  }
  for (let wl = 3800; wl <= 7000; wl += 5) {
    if (wl < 5850 || wl > 5940) points.push(makePoint(wl, 1.0));
  }
  points.sort((a, b) => a.wavelength - b.wavelength);
  const ratios = computeLineRatios(points);
  const d1 = ratios['NaI_D1_depth'];
  const d2 = ratios['NaI_D2_depth'];
  const combined = ratios['NaI_D_depth'];
  const expectedWeighted = (d1 + 2 * d2) / 3;
  assertClose(combined, expectedWeighted, 1e-6, 'Na I D depth should be (D1 + 2*D2)/3 weighted average');
  assert(d2 > d1, 'Na I D2 (5889.9) depth should be deeper than D1 (5895.9)');
};

export const testMgIb2Measurement = () => {
  const points: SpectrumPoint[] = [];
  for (let wl = 5100; wl <= 5230; wl += 1) {
    let int = 1.0;
    const b1Dist = Math.abs(wl - WAVELENGTHS.MG_I_B1);
    const b2Dist = Math.abs(wl - WAVELENGTHS.MG_I_B2);
    if (b1Dist < 10) int -= 0.2 * Math.exp(-(b1Dist * b1Dist) / (2 * 3 * 3));
    if (b2Dist < 10) int -= 0.35 * Math.exp(-(b2Dist * b2Dist) / (2 * 3 * 3));
    points.push(makePoint(wl, int));
  }
  for (let wl = 3800; wl <= 7000; wl += 5) {
    if (wl < 5100 || wl > 5230) points.push(makePoint(wl, 1.0));
  }
  points.sort((a, b) => a.wavelength - b.wavelength);
  const ratios = computeLineRatios(points);
  const b2Depth = ratios['MgI_b2_depth'];
  const reportedDepth = ratios['MgI_b_depth'];
  assertClose(reportedDepth, b2Depth, 1e-6, 'Mg I b reported depth should equal b2 (5172.7) measurement');
  assert(b2Depth > ratios['MgI_b1_depth'], 'Mg I b2 should be deeper than b1 in this test');
};

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
  const ha = WAVELENGTHS.H_ALPHA;
  const points: SpectrumPoint[] = [];
  for (let wl = 6400; wl <= 6700; wl += 2) {
    let int = 100;
    const dist = Math.abs(wl - ha);
    if (dist < 40) {
      int += 150 * Math.exp(-(dist * dist) / (2 * 15 * 15));
    }
    int += (Math.random() - 0.5) * 2;
    points.push(makePoint(wl, int));
  }
  const result = normalizeSpectrumSigmaClipping(points);
  const continuumAvg =
    result
      .filter((p) => Math.abs(p.wavelength - ha) > 80)
      .reduce((s, p) => s + p.intensity, 0) /
    result.filter((p) => Math.abs(p.wavelength - ha) > 80).length;
  assertClose(continuumAvg, 1.0, 0.05, 'continuum around H-alpha should be ~1.0');
  const haPeak = result.reduce(
    (max, p) => (p.intensity > max.intensity ? p : max),
    result[0]
  );
  assert(haPeak.intensity > 1.5, `Be star H-alpha peak should be in emission: ${haPeak.intensity}`);
};

export const testNormalizeAbsorptionLine = () => {
  const hb = WAVELENGTHS.H_BETA;
  const points: SpectrumPoint[] = [];
  for (let wl = 4800; wl <= 4920; wl += 1) {
    let int = 100;
    const dist = Math.abs(wl - hb);
    if (dist < 20) {
      int -= 40 * Math.exp(-(dist * dist) / (2 * 8 * 8));
    }
    points.push(makePoint(wl, int));
  }
  const result = normalizeSpectrumSigmaClipping(points);
  const continuumAvg =
    result
      .filter((p) => Math.abs(p.wavelength - hb) > 40)
      .reduce((s, p) => s + p.intensity, 0) /
    result.filter((p) => Math.abs(p.wavelength - hb) > 40).length;
  assertClose(continuumAvg, 1.0, 0.02, 'absorption line continuum normalizes to 1.0');
};

export const testEquivalentWidthEmission = () => {
  const ha = WAVELENGTHS.H_ALPHA;
  const points: SpectrumPoint[] = [];
  for (let wl = 6400; wl <= 6720; wl += 1) {
    let int = 1.0;
    const dist = Math.abs(wl - ha);
    if (dist < 60) {
      int += 0.8 * Math.exp(-(dist * dist) / (2 * 20 * 20));
    }
    points.push(makePoint(wl, int));
  }
  const ew = measureEquivalentWidth(points, ha, 60, 100);
  assert(ew < 0, `emission line EW should be negative, got ${ew}`);
  assert(Math.abs(ew) > 10, `strong emission EW magnitude should be significant, got ${ew}`);
};

export const testEquivalentWidthAbsorption = () => {
  const hb = WAVELENGTHS.H_BETA;
  const points: SpectrumPoint[] = [];
  for (let wl = 4800; wl <= 4920; wl += 1) {
    let int = 1.0;
    const dist = Math.abs(wl - hb);
    if (dist < 30) {
      int -= 0.4 * Math.exp(-(dist * dist) / (2 * 10 * 10));
    }
    points.push(makePoint(wl, int));
  }
  const ew = measureEquivalentWidth(points, hb, 40, 60);
  assert(ew > 0, `absorption line EW should be positive, got ${ew}`);
};

export const testClassifyAType = () => {
  const points: SpectrumPoint[] = [];
  const balmerLines = [
    WAVELENGTHS.H_ALPHA,
    WAVELENGTHS.H_BETA,
    WAVELENGTHS.H_GAMMA,
    WAVELENGTHS.H_DELTA,
    3970.1,
  ];
  for (let wl = 3800; wl <= 7000; wl += 3) {
    let int = 1.0;
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
    { name: 'wavelengthConstantsMatchSpectralLines', fn: testWavelengthConstantsMatchSpectralLines },
    { name: 'naIDNotUsingArtificialAverage', fn: testNaIDNotUsingArtificialAverage },
    { name: 'mgIbUsesB2NotArtificialAverage', fn: testMgIbUsesB2NotArtificialAverage },
    { name: 'naIDWeightedAverage', fn: testNaIDWeightedAverage },
    { name: 'mgIb2Measurement', fn: testMgIb2Measurement },
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
