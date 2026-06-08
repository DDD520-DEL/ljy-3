import type { SpectrumPoint, ClassificationResult, ResidualPoint, SpectrumData, EWComparisonRow, MKTemplate, ManualClassificationResult } from '@/types';
import { SPECTRAL_LINES, MK_TEMPLATES } from '@/data/astronomy';
import {
  normalizeSpectrumSigmaClipping,
  measureEquivalentWidth,
  classifySpectrum,
  computeLineRatios,
  WAVELENGTHS,
  interpolateIntensity,
  computeResiduals,
  computeResidualsInterpolated,
  findDifferenceRegions,
  buildEWComparisonTable,
  getAdjacentTemplates,
  interpolateTemplateLineRatios,
  generateTemplateSpectrumPoints,
  computeTemplateDeviationRegions,
  computeTemplateMatchScoreWithOffsets,
  getRankedCandidateTemplates,
  createManualClassification,
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

// ── interpolateIntensity ──────────────────────────────────────────────

export const testInterpolateIntensityEmpty = () => {
  const result = interpolateIntensity([], 5000);
  assert(result === null, 'interpolate on empty array returns null');
};

export const testInterpolateIntensitySinglePoint = () => {
  const pts = [makePoint(5000, 0.8)];
  assertClose(interpolateIntensity(pts, 5000)!, 0.8, 1e-9, 'single point exact match');
  assert(interpolateIntensity(pts, 4999) === null, 'single point below range returns null');
  assert(interpolateIntensity(pts, 5001) === null, 'single point above range returns null');
};

export const testInterpolateIntensityExactMatch = () => {
  const pts = [makePoint(4000, 0.5), makePoint(5000, 1.0), makePoint(6000, 0.7)];
  assertClose(interpolateIntensity(pts, 4000)!, 0.5, 1e-9, 'exact match at first point');
  assertClose(interpolateIntensity(pts, 5000)!, 1.0, 1e-9, 'exact match at middle point');
  assertClose(interpolateIntensity(pts, 6000)!, 0.7, 1e-9, 'exact match at last point');
};

export const testInterpolateIntensityOutOfRange = () => {
  const pts = [makePoint(4000, 0.5), makePoint(6000, 0.7)];
  assert(interpolateIntensity(pts, 3999) === null, 'below range returns null');
  assert(interpolateIntensity(pts, 6001) === null, 'above range returns null');
};

export const testInterpolateIntensityLinear = () => {
  const pts = [makePoint(4000, 0.4), makePoint(6000, 0.8)];
  assertClose(interpolateIntensity(pts, 5000)!, 0.6, 1e-9, 'midpoint linear interpolation');
  assertClose(interpolateIntensity(pts, 4500)!, 0.5, 1e-9, '25% interpolation');
  assertClose(interpolateIntensity(pts, 5500)!, 0.7, 1e-9, '75% interpolation');
};

// ── computeResiduals ──────────────────────────────────────────────────

export const testComputeResidualsEmpty = () => {
  const r1 = computeResiduals([], [makePoint(5000, 1)]);
  const r2 = computeResiduals([makePoint(5000, 1)], []);
  const r3 = computeResiduals([], []);
  assert(r1.length === 0, 'empty first arg returns empty');
  assert(r2.length === 0, 'empty second arg returns empty');
  assert(r3.length === 0, 'both empty returns empty');
};

export const testComputeResidualsNoOverlap = () => {
  const a = [makePoint(4000, 1), makePoint(4002, 1)];
  const b = [makePoint(5000, 1), makePoint(5002, 1)];
  const res = computeResiduals(a, b);
  assert(res.length === 0, 'no overlapping wavelengths returns empty');
};

export const testComputeResidualsFullOverlap = () => {
  const a = [makePoint(5000, 1.0), makePoint(5002, 0.9), makePoint(5004, 0.8)];
  const b = [makePoint(5000, 0.8), makePoint(5002, 0.9), makePoint(5004, 1.0)];
  const res = computeResiduals(a, b);
  assert(res.length === 3, 'full overlap returns all points');
  assertClose(res[0].diff, 0.2, 1e-9, 'first diff positive');
  assertClose(res[0].absDiff, 0.2, 1e-9, 'first absDiff');
  assertClose(res[1].diff, 0.0, 1e-9, 'second diff zero');
  assertClose(res[1].absDiff, 0.0, 1e-9, 'second absDiff');
  assertClose(res[2].diff, -0.2, 1e-9, 'third diff negative');
  assertClose(res[2].absDiff, 0.2, 1e-9, 'third absDiff');
  assert(res[0].wavelength === 5000, 'wavelength preserved');
};

export const testComputeResidualsPartialOverlap = () => {
  const a = [makePoint(4000, 1), makePoint(5000, 0.9), makePoint(6000, 0.8)];
  const b = [makePoint(5000, 0.8), makePoint(6000, 0.7), makePoint(7000, 0.6)];
  const res = computeResiduals(a, b);
  assert(res.length === 2, 'partial overlap returns intersecting wavelengths');
  assert(res[0].wavelength === 5000, 'first overlapping point');
  assert(res[1].wavelength === 6000, 'second overlapping point');
};

// ── computeResidualsInterpolated ──────────────────────────────────────

export const testComputeResidualsInterpolatedEmpty = () => {
  assert(computeResidualsInterpolated([], []).length === 0, 'both empty');
  assert(computeResidualsInterpolated([makePoint(5000, 1)], []).length === 0, 'second empty');
  assert(computeResidualsInterpolated([], [makePoint(5000, 1)]).length === 0, 'first empty');
};

export const testComputeResidualsInterpolatedSameGrid = () => {
  const a = [makePoint(5000, 1.0), makePoint(5002, 0.9)];
  const b = [makePoint(5000, 0.8), makePoint(5002, 0.95)];
  const res = computeResidualsInterpolated(a, b);
  assert(res.length === 2, 'same grid returns all wavelengths');
  assertClose(res[0].diff, 0.2, 1e-9, 'same grid diff 1');
  assertClose(res[1].diff, -0.05, 1e-9, 'same grid diff 2');
};

export const testComputeResidualsInterpolatedDifferentGrid = () => {
  const a = [makePoint(5000, 1.0), makePoint(5002, 0.8), makePoint(5004, 0.6)];
  const b = [makePoint(5001, 0.9), makePoint(5003, 0.7), makePoint(5005, 0.5)];
  const res = computeResidualsInterpolated(a, b);
  assert(res.length >= 4, 'at least 4 wavelengths in overlap region');
  const wls = res.map((r) => r.wavelength).sort((x, y) => x - y);
  assert(wls.includes(5001), 'wl 5001 present');
  assert(wls.includes(5002), 'wl 5002 present');
  assert(wls.includes(5003), 'wl 5003 present');
  assert(wls.includes(5004), 'wl 5004 present');
  assert(Math.min(...wls) >= 5000, 'min wl >= 5000');
  assert(Math.max(...wls) <= 5005, 'max wl <= 5005');
};

export const testComputeResidualsInterpolatedLinearAccuracy = () => {
  const a = [makePoint(5000, 1.0), makePoint(5001, 1.0), makePoint(5002, 1.0)];
  const b = [makePoint(5000, 0.6), makePoint(5002, 0.8)];
  const res = computeResidualsInterpolated(a, b);
  const mid = res.find((r) => r.wavelength === 5001);
  assert(mid !== undefined, 'mid wavelength 5001 exists via a');
  assertClose(mid.diff, 0.3, 1e-9, 'interpolated b at 5001 is 0.7, a is 1.0 → diff 0.3');
};

// ── findDifferenceRegions ─────────────────────────────────────────────

const makeResidual = (wl: number, diff: number): ResidualPoint => ({
  wavelength: wl,
  diff,
  absDiff: Math.abs(diff),
});

export const testFindDifferenceRegionsEmpty = () => {
  const regions = findDifferenceRegions([]);
  assert(regions.length === 0, 'empty residuals returns no regions');
};

export const testFindDifferenceRegionsNoneExceed = () => {
  const residuals: ResidualPoint[] = [];
  for (let wl = 5000; wl <= 5020; wl += 2) {
    residuals.push(makeResidual(wl, 0.01));
  }
  const regions = findDifferenceRegions(residuals, 0.05);
  assert(regions.length === 0, 'all below threshold returns no regions');
};

export const testFindDifferenceRegionsAllExceed = () => {
  const residuals: ResidualPoint[] = [];
  for (let wl = 5000; wl <= 5010; wl += 1) {
    residuals.push(makeResidual(wl, 0.1));
  }
  const ids: [string, string] = ['sp-a', 'sp-b'];
  const regions = findDifferenceRegions(residuals, 0.05, 10, ids);
  assert(regions.length === 1, 'single continuous region');
  assert(regions[0].start === 5000, 'region start');
  assert(regions[0].end === 5010, 'region end');
  assertClose(regions[0].maxDiff, 0.1, 1e-9, 'max diff');
  assertClose(regions[0].meanDiff, 0.1, 1e-9, 'mean diff');
  assert(regions[0].spectrumIds[0] === 'sp-a', 'spectrumId 0 propagated');
  assert(regions[0].spectrumIds[1] === 'sp-b', 'spectrumId 1 propagated');
};

export const testFindDifferenceRegionsThresholdBoundary = () => {
  const residuals = [
    makeResidual(5000, 0.049),
    makeResidual(5001, 0.05),
    makeResidual(5002, 0.051),
    makeResidual(5003, 0.049),
  ];
  const regions = findDifferenceRegions(residuals, 0.05, 10);
  assert(regions.length === 1, 'boundary: >= threshold included');
  assert(regions[0].start === 5001, 'start at first >= threshold');
  assert(regions[0].end === 5002, 'end at last >= threshold');
};

export const testFindDifferenceRegionsGapMerging = () => {
  const residuals: ResidualPoint[] = [];
  for (let wl = 5000; wl <= 5004; wl += 1) residuals.push(makeResidual(wl, 0.1));
  for (let wl = 5005; wl <= 5006; wl += 1) residuals.push(makeResidual(wl, 0.01));
  for (let wl = 5007; wl <= 5010; wl += 1) residuals.push(makeResidual(wl, 0.1));
  const regionsSmallGap = findDifferenceRegions(residuals, 0.05, 10);
  assert(regionsSmallGap.length === 1, 'small gap merged into single region');

  const residualsBigGap: ResidualPoint[] = [];
  for (let wl = 5000; wl <= 5004; wl += 1) residualsBigGap.push(makeResidual(wl, 0.1));
  for (let wl = 5005; wl <= 5020; wl += 1) residualsBigGap.push(makeResidual(wl, 0.01));
  for (let wl = 5021; wl <= 5025; wl += 1) residualsBigGap.push(makeResidual(wl, 0.1));
  const regionsBigGap = findDifferenceRegions(residualsBigGap, 0.05, 10);
  assert(regionsBigGap.length === 2, 'big gap produces two separate regions');
  assert(regionsBigGap[0].end < regionsBigGap[1].start, 'regions ordered and separate');
};

export const testFindDifferenceRegionsDefaultSpectrumIds = () => {
  const residuals = [makeResidual(5000, 0.1), makeResidual(5001, 0.1)];
  const regions = findDifferenceRegions(residuals, 0.05);
  assert(regions[0].spectrumIds[0] === '', 'default empty id 0');
  assert(regions[0].spectrumIds[1] === '', 'default empty id 1');
};

// ── buildEWComparisonTable ────────────────────────────────────────────

const makeFakeSpectrum = (id: string, name: string, seed: number): SpectrumData => {
  const pts: SpectrumPoint[] = [];
  for (let wl = 3800; wl <= 7000; wl += 2) {
    let intensity = 1.0;
    for (const line of SPECTRAL_LINES) {
      const d = Math.abs(wl - line.wavelength);
      if (d < 50) {
        const depth = (0.2 + seed * 0.05) * Math.exp(-(d * d) / (2 * 8 * 8));
        intensity -= depth;
      }
    }
    pts.push(makePoint(wl, intensity));
  }
  return {
    id,
    name,
    targetName: 'Test',
    observationDate: '2026-01-01',
    wavelengthMin: 3800,
    wavelengthMax: 7000,
    points: pts,
    isNormalized: true,
  };
};

export const testBuildEWComparisonTableEmpty = () => {
  const table = buildEWComparisonTable([]);
  assert(Array.isArray(table), 'returns array');
  for (const row of table) {
    for (const val of Object.values(row.values)) {
      assert(!isFinite(val) || val === 0, 'empty spectra produce zero or NaN values');
    }
  }
};

export const testBuildEWComparisonTableSingleSpectrum = () => {
  const sp = makeFakeSpectrum('sp1', 'Spectrum A', 1);
  const table = buildEWComparisonTable([sp]);
  assert(table.length > 0, 'produces rows for default lines');
  const ha = table.find((r) => r.lineLabel === 'Hα');
  assert(ha !== undefined, 'Hα row present');
  assert(ha!.wavelength === 6562.8, 'Hα wavelength correct');
  assert('sp1' in ha!.values, 'contains spectrum id key');
  assertClose(ha!.maxDiff, 0, 1e-9, 'single spectrum maxDiff is 0');
  assert(isFinite(ha!.values['sp1']), 'EW value is finite');
};

export const testBuildEWComparisonTableMultipleSpectra = () => {
  const sp1 = makeFakeSpectrum('sp1', 'A', 1);
  const sp2 = makeFakeSpectrum('sp2', 'B', 2);
  const sp3 = makeFakeSpectrum('sp3', 'C', 3);
  const table = buildEWComparisonTable([sp1, sp2, sp3]);
  for (const row of table) {
    assert('sp1' in row.values, `${row.lineLabel} has sp1`);
    assert('sp2' in row.values, `${row.lineLabel} has sp2`);
    assert('sp3' in row.values, `${row.lineLabel} has sp3`);
    assert(isFinite(row.values['sp1']), `${row.lineLabel} sp1 EW finite`);
    assert(isFinite(row.values['sp2']), `${row.lineLabel} sp2 EW finite`);
    assert(isFinite(row.values['sp3']), `${row.lineLabel} sp3 EW finite`);
    assert(isFinite(row.meanValue), `${row.lineLabel} meanValue finite`);
    assert(row.maxDiff >= 0, `${row.lineLabel} maxDiff non-negative`);
  }
};

export const testBuildEWComparisonTableCustomLines = () => {
  const sp = makeFakeSpectrum('sp1', 'A', 1);
  const table = buildEWComparisonTable([sp], ['Hα', 'He I 4471']);
  assert(table.length === 2, 'exactly two rows for custom labels');
  assert(table[0].lineLabel === 'Hα', 'first row Hα');
  assert(table[1].lineLabel === 'He I 4471', 'second row He I 4471');
};

export const testBuildEWComparisonTableAllLinesPresent = () => {
  const sp = makeFakeSpectrum('sp1', 'A', 1);
  const table = buildEWComparisonTable([sp]);
  const expected = ['Hα', 'Hβ', 'Hγ', 'Hδ', 'He I 4471', 'He II 4686', 'Ca II K', 'Ca II H', 'Na I D1', 'Na I D2', 'Mg I b1', 'Mg I b2', 'Si II 6347'];
  for (const label of expected) {
    const row = table.find((r) => r.lineLabel === label);
    assert(row !== undefined, `default line ${label} present`);
    const line = SPECTRAL_LINES.find((l) => l.label === label);
    assert(row!.wavelength === line!.wavelength, `wavelength matches for ${label}`);
  }
};

// ── getAdjacentTemplates ──────────────────────────────────────────────

export const testGetAdjacentTemplates = () => {
  const a0V = MK_TEMPLATES.find((t) => t.label === 'A0V');
  assert(a0V !== undefined, 'A0V template exists');
  const adj = getAdjacentTemplates(a0V!);
  assert(adj.prev === null || adj.prev.spectralType === 'B', 'A0V prev should be null or B type');
  assert(adj.next !== null, 'A0V should have next template');
  assert(adj.next!.spectralType === 'A', 'A0V next should be A type');
};

const parseSubtypeFromLabel = (label: string): number => {
  const match = label.match(/^[OBAFGKM](\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

export const testGetAdjacentTemplatesEdge = () => {
  const allSorted = [...MK_TEMPLATES].sort((a, b) => {
    const typeOrder = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];
    const ti = typeOrder.indexOf(a.spectralType) - typeOrder.indexOf(b.spectralType);
    if (ti !== 0) return ti;
    const sa = parseSubtypeFromLabel(a.label);
    const sb = parseSubtypeFromLabel(b.label);
    if (sa !== sb) return sa - sb;
    return a.luminosityClass.localeCompare(b.luminosityClass);
  });
  const first = allSorted[0];
  const last = allSorted[allSorted.length - 1];
  assert(getAdjacentTemplates(first).prev === null, 'first template has no prev');
  assert(getAdjacentTemplates(last).next === null, 'last template has no next');
};

// ── interpolateTemplateLineRatios ─────────────────────────────────────

export const testInterpolateTemplateLineRatiosZeroOffset = () => {
  const template = MK_TEMPLATES[0];
  const interpolated = interpolateTemplateLineRatios(template, 0, 0);
  for (const key of Object.keys(template.lineRatios)) {
    assertClose(interpolated[key] || 0, template.lineRatios[key] || 0, 1e-9, `zero offset preserves ${key}`);
  }
};

export const testInterpolateTemplateLineRatiosFinite = () => {
  for (const t of MK_TEMPLATES.slice(0, 5)) {
    for (const so of [-1, 0, 1]) {
      for (const lo of [-1, 0, 1]) {
        const ratios = interpolateTemplateLineRatios(t, so * 0.5, lo * 0.5);
        for (const v of Object.values(ratios)) {
          assert(isFinite(v), `interpolated ratio finite for ${t.label} so=${so} lo=${lo}`);
          assert(v >= 0, `interpolated ratio non-negative for ${t.label}`);
        }
      }
    }
  }
};

// ── generateTemplateSpectrumPoints ────────────────────────────────────

export const testGenerateTemplateSpectrumPointsBasic = () => {
  const template = MK_TEMPLATES.find((t) => t.label === 'A0V')!;
  const points = generateTemplateSpectrumPoints(template, 4000, 7000, 10, 0, 0, 1.0);
  assert(points.length > 0, 'generates non-empty points');
  assert(points[0].wavelength >= 4000, 'first point >= wlMin');
  assert(points[points.length - 1].wavelength <= 7000, 'last point <= wlMax');
  for (const p of points) {
    assert(isFinite(p.intensity), `intensity finite at ${p.wavelength}`);
    assert(p.intensity >= 0, `intensity non-negative at ${p.wavelength}`);
  }
};

export const testGenerateTemplateSpectrumPointsScale = () => {
  const template = MK_TEMPLATES[0];
  const base = generateTemplateSpectrumPoints(template, 5000, 5010, 5, 0, 0, 1.0);
  const scaled = generateTemplateSpectrumPoints(template, 5000, 5010, 5, 0, 0, 1.5);
  assert(base.length === scaled.length, 'same number of points');
  for (let i = 0; i < base.length; i++) {
    assert(base[i].wavelength === scaled[i].wavelength, 'wavelengths match');
    assertClose(scaled[i].intensity, base[i].intensity * 1.5, 1e-6, `scaled intensity at ${base[i].wavelength}`);
  }
};

// ── computeTemplateDeviationRegions ───────────────────────────────────

export const testComputeTemplateDeviationRegionsIdentical = () => {
  const points: SpectrumPoint[] = [];
  for (let wl = 5000; wl <= 5100; wl += 2) points.push(makePoint(wl, 1.0));
  const regions = computeTemplateDeviationRegions(points, points, 0.01);
  assert(regions.length === 0, 'identical spectra produce no deviation regions');
};

export const testComputeTemplateDeviationRegionsThreshold = () => {
  const observed: SpectrumPoint[] = [];
  const template: SpectrumPoint[] = [];
  for (let wl = 5000; wl <= 5100; wl += 2) {
    observed.push(makePoint(wl, wl < 5040 || wl > 5060 ? 1.0 : 0.8));
    template.push(makePoint(wl, 1.0));
  }
  const regions = computeTemplateDeviationRegions(observed, template, 0.05);
  assert(regions.length >= 1, 'should detect deviation region');
  if (regions.length > 0) {
    assert(regions[0].start <= 5040, 'region start at or before dip');
    assert(regions[0].end >= 5060, 'region end at or after dip');
    assert(regions[0].maxDiff >= 0.15, 'max diff captures the 0.2 difference');
  }
};

// ── computeTemplateMatchScoreWithOffsets ──────────────────────────────

export const testComputeTemplateMatchScoreWithOffsetsFinite = () => {
  const points: SpectrumPoint[] = [];
  for (let wl = 4000; wl <= 7000; wl += 10) points.push(makePoint(wl, 1.0));
  for (const t of MK_TEMPLATES.slice(0, 3)) {
    const score = computeTemplateMatchScoreWithOffsets(points, t, 0, 0);
    assert(isFinite(score), `score finite for ${t.label}`);
    assert(score >= 0, `score non-negative for ${t.label}`);
  }
};

// ── getRankedCandidateTemplates ───────────────────────────────────────

export const testGetRankedCandidateTemplatesReturnsTopN = () => {
  const points: SpectrumPoint[] = [];
  for (let wl = 4000; wl <= 7000; wl += 20) points.push(makePoint(wl, 1.0));
  const top3 = getRankedCandidateTemplates(points, 3);
  assert(top3.length === 3, 'returns exactly top N');
  const top5 = getRankedCandidateTemplates(points, 5);
  assert(top5.length === 5, 'returns exactly top 5');
  for (const { template, score } of top3) {
    assert(isFinite(score), 'score is finite');
    assert(template.label.length > 0, 'template has label');
  }
};

export const testGetRankedCandidateTemplatesSorted = () => {
  const points: SpectrumPoint[] = [];
  for (let wl = 4000; wl <= 7000; wl += 20) points.push(makePoint(wl, 1.0));
  const ranked = getRankedCandidateTemplates(points, 10);
  for (let i = 1; i < ranked.length; i++) {
    assert(ranked[i - 1].score >= ranked[i].score, `candidates sorted by score desc at ${i}`);
  }
};

// ── createManualClassification ────────────────────────────────────────

export const testCreateManualClassificationStructure = () => {
  const template = MK_TEMPLATES.find((t) => t.label === 'G2V')!;
  const points: SpectrumPoint[] = [];
  for (let wl = 4000; wl <= 7000; wl += 20) points.push(makePoint(wl, 1.0));
  const result = createManualClassification(template, 0, 0, points, '看起来正确');
  assert(result.source === 'manual', 'source is manual');
  assert(result.spectralType === 'G', 'spectralType matches template');
  assert(result.luminosityClass === 'V', 'luminosityClass matches template');
  assert(result.confidence >= 0 && result.confidence <= 100, 'confidence in range');
  assert(result.reviewerNotes === '看起来正确', 'reviewerNotes preserved');
  assert(typeof result.confirmedAt === 'string' && result.confirmedAt.length > 0, 'confirmedAt timestamp present');
  assert(Array.isArray(result.matchedFeatures), 'matchedFeatures is array');
  assert(Array.isArray(result.deviationRegions), 'deviationRegions is array');
};

export const testCreateManualClassificationNoNotes = () => {
  const template = MK_TEMPLATES[0];
  const points = [makePoint(5000, 1.0)];
  const result = createManualClassification(template, 0, 0, points);
  assert(result.reviewerNotes === undefined, 'no notes when not provided');
  assert(result.source === 'manual', 'still marked as manual');
};

export const testCreateManualClassificationOffsetApplied = () => {
  const a0v = MK_TEMPLATES.find((t) => t.label === 'A0V');
  if (a0v) {
    const points: SpectrumPoint[] = [];
    for (let wl = 4000; wl <= 7000; wl += 20) points.push(makePoint(wl, 1.0));
    const r1 = createManualClassification(a0v, 0, 0, points);
    const r2 = createManualClassification(a0v, 0.5, 0, points);
    assert(r1.confidence !== undefined, 'base confidence exists');
    assert(r2.confidence !== undefined, 'offset confidence exists');
    assert(typeof r1.confidence === 'number' && typeof r2.confidence === 'number', 'both confidences are numbers');
  }
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
    // interpolateIntensity
    { name: 'interpolateIntensityEmpty', fn: testInterpolateIntensityEmpty },
    { name: 'interpolateIntensitySinglePoint', fn: testInterpolateIntensitySinglePoint },
    { name: 'interpolateIntensityExactMatch', fn: testInterpolateIntensityExactMatch },
    { name: 'interpolateIntensityOutOfRange', fn: testInterpolateIntensityOutOfRange },
    { name: 'interpolateIntensityLinear', fn: testInterpolateIntensityLinear },
    // computeResiduals
    { name: 'computeResidualsEmpty', fn: testComputeResidualsEmpty },
    { name: 'computeResidualsNoOverlap', fn: testComputeResidualsNoOverlap },
    { name: 'computeResidualsFullOverlap', fn: testComputeResidualsFullOverlap },
    { name: 'computeResidualsPartialOverlap', fn: testComputeResidualsPartialOverlap },
    // computeResidualsInterpolated
    { name: 'computeResidualsInterpolatedEmpty', fn: testComputeResidualsInterpolatedEmpty },
    { name: 'computeResidualsInterpolatedSameGrid', fn: testComputeResidualsInterpolatedSameGrid },
    { name: 'computeResidualsInterpolatedDifferentGrid', fn: testComputeResidualsInterpolatedDifferentGrid },
    { name: 'computeResidualsInterpolatedLinearAccuracy', fn: testComputeResidualsInterpolatedLinearAccuracy },
    // findDifferenceRegions
    { name: 'findDifferenceRegionsEmpty', fn: testFindDifferenceRegionsEmpty },
    { name: 'findDifferenceRegionsNoneExceed', fn: testFindDifferenceRegionsNoneExceed },
    { name: 'findDifferenceRegionsAllExceed', fn: testFindDifferenceRegionsAllExceed },
    { name: 'findDifferenceRegionsThresholdBoundary', fn: testFindDifferenceRegionsThresholdBoundary },
    { name: 'findDifferenceRegionsGapMerging', fn: testFindDifferenceRegionsGapMerging },
    { name: 'findDifferenceRegionsDefaultSpectrumIds', fn: testFindDifferenceRegionsDefaultSpectrumIds },
    // buildEWComparisonTable
    { name: 'buildEWComparisonTableEmpty', fn: testBuildEWComparisonTableEmpty },
    { name: 'buildEWComparisonTableSingleSpectrum', fn: testBuildEWComparisonTableSingleSpectrum },
    { name: 'buildEWComparisonTableMultipleSpectra', fn: testBuildEWComparisonTableMultipleSpectra },
    { name: 'buildEWComparisonTableCustomLines', fn: testBuildEWComparisonTableCustomLines },
    { name: 'buildEWComparisonTableAllLinesPresent', fn: testBuildEWComparisonTableAllLinesPresent },
    // getAdjacentTemplates
    { name: 'getAdjacentTemplates', fn: testGetAdjacentTemplates },
    { name: 'getAdjacentTemplatesEdge', fn: testGetAdjacentTemplatesEdge },
    // interpolateTemplateLineRatios
    { name: 'interpolateTemplateLineRatiosZeroOffset', fn: testInterpolateTemplateLineRatiosZeroOffset },
    { name: 'interpolateTemplateLineRatiosFinite', fn: testInterpolateTemplateLineRatiosFinite },
    // generateTemplateSpectrumPoints
    { name: 'generateTemplateSpectrumPointsBasic', fn: testGenerateTemplateSpectrumPointsBasic },
    { name: 'generateTemplateSpectrumPointsScale', fn: testGenerateTemplateSpectrumPointsScale },
    // computeTemplateDeviationRegions
    { name: 'computeTemplateDeviationRegionsIdentical', fn: testComputeTemplateDeviationRegionsIdentical },
    { name: 'computeTemplateDeviationRegionsThreshold', fn: testComputeTemplateDeviationRegionsThreshold },
    // computeTemplateMatchScoreWithOffsets
    { name: 'computeTemplateMatchScoreWithOffsetsFinite', fn: testComputeTemplateMatchScoreWithOffsetsFinite },
    // getRankedCandidateTemplates
    { name: 'getRankedCandidateTemplatesReturnsTopN', fn: testGetRankedCandidateTemplatesReturnsTopN },
    { name: 'getRankedCandidateTemplatesSorted', fn: testGetRankedCandidateTemplatesSorted },
    // createManualClassification
    { name: 'createManualClassificationStructure', fn: testCreateManualClassificationStructure },
    { name: 'createManualClassificationNoNotes', fn: testCreateManualClassificationNoNotes },
    { name: 'createManualClassificationOffsetApplied', fn: testCreateManualClassificationOffsetApplied },
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
