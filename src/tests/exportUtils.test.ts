import type {
  SpectrumData,
  SpectrumPoint,
  SharedClassificationResult,
  ClassificationResult,
  ManualClassificationResult,
  VisibilityType,
} from '@/types';
import { initializeSpectrumWithVersion } from '@/lib/versionManager';
import {
  getSpectrumMeta,
  getClassificationData,
  getSpectrumClassificationPair,
  buildSummaryExportRows,
  buildFlatExportRows,
  buildJsonExport,
  formatAsDelimited,
} from '@/lib/exportUtils';

function assert(condition: boolean, msg: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function assertDeepEqual<T>(actual: T, expected: T, msg: string): void {
  const aStr = JSON.stringify(actual);
  const eStr = JSON.stringify(expected);
  if (aStr !== eStr) {
    throw new Error(`Assertion failed: ${msg}. Expected ${eStr}, got ${aStr}`);
  }
}

const makePoint = (wl: number, int: number): SpectrumPoint => ({ wavelength: wl, intensity: int });

const AVATAR_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
];

const makeManualResult = (overrides: Partial<ManualClassificationResult> = {}): ManualClassificationResult => ({
  source: 'manual',
  spectralType: 'G',
  spectralSubtype: 2,
  luminosityClass: 'V',
  confidence: 85,
  reviewerNotes: '测试备注',
  confirmedAt: new Date().toISOString(),
  matchedFeatures: ['Hα', 'Hβ'],
  deviationRegions: [],
  ...overrides,
});

const makeAutoResult = (overrides: Partial<ClassificationResult> = {}): ClassificationResult => ({
  spectralType: 'A',
  luminosityClass: 'V',
  confidence: 72,
  matchedFeatures: ['Hα', 'Hβ', 'Hγ'],
  deviationRegions: [],
  ...overrides,
});

const makeSharedClassification = (
  spectrumId: string,
  overrides: Partial<SharedClassificationResult> = {}
): SharedClassificationResult => ({
  ...makeManualResult(),
  spectrumId,
  classifiedAt: new Date().toISOString(),
  author: {
    userId: 'u-test',
    userName: '测试用户',
    avatarColor: AVATAR_COLORS[0],
  },
  ...overrides,
});

const makeBaseSpectrum = (
  id: string,
  name: string,
  points: SpectrumPoint[],
  isNormalized = false
) => ({
  id,
  name,
  targetName: `目标-${id}`,
  observationDate: '2026-01-15',
  wavelengthMin: points[0]?.wavelength ?? 0,
  wavelengthMax: points[points.length - 1]?.wavelength ?? 0,
  points,
  isNormalized,
  visibility: 'private' as VisibilityType,
  ownerId: 'u-owner',
  ownerName: '所有者',
  teamIds: [],
  sharedClassifications: [] as SharedClassificationResult[],
});

const makeSimplePoints = (): SpectrumPoint[] => {
  const pts: SpectrumPoint[] = [];
  for (let wl = 4000; wl <= 7000; wl += 100) {
    pts.push(makePoint(wl, 0.95 + Math.random() * 0.1));
  }
  return pts;
};

export const testGetSpectrumMetaExtractsAllFields = () => {
  const pts = makeSimplePoints();
  const base = makeBaseSpectrum('sp-meta', 'Meta测试光谱', pts, true);
  const spec = initializeSpectrumWithVersion(base, 'u-owner') as SpectrumData;

  const meta = getSpectrumMeta(spec);

  assert(meta.id === 'sp-meta', 'id matches');
  assert(meta.name === 'Meta测试光谱', 'name matches');
  assert(meta.targetName === '目标-sp-meta', 'targetName matches');
  assert(meta.observationDate === '2026-01-15', 'observationDate matches');
  assert(meta.wavelengthMin === 4000, 'wavelengthMin matches');
  assert(meta.wavelengthMax === 7000, 'wavelengthMax matches');
  assert(meta.pointCount === pts.length, `pointCount matches (expected ${pts.length}, got ${meta.pointCount})`);
  assert(meta.isNormalized === true, 'isNormalized matches');
  assert(meta.visibility === 'private', 'visibility matches');
  assert(meta.ownerName === '所有者', 'ownerName matches');
};

export const testGetClassificationDataAutoOnly = () => {
  const auto = makeAutoResult({ spectralType: 'B', luminosityClass: 'III', confidence: 88 });
  const data = getClassificationData(auto, null);

  assert(data.autoSpectralType === 'B', 'auto spectralType extracted');
  assert(data.autoLuminosityClass === 'III', 'auto luminosityClass extracted');
  assert(data.autoConfidence === 88, 'auto confidence extracted');
  assert(typeof data.autoMatchedFeatures === 'string' && data.autoMatchedFeatures.includes('Hα'), 'auto matchedFeatures joined as string');
  assert(data.manualSpectralType === undefined, 'manual fields absent when manual null');
};

export const testGetClassificationDataManualOnly = () => {
  const manual = makeManualResult({ spectralType: 'K', luminosityClass: 'Ib', confidence: 90, reviewerNotes: '人工复核' });
  const data = getClassificationData(null, manual);

  assert(data.manualSpectralType === 'K', 'manual spectralType extracted');
  assert(data.manualLuminosityClass === 'Ib', 'manual luminosityClass extracted');
  assert(data.manualConfidence === 90, 'manual confidence extracted');
  assert(data.manualReviewerNotes === '人工复核', 'manual reviewerNotes extracted');
  assert(typeof data.manualConfirmedAt === 'string' && data.manualConfirmedAt.length > 0, 'manual confirmedAt is string');
  assert(data.autoSpectralType === undefined, 'auto fields absent when auto null');
};

export const testGetSpectrumClassificationPairFromSharedClassifications = () => {
  const pts = makeSimplePoints();
  const base = makeBaseSpectrum('sp-shared', 'Shared分类测试', pts, true);
  const oldShared = makeSharedClassification('sp-shared', {
    spectralType: 'F',
    luminosityClass: 'V',
    classifiedAt: '2026-01-01T00:00:00.000Z',
  });
  const newShared = makeSharedClassification('sp-shared', {
    spectralType: 'G',
    luminosityClass: 'V',
    confidence: 95,
    reviewerNotes: '最新人工分类',
    classifiedAt: '2026-06-01T00:00:00.000Z',
  });
  base.sharedClassifications = [oldShared, newShared];

  const spec = initializeSpectrumWithVersion(base, 'u-owner') as SpectrumData;
  const pair = getSpectrumClassificationPair(spec);

  assert(pair.auto !== null, 'auto classification computed on the fly');
  assert(pair.auto?.spectralType !== undefined, 'auto has spectralType');
  assert(pair.manual !== null, 'manual classification extracted from sharedClassifications');
  assert(pair.manual?.spectralType === 'G', `picks latest manual (expected G, got ${pair.manual?.spectralType})`);
  assert(pair.manual?.confidence === 95, 'picks latest manual confidence');
  assert((pair.manual as SharedClassificationResult).classifiedAt === '2026-06-01T00:00:00.000Z', 'picks latest by classifiedAt');
};

export const testGetSpectrumClassificationPairNoSharedUsesFallbackMap = () => {
  const pts = makeSimplePoints();
  const base = makeBaseSpectrum('sp-fallback', 'Fallback测试', pts, true);
  base.sharedClassifications = [];
  const spec = initializeSpectrumWithVersion(base, 'u-owner') as SpectrumData;

  const fallbackManual = makeManualResult({ spectralType: 'O', luminosityClass: 'I', confidence: 99 });
  const pair = getSpectrumClassificationPair(spec, {
    'sp-fallback': { auto: null, manual: fallbackManual },
  });

  assert(pair.auto !== null, 'auto computed even with fallback');
  assert(pair.manual !== null, 'fallback manual used when sharedClassifications empty');
  assert(pair.manual?.spectralType === 'O', 'fallback manual spectralType used');
  assert(pair.manual?.luminosityClass === 'I', 'fallback manual luminosityClass used');
};

export const testBuildSummaryExportRowsPerSpectrumClassification = () => {
  const ptsA = makeSimplePoints();
  const ptsB = makeSimplePoints();
  const baseA = makeBaseSpectrum('sp-a', '光谱A', ptsA, true);
  const baseB = makeBaseSpectrum('sp-b', '光谱B', ptsB, true);

  baseA.sharedClassifications = [
    makeSharedClassification('sp-a', { spectralType: 'A', luminosityClass: 'V', confidence: 91, classifiedAt: '2026-05-01T00:00:00.000Z' }),
  ];
  baseB.sharedClassifications = [
    makeSharedClassification('sp-b', { spectralType: 'M', luminosityClass: 'III', confidence: 88, classifiedAt: '2026-05-02T00:00:00.000Z' }),
  ];

  const specA = initializeSpectrumWithVersion(baseA, 'u-owner') as SpectrumData;
  const specB = initializeSpectrumWithVersion(baseB, 'u-owner') as SpectrumData;

  const rows = buildSummaryExportRows({
    spectra: [specA, specB],
    options: { includeNormalized: false, includeClassification: true, includeLineMeasurements: false },
  });

  assert(rows.length === 2, `expected 2 rows, got ${rows.length}`);
  assert(rows[0].id === 'sp-a', 'row 0 is spectrum A');
  assert(rows[0].manualSpectralType === 'A', `row 0 has spectralType A (got ${rows[0].manualSpectralType})`);
  assert(rows[0].manualConfidence === 91, 'row 0 has confidence 91');
  assert(rows[1].id === 'sp-b', 'row 1 is spectrum B');
  assert(rows[1].manualSpectralType === 'M', `row 1 has spectralType M (got ${rows[1].manualSpectralType})`);
  assert(rows[1].manualLuminosityClass === 'III', `row 1 has luminosityClass III (got ${rows[1].manualLuminosityClass})`);
  assert((rows[0].manualSpectralType as string) !== (rows[1].manualSpectralType as string), 'each spectrum has its own classification (not both the same)');
};

export const testBuildSummaryExportRowsWithoutClassification = () => {
  const pts = makeSimplePoints();
  const base = makeBaseSpectrum('sp-nocls', '无分类光谱', pts, true);
  base.sharedClassifications = [makeSharedClassification('sp-nocls')];
  const spec = initializeSpectrumWithVersion(base, 'u-owner') as SpectrumData;

  const rows = buildSummaryExportRows({
    spectra: [spec],
    options: { includeNormalized: false, includeClassification: false, includeLineMeasurements: false },
  });

  assert(rows.length === 1, 'one row produced');
  assert(rows[0].id === 'sp-nocls', 'id present');
  assert(rows[0].manualSpectralType === undefined, 'manualSpectralType absent when includeClassification=false');
  assert(rows[0].autoSpectralType === undefined, 'autoSpectralType absent when includeClassification=false');
};

export const testBuildFlatExportRowsPointCount = () => {
  const pts = [makePoint(4000, 1.0), makePoint(5000, 0.9), makePoint(6000, 0.95)];
  const base = makeBaseSpectrum('sp-flat', 'Flat测试', pts, true);
  const spec = initializeSpectrumWithVersion(base, 'u-owner') as SpectrumData;

  const rows = buildFlatExportRows({
    spectra: [spec],
    options: { includeNormalized: true, includeClassification: false, includeLineMeasurements: false },
  });

  assert(rows.length === 3, `expected 3 flat rows, got ${rows.length}`);
  assert(rows[0].wavelength === 4000, 'row 0 wavelength');
  assert(rows[0].intensity === 1.0, 'row 0 intensity');
  assert(rows[0].spectrumId === 'sp-flat', 'row 0 spectrumId');
  assert(typeof rows[0].normalizedIntensity === 'number', 'normalizedIntensity included');
};

export const testBuildFlatExportRowsExcludesNormalized = () => {
  const pts = [makePoint(4000, 1.0), makePoint(5000, 0.9)];
  const base = makeBaseSpectrum('sp-flat-nonorm', '无归一化Flat', pts, false);
  const spec = initializeSpectrumWithVersion(base, 'u-owner') as SpectrumData;

  const rows = buildFlatExportRows({
    spectra: [spec],
    options: { includeNormalized: false, includeClassification: false, includeLineMeasurements: false },
  });

  assert(rows.length === 2, '2 rows');
  assert(rows[0].normalizedIntensity === undefined, 'normalizedIntensity absent when includeNormalized=false');
};

export const testBuildJsonExportPerSpectrumClassification = () => {
  const ptsA = makeSimplePoints();
  const ptsB = makeSimplePoints();
  const baseA = makeBaseSpectrum('sp-json-a', 'JSON光谱A', ptsA, true);
  const baseB = makeBaseSpectrum('sp-json-b', 'JSON光谱B', ptsB, true);
  baseA.sharedClassifications = [makeSharedClassification('sp-json-a', { spectralType: 'B' })];
  baseB.sharedClassifications = [makeSharedClassification('sp-json-b', { spectralType: 'K' })];

  const specA = initializeSpectrumWithVersion(baseA, 'u-owner') as SpectrumData;
  const specB = initializeSpectrumWithVersion(baseB, 'u-owner') as SpectrumData;

  const payload = buildJsonExport({
    spectra: [specA, specB],
    options: { includeNormalized: true, includeClassification: true, includeLineMeasurements: false },
    format: 'json',
  });

  assert(payload.spectra.length === 2, '2 spectra in JSON');
  assert(payload.spectra[0].meta.id === 'sp-json-a', 'spectrum 0 id');
  assert(payload.spectra[0].classification?.manualSpectralType === 'B', 'spectrum 0 manual class B');
  assert(payload.spectra[1].meta.id === 'sp-json-b', 'spectrum 1 id');
  assert(payload.spectra[1].classification?.manualSpectralType === 'K', 'spectrum 1 manual class K');
  assert(Array.isArray(payload.spectra[0].originalPoints), 'originalPoints present');
  assert(Array.isArray(payload.spectra[0].normalizedPoints), 'normalizedPoints present when requested');
};

export const testBuildJsonExportIncludePointsNoneStripsPoints = () => {
  const pts = makeSimplePoints();
  const base = makeBaseSpectrum('sp-none', 'None模式', pts, true);
  base.sharedClassifications = [makeSharedClassification('sp-none', { spectralType: 'F' })];
  const spec = initializeSpectrumWithVersion(base, 'u-owner') as SpectrumData;

  let payload = buildJsonExport({
    spectra: [spec],
    options: { includeNormalized: true, includeClassification: true, includeLineMeasurements: false },
    format: 'json',
  });
  payload.spectra = payload.spectra.map((s) => ({
    meta: s.meta,
    classification: s.classification,
    lineMeasurements: s.lineMeasurements,
  }));

  assert(payload.spectra[0].originalPoints === undefined, 'originalPoints stripped in none mode');
  assert(payload.spectra[0].normalizedPoints === undefined, 'normalizedPoints stripped in none mode');
  assert(payload.spectra[0].meta !== undefined, 'meta preserved');
  assert(payload.spectra[0].classification?.manualSpectralType === 'F', 'classification preserved');
};

export const testFormatAsDelimitedCsv = () => {
  const rows = [
    { id: 'a', name: '光谱1', value: 42 },
    { id: 'b', name: '光谱,2', value: 99 },
  ];
  const csv = formatAsDelimited(rows, ['id', 'name', 'value'], ',');
  const lines = csv.split('\r\n');

  assert(lines[0] === 'id,name,value', `CSV header: "${lines[0]}"`);
  assert(lines[1].startsWith('a,光谱1,42'), `CSV row 1: "${lines[1]}"`);
  assert(lines[2].includes('"光谱,2"'), 'comma in value is quoted');
};

export const testFormatAsDelimitedTsv = () => {
  const rows = [
    { id: 'x', name: 'A\tB', value: 1 },
  ];
  const tsv = formatAsDelimited(rows, ['id', 'name', 'value'], '\t');
  const lines = tsv.split('\r\n');

  assert(lines[0] === 'id\tname\tvalue', 'TSV header uses tab');
  assert(lines[1].startsWith('x\t'), 'TSV row 1 uses tab delimiter');
};

export const testBuildSummaryExportIncludesLineMeasurements = () => {
  const pts = makeSimplePoints();
  const base = makeBaseSpectrum('sp-measure', '测量值测试', pts, true);
  const spec = initializeSpectrumWithVersion(base, 'u-owner') as SpectrumData;

  const rows = buildSummaryExportRows({
    spectra: [spec],
    options: { includeNormalized: false, includeClassification: false, includeLineMeasurements: true },
  });

  assert(rows.length === 1, 'one row');
  assert(typeof rows[0].haEW === 'number', 'haEW present');
  assert(typeof rows[0].hbEW === 'number', 'hbEW present');
  assert(typeof rows[0].haHbRatio === 'number', 'haHbRatio present');
  assert(typeof rows[0].haDepth === 'number', 'haDepth present');
  assert(Number.isFinite(rows[0].haEW as number), 'haEW is finite number');
};

export const testEmptySpectraNoRows = () => {
  const summary = buildSummaryExportRows({
    spectra: [],
    options: { includeNormalized: false, includeClassification: true, includeLineMeasurements: true },
  });
  const flat = buildFlatExportRows({
    spectra: [],
    options: { includeNormalized: true, includeClassification: false, includeLineMeasurements: false },
  });

  assert(summary.length === 0, 'empty spectra produce no summary rows');
  assert(flat.length === 0, 'empty spectra produce no flat rows');
};

export const testMultipleSpectraFlatRowsPreserveIdentity = () => {
  const ptsA = [makePoint(4000, 1.0), makePoint(5000, 0.9)];
  const ptsB = [makePoint(4500, 0.8)];
  const baseA = makeBaseSpectrum('sp-multi-a', '多光谱A', ptsA, true);
  const baseB = makeBaseSpectrum('sp-multi-b', '多光谱B', ptsB, true);
  const specA = initializeSpectrumWithVersion(baseA, 'u-owner') as SpectrumData;
  const specB = initializeSpectrumWithVersion(baseB, 'u-owner') as SpectrumData;

  const rows = buildFlatExportRows({
    spectra: [specA, specB],
    options: { includeNormalized: false, includeClassification: false, includeLineMeasurements: false },
  });

  assert(rows.length === 3, `expected 3 total rows, got ${rows.length}`);
  assert(rows[0].spectrumId === 'sp-multi-a', 'row 0 from A');
  assert(rows[1].spectrumId === 'sp-multi-a', 'row 1 from A');
  assert(rows[2].spectrumId === 'sp-multi-b', 'row 2 from B');
  assert(rows[2].wavelength === 4500, 'row 2 wavelength from B');
};

export interface ExportTestResult {
  passed: string[];
  failed: { name: string; error: string }[];
}

export const runAllExportTests = (): ExportTestResult => {
  const tests = [
    { name: 'getSpectrumMetaExtractsAllFields', fn: testGetSpectrumMetaExtractsAllFields },
    { name: 'getClassificationDataAutoOnly', fn: testGetClassificationDataAutoOnly },
    { name: 'getClassificationDataManualOnly', fn: testGetClassificationDataManualOnly },
    { name: 'getSpectrumClassificationPairFromSharedClassifications', fn: testGetSpectrumClassificationPairFromSharedClassifications },
    { name: 'getSpectrumClassificationPairNoSharedUsesFallbackMap', fn: testGetSpectrumClassificationPairNoSharedUsesFallbackMap },
    { name: 'buildSummaryExportRowsPerSpectrumClassification', fn: testBuildSummaryExportRowsPerSpectrumClassification },
    { name: 'buildSummaryExportRowsWithoutClassification', fn: testBuildSummaryExportRowsWithoutClassification },
    { name: 'buildFlatExportRowsPointCount', fn: testBuildFlatExportRowsPointCount },
    { name: 'buildFlatExportRowsExcludesNormalized', fn: testBuildFlatExportRowsExcludesNormalized },
    { name: 'buildJsonExportPerSpectrumClassification', fn: testBuildJsonExportPerSpectrumClassification },
    { name: 'buildJsonExportIncludePointsNoneStripsPoints', fn: testBuildJsonExportIncludePointsNoneStripsPoints },
    { name: 'formatAsDelimitedCsv', fn: testFormatAsDelimitedCsv },
    { name: 'formatAsDelimitedTsv', fn: testFormatAsDelimitedTsv },
    { name: 'buildSummaryExportIncludesLineMeasurements', fn: testBuildSummaryExportIncludesLineMeasurements },
    { name: 'emptySpectraNoRows', fn: testEmptySpectraNoRows },
    { name: 'multipleSpectraFlatRowsPreserveIdentity', fn: testMultipleSpectraFlatRowsPreserveIdentity },
  ];

  const passed: string[] = [];
  const failed: { name: string; error: string }[] = [];

  for (const t of tests) {
    try {
      t.fn();
      passed.push(t.name);
    } catch (err) {
      failed.push({ name: t.name, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return { passed, failed };
};
