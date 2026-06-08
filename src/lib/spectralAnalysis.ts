import type { SpectrumPoint, ClassificationResult, MKTemplate } from '@/types';
import { MK_TEMPLATES, SPECTRAL_LINES } from '@/data/astronomy';

const getLineWavelength = (label: string): number | undefined =>
  SPECTRAL_LINES.find((l) => l.label === label)?.wavelength;

const WAVELENGTHS = {
  H_ALPHA: getLineWavelength('Hα') ?? 6562.8,
  H_BETA: getLineWavelength('Hβ') ?? 4861.3,
  H_GAMMA: getLineWavelength('Hγ') ?? 4340.5,
  H_DELTA: getLineWavelength('Hδ') ?? 4101.7,
  HE_I_4471: getLineWavelength('He I 4471') ?? 4471.5,
  HE_II_4686: getLineWavelength('He II 4686') ?? 4685.7,
  CA_II_K: getLineWavelength('Ca II K') ?? 3933.7,
  CA_II_H: getLineWavelength('Ca II H') ?? 3968.5,
  NA_I_D1: getLineWavelength('Na I D1') ?? 5895.9,
  NA_I_D2: getLineWavelength('Na I D2') ?? 5889.9,
  MG_I_B1: getLineWavelength('Mg I b1') ?? 5183.6,
  MG_I_B2: getLineWavelength('Mg I b2') ?? 5172.7,
  SI_II_6347: getLineWavelength('Si II 6347') ?? 6347.1,
} as const;

export const normalizeSpectrumSigmaClipping = (
  points: SpectrumPoint[],
  sigma: number = 3,
  maxIter: number = 10
): SpectrumPoint[] => {
  if (points.length < 5) return points;

  let intensities = points.map((p) => p.intensity);

  for (let iter = 0; iter < maxIter; iter++) {
    if (intensities.length < 5) break;

    const mean = intensities.reduce((s, v) => s + v, 0) / intensities.length;
    const variance =
      intensities.reduce((s, v) => s + (v - mean) ** 2, 0) / intensities.length;
    const std = Math.sqrt(variance);

    if (std === 0 || !isFinite(std)) break;

    const upperClip = mean + sigma * std;
    const lowerClip = mean - sigma * std;

    const prevCount = intensities.length;
    intensities = intensities.filter((v) => v >= lowerClip && v <= upperClip);

    if (intensities.length === prevCount) break;
  }

  if (intensities.length === 0) return points;

  const continuumMean =
    intensities.reduce((s, v) => s + v, 0) / intensities.length;

  if (continuumMean <= 0 || !isFinite(continuumMean)) return points;

  return points.map((p) => ({
    ...p,
    intensity: p.intensity / continuumMean,
  }));
};

const getIntensityAtWavelength = (points: SpectrumPoint[], wavelength: number, window: number = 5): number => {
  const nearby = points.filter((p) => Math.abs(p.wavelength - wavelength) <= window);
  if (nearby.length === 0) return 1.0;
  return Math.min(...nearby.map((p) => p.intensity));
};

const measureLineDepth = (
  points: SpectrumPoint[],
  wavelength: number,
  continuumWindow: number = 50,
  lineWindow: number = 8
): number => {
  const continuumLeft = points.filter(
    (p) => p.wavelength >= wavelength - continuumWindow - 20 && p.wavelength <= wavelength - continuumWindow
  );
  const continuumRight = points.filter(
    (p) => p.wavelength >= wavelength + continuumWindow && p.wavelength <= wavelength + continuumWindow + 20
  );
  const continuumPoints = [...continuumLeft, ...continuumRight];
  const continuum =
    continuumPoints.length > 0
      ? continuumPoints.reduce((sum, p) => sum + p.intensity, 0) / continuumPoints.length
      : 1.0;
  const lineMin = getIntensityAtWavelength(points, wavelength, lineWindow);
  return Math.max(0, 1 - lineMin / continuum);
};

export const measureEquivalentWidth = (
  points: SpectrumPoint[],
  centerWavelength: number,
  lineWidth: number = 40,
  continuumWidth: number = 100
): number => {
  const linePoints = points.filter(
    (p) => p.wavelength >= centerWavelength - continuumWidth && p.wavelength <= centerWavelength + continuumWidth
  );
  if (linePoints.length < 10) return 0;

  const leftCont = linePoints.filter((p) => p.wavelength < centerWavelength - lineWidth);
  const rightCont = linePoints.filter((p) => p.wavelength > centerWavelength + lineWidth);
  const allCont = [...leftCont, ...rightCont];
  const continuumLevel = allCont.length > 0
    ? allCont.reduce((s, p) => s + p.intensity, 0) / allCont.length
    : 1.0;

  let ew = 0;
  for (let i = 1; i < linePoints.length; i++) {
    const dl = linePoints[i - 1];
    const dr = linePoints[i];
    const dwl = dr.wavelength - dl.wavelength;
    const avgInt = (dr.intensity + dl.intensity) / 2;
    ew += (1 - avgInt / continuumLevel) * dwl;
  }
  return ew;
};

const computeLineRatios = (points: SpectrumPoint[]): Record<string, number> => {
  const haDepth = measureLineDepth(points, WAVELENGTHS.H_ALPHA);
  const hbDepth = measureLineDepth(points, WAVELENGTHS.H_BETA);
  const hgDepth = measureLineDepth(points, WAVELENGTHS.H_GAMMA);
  const hdDepth = measureLineDepth(points, WAVELENGTHS.H_DELTA);
  const heI4471 = measureLineDepth(points, WAVELENGTHS.HE_I_4471);
  const heII4686 = measureLineDepth(points, WAVELENGTHS.HE_II_4686);
  const caIIK = measureLineDepth(points, WAVELENGTHS.CA_II_K);
  const caIIH = measureLineDepth(points, WAVELENGTHS.CA_II_H);

  const naD1Depth = measureLineDepth(points, WAVELENGTHS.NA_I_D1);
  const naD2Depth = measureLineDepth(points, WAVELENGTHS.NA_I_D2);
  const naID = (naD1Depth + 2 * naD2Depth) / 3;

  const mgIb = measureLineDepth(points, WAVELENGTHS.MG_I_B2);

  const siII6347 = measureLineDepth(points, WAVELENGTHS.SI_II_6347);

  return {
    'Hα/Hβ': hbDepth > 0.01 ? haDepth / hbDepth : 0,
    'HeII4686/HeI4471': heI4471 > 0.01 ? heII4686 / heI4471 : 0,
    'HeI4471/Hβ': hbDepth > 0.01 ? heI4471 / hbDepth : 0,
    'CaII_K/Hγ': hgDepth > 0.01 ? caIIK / hgDepth : 0,
    'CaII_H/Hδ': hdDepth > 0.01 ? caIIH / hdDepth : 0,
    'NaI_D/Hβ': hbDepth > 0.01 ? naID / hbDepth : 0,
    'MgI_b/Hβ': hbDepth > 0.01 ? mgIb / hbDepth : 0,
    'SiII6347/Hβ': hbDepth > 0.01 ? siII6347 / hbDepth : 0,
    'Hα_depth': haDepth,
    'Hβ_depth': hbDepth,
    'Hγ_depth': hgDepth,
    'HeI4471_depth': heI4471,
    'HeII4686_depth': heII4686,
    'CaII_K_depth': caIIK,
    'NaI_D_depth': naID,
    'NaI_D1_depth': naD1Depth,
    'NaI_D2_depth': naD2Depth,
    'MgI_b_depth': mgIb,
    'MgI_b1_depth': measureLineDepth(points, WAVELENGTHS.MG_I_B1),
    'MgI_b2_depth': mgIb,
    'SiII6347_depth': siII6347,
  };
};

const calculateTemplateMatch = (measured: Record<string, number>, template: MKTemplate): number => {
  let totalDiff = 0;
  let count = 0;
  for (const [key, value] of Object.entries(template.lineRatios)) {
    if (measured[key] !== undefined && !isNaN(measured[key])) {
      const diff = Math.abs(measured[key] - value);
      const norm = Math.max(value, 0.1);
      totalDiff += diff / norm;
      count++;
    }
  }
  return count > 0 ? totalDiff / count : Infinity;
};

export const classifySpectrum = (points: SpectrumPoint[]): ClassificationResult => {
  const ratios = computeLineRatios(points);
  const matches = MK_TEMPLATES.map((template) => ({
    template,
    score: calculateTemplateMatch(ratios, template),
  }));

  matches.sort((a, b) => a.score - b.score);

  const bestMatch = matches[0];
  const secondBest = matches[1];

  const rawConfidence = secondBest && secondBest.score > 0
    ? Math.max(0, Math.min(1, 1 - bestMatch.score / secondBest.score))
    : 0.5;
  const confidence = Number((rawConfidence * 100).toFixed(1));

  const matchedFeatures: string[] = [];
  if (ratios['HeII4686_depth'] > 0.05) matchedFeatures.push('强 He II 吸收线');
  if (ratios['HeI4471_depth'] > 0.1) matchedFeatures.push('显著 He I 线');
  if (ratios['Hα_depth'] > 0.2) matchedFeatures.push('强巴尔末线系');
  if (ratios['CaII_K_depth'] > 0.1) matchedFeatures.push('Ca II H&K 线');
  if (ratios['NaI_D_depth'] > 0.05) matchedFeatures.push('Na I D 线');
  if (ratios['MgI_b_depth'] > 0.1) matchedFeatures.push('Mg I b 线');
  if (ratios['SiII6347_depth'] > 0.05) matchedFeatures.push('Si II 线');

  const deviationRegions: { start: number; end: number; description: string }[] = [];

  const spType = bestMatch.template.spectralType;
  const expectedHaDepths: Record<string, { low: number; high: number; label: string }> = {
    O: { low: 0.02, high: 0.1, label: 'O型星巴尔末线深度异常' },
    B: { low: 0.05, high: 0.3, label: 'B型星巴尔末线深度异常' },
    A: { low: 0.2, high: 0.5, label: 'A型星巴尔末线深度异常' },
    F: { low: 0.1, high: 0.35, label: 'F型星巴尔末线深度异常' },
    G: { low: 0.08, high: 0.2, label: 'G型星巴尔末线深度异常' },
    K: { low: 0.02, high: 0.15, label: 'K型星巴尔末线深度异常' },
    M: { low: 0.01, high: 0.08, label: 'M型星巴尔末线深度异常' },
  };
  const haRange = expectedHaDepths[spType];
  if (haRange && (ratios['Hα_depth'] < haRange.low || ratios['Hα_depth'] > haRange.high)) {
    deviationRegions.push({
      start: WAVELENGTHS.H_ALPHA - 100,
      end: WAVELENGTHS.H_ALPHA + 100,
      description: haRange.label,
    });
  }

  const result: ClassificationResult = {
    spectralType: bestMatch.template.spectralType,
    luminosityClass: bestMatch.template.luminosityClass,
    confidence,
    matchedFeatures,
    deviationRegions,
  };
  return result;
};

export { computeLineRatios, WAVELENGTHS };
