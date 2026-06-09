import Papa from 'papaparse';
import type {
  SpectrumData,
  SpectrumPoint,
  ClassificationResult,
  ManualClassificationResult,
  SharedClassificationResult,
} from '@/types';
import {
  normalizeSpectrumSigmaClipping,
  measureEquivalentWidth,
  computeLineRatios,
  classifySpectrum,
  WAVELENGTHS,
} from '@/lib/spectralAnalysis';
import { SPECTRAL_LINES } from '@/data/astronomy';

export type ExportFormat = 'csv' | 'json' | 'tsv';

export interface ExportOptions {
  includeNormalized: boolean;
  includeClassification: boolean;
  includeLineMeasurements: boolean;
}

export interface SpectrumExportMeta {
  id: string;
  name: string;
  targetName: string;
  observationDate: string;
  wavelengthMin: number;
  wavelengthMax: number;
  pointCount: number;
  isNormalized: boolean;
  visibility: string;
  ownerName: string;
}

export interface ClassificationExportData {
  autoSpectralType?: string;
  autoLuminosityClass?: string;
  autoConfidence?: number;
  autoMatchedFeatures?: string;
  manualSpectralType?: string;
  manualLuminosityClass?: string;
  manualConfidence?: number;
  manualReviewerNotes?: string;
  manualConfirmedAt?: string;
}

export interface LineMeasurementExportData {
  haEW: number;
  hbEW: number;
  hgEW: number;
  hdEW: number;
  heI4471EW: number;
  heII4686EW: number;
  caII_KEW: number;
  caII_HEW: number;
  naI_D1EW: number;
  naI_D2EW: number;
  mgI_b1EW: number;
  mgI_b2EW: number;
  siII6347EW: number;
  haHbRatio: number;
  heIIHeIRatio: number;
  heIHbRatio: number;
  caIIKHgammaRatio: number;
  naIDDhbRatio: number;
  haDepth: number;
  hbDepth: number;
  hgDepth: number;
  heI4471Depth: number;
  heII4686Depth: number;
  caII_KDepth: number;
  naI_DDepth: number;
  mgI_bDepth: number;
  siII6347Depth: number;
}

export interface FlatExportRow {
  spectrumId: string;
  spectrumName: string;
  targetName: string;
  observationDate: string;
  wavelength: number;
  intensity: number;
  normalizedIntensity?: number;
}

const getLineWavelength = (label: string): number => {
  const line = SPECTRAL_LINES.find((l) => l.label === label);
  return line?.wavelength ?? 0;
};

const exportMetaFields: (keyof SpectrumExportMeta)[] = [
  'id',
  'name',
  'targetName',
  'observationDate',
  'wavelengthMin',
  'wavelengthMax',
  'pointCount',
  'isNormalized',
  'visibility',
  'ownerName',
];

const classificationFields: (keyof ClassificationExportData)[] = [
  'autoSpectralType',
  'autoLuminosityClass',
  'autoConfidence',
  'autoMatchedFeatures',
  'manualSpectralType',
  'manualLuminosityClass',
  'manualConfidence',
  'manualReviewerNotes',
  'manualConfirmedAt',
];

const lineMeasurementFields: (keyof LineMeasurementExportData)[] = [
  'haEW',
  'hbEW',
  'hgEW',
  'hdEW',
  'heI4471EW',
  'heII4686EW',
  'caII_KEW',
  'caII_HEW',
  'naI_D1EW',
  'naI_D2EW',
  'mgI_b1EW',
  'mgI_b2EW',
  'siII6347EW',
  'haHbRatio',
  'heIIHeIRatio',
  'heIHbRatio',
  'caIIKHgammaRatio',
  'naIDDhbRatio',
  'haDepth',
  'hbDepth',
  'hgDepth',
  'heI4471Depth',
  'heII4686Depth',
  'caII_KDepth',
  'naI_DDepth',
  'mgI_bDepth',
  'siII6347Depth',
];

export const getSpectrumMeta = (s: SpectrumData): SpectrumExportMeta => ({
  id: s.id,
  name: s.name,
  targetName: s.targetName,
  observationDate: s.observationDate,
  wavelengthMin: s.wavelengthMin,
  wavelengthMax: s.wavelengthMax,
  pointCount: s.points.length,
  isNormalized: s.isNormalized,
  visibility: s.visibility,
  ownerName: s.ownerName,
});

export const getClassificationData = (
  autoResult: ClassificationResult | null,
  manualResult: ManualClassificationResult | SharedClassificationResult | null
): ClassificationExportData => {
  const data: ClassificationExportData = {};
  if (autoResult) {
    data.autoSpectralType = autoResult.spectralType;
    data.autoLuminosityClass = autoResult.luminosityClass;
    data.autoConfidence = autoResult.confidence;
    data.autoMatchedFeatures = autoResult.matchedFeatures.join('; ');
  }
  if (manualResult) {
    data.manualSpectralType = manualResult.spectralType;
    data.manualLuminosityClass = manualResult.luminosityClass;
    data.manualConfidence = manualResult.confidence;
    data.manualReviewerNotes = manualResult.reviewerNotes;
    data.manualConfirmedAt = manualResult.confirmedAt;
  }
  return data;
};

export interface ClassificationPair {
  auto: ClassificationResult | null;
  manual: ManualClassificationResult | SharedClassificationResult | null;
}

export const getSpectrumClassificationPair = (
  spectrum: SpectrumData,
  fallbackMap?: Record<string, ClassificationPair>
): ClassificationPair => {
  const normalizedPoints = ensureNormalized(spectrum);
  let auto: ClassificationResult | null = null;
  try {
    auto = classifySpectrum(normalizedPoints);
  } catch {
    auto = null;
  }

  let manual: ManualClassificationResult | SharedClassificationResult | null = null;
  if (spectrum.sharedClassifications && spectrum.sharedClassifications.length > 0) {
    const sorted = [...spectrum.sharedClassifications].sort(
      (a, b) => new Date(b.classifiedAt).getTime() - new Date(a.classifiedAt).getTime()
    );
    manual = sorted[0];
  }
  if (!manual && fallbackMap && fallbackMap[spectrum.id]) {
    manual = fallbackMap[spectrum.id].manual;
    if (!auto && fallbackMap[spectrum.id].auto) {
      auto = fallbackMap[spectrum.id].auto;
    }
  }

  return { auto, manual };
};

export const getLineMeasurements = (
  points: SpectrumPoint[]
): LineMeasurementExportData => {
  const ratios = computeLineRatios(points);
  return {
    haEW: measureEquivalentWidth(points, WAVELENGTHS.H_ALPHA),
    hbEW: measureEquivalentWidth(points, WAVELENGTHS.H_BETA),
    hgEW: measureEquivalentWidth(points, WAVELENGTHS.H_GAMMA),
    hdEW: measureEquivalentWidth(points, WAVELENGTHS.H_DELTA),
    heI4471EW: measureEquivalentWidth(points, WAVELENGTHS.HE_I_4471),
    heII4686EW: measureEquivalentWidth(points, WAVELENGTHS.HE_II_4686),
    caII_KEW: measureEquivalentWidth(points, WAVELENGTHS.CA_II_K),
    caII_HEW: measureEquivalentWidth(points, WAVELENGTHS.CA_II_H),
    naI_D1EW: measureEquivalentWidth(points, WAVELENGTHS.NA_I_D1),
    naI_D2EW: measureEquivalentWidth(points, WAVELENGTHS.NA_I_D2),
    mgI_b1EW: measureEquivalentWidth(points, WAVELENGTHS.MG_I_B1),
    mgI_b2EW: measureEquivalentWidth(points, WAVELENGTHS.MG_I_B2),
    siII6347EW: measureEquivalentWidth(points, WAVELENGTHS.SI_II_6347),
    haHbRatio: ratios['Hα/Hβ'],
    heIIHeIRatio: ratios['HeII4686/HeI4471'],
    heIHbRatio: ratios['HeI4471/Hβ'],
    caIIKHgammaRatio: ratios['CaII_K/Hγ'],
    naIDDhbRatio: ratios['NaI_D/Hβ'],
    haDepth: ratios['Hα_depth'],
    hbDepth: ratios['Hβ_depth'],
    hgDepth: ratios['Hγ_depth'],
    heI4471Depth: ratios['HeI4471_depth'],
    heII4686Depth: ratios['HeII4686_depth'],
    caII_KDepth: ratios['CaII_K_depth'],
    naI_DDepth: ratios['NaI_D_depth'],
    mgI_bDepth: ratios['MgI_b_depth'],
    siII6347Depth: ratios['SiII6347_depth'],
  };
};

const ensureNormalized = (s: SpectrumData): SpectrumPoint[] => {
  if (s.isNormalized) return s.points;
  return normalizeSpectrumSigmaClipping(s.points);
};

export interface BuildFlatRowsOptions {
  spectra: SpectrumData[];
  options: ExportOptions;
  classificationMap?: Record<string, ClassificationPair>;
}

export const buildFlatExportRows = ({
  spectra,
  options,
  classificationMap,
}: BuildFlatRowsOptions): FlatExportRow[] => {
  const rows: FlatExportRow[] = [];

  for (const s of spectra) {
    const normalizedPoints = options.includeNormalized ? ensureNormalized(s) : null;

    for (let i = 0; i < s.points.length; i++) {
      const row: FlatExportRow = {
        spectrumId: s.id,
        spectrumName: s.name,
        targetName: s.targetName,
        observationDate: s.observationDate,
        wavelength: s.points[i].wavelength,
        intensity: s.points[i].intensity,
      };
      if (normalizedPoints && normalizedPoints[i]) {
        row.normalizedIntensity = normalizedPoints[i].intensity;
      }
      rows.push(row);
    }
  }

  return rows;
};

export interface SpectrumSummaryRow extends SpectrumExportMeta {
  classification?: ClassificationExportData;
  measurements?: LineMeasurementExportData;
}

export const buildSummaryExportRows = ({
  spectra,
  options,
  classificationMap,
}: BuildFlatRowsOptions): Record<string, unknown>[] => {
  const rows: Record<string, unknown>[] = [];

  for (const s of spectra) {
    const meta = getSpectrumMeta(s);
    const row: Record<string, unknown> = {};

    for (const f of exportMetaFields) {
      row[f] = meta[f];
    }

    if (options.includeClassification) {
      const pair = getSpectrumClassificationPair(s, classificationMap);
      const clsData = getClassificationData(pair.auto, pair.manual);
      for (const f of classificationFields) {
        row[f] = clsData[f];
      }
    }

    if (options.includeLineMeasurements) {
      const measurements = getLineMeasurements(s.points);
      for (const f of lineMeasurementFields) {
        row[f] = measurements[f];
      }
    }

    rows.push(row);
  }

  return rows;
};

export interface JsonExportPayload {
  exportMetadata: {
    exportedAt: string;
    format: ExportFormat;
    options: ExportOptions;
    spectrumCount: number;
  };
  spectra: {
    meta: SpectrumExportMeta;
    originalPoints?: SpectrumPoint[];
    normalizedPoints?: SpectrumPoint[];
    classification?: ClassificationExportData;
    lineMeasurements?: LineMeasurementExportData;
  }[];
}

export const buildJsonExport = ({
  spectra,
  options,
  format,
  classificationMap,
}: BuildFlatRowsOptions & { format: ExportFormat }): JsonExportPayload => {
  return {
    exportMetadata: {
      exportedAt: new Date().toISOString(),
      format,
      options,
      spectrumCount: spectra.length,
    },
    spectra: spectra.map((s) => {
      const entry: JsonExportPayload['spectra'][number] = {
        meta: getSpectrumMeta(s),
        originalPoints: s.points,
      };
      if (options.includeNormalized) {
        entry.normalizedPoints = ensureNormalized(s);
      }
      if (options.includeClassification) {
        const pair = getSpectrumClassificationPair(s, classificationMap);
        entry.classification = getClassificationData(pair.auto, pair.manual);
      }
      if (options.includeLineMeasurements) {
        entry.lineMeasurements = getLineMeasurements(s.points);
      }
      return entry;
    }),
  };
};

const buildSummaryCsvHeader = (options: ExportOptions): string[] => {
  const headers: string[] = [...exportMetaFields];
  if (options.includeClassification) {
    headers.push(...classificationFields);
  }
  if (options.includeLineMeasurements) {
    headers.push(...lineMeasurementFields);
  }
  return headers;
};

const buildFlatCsvHeader = (options: ExportOptions): string[] => {
  const headers = [
    'spectrumId',
    'spectrumName',
    'targetName',
    'observationDate',
    'wavelength',
    'intensity',
  ];
  if (options.includeNormalized) {
    headers.push('normalizedIntensity');
  }
  return headers;
};

export const formatAsDelimited = (
  rows: Record<string, unknown>[],
  headers: string[],
  delimiter: ',' | '\t'
): string => {
  return Papa.unparse(rows, {
    columns: headers,
    delimiter,
    newline: '\r\n',
    skipEmptyLines: true,
  });
};

export const triggerBrowserDownload = (
  content: string | Blob,
  filename: string,
  mimeType: string
) => {
  const blob = typeof content === 'string' ? new Blob([content], { type: mimeType }) : content;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const generateFilename = (base: string, format: ExportFormat): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const ext = format === 'tsv' ? 'tsv' : format;
  return `${base}_${timestamp}.${ext}`;
};

export interface ExecuteExportParams {
  spectra: SpectrumData[];
  format: ExportFormat;
  options: ExportOptions;
  classificationMap?: Record<string, ClassificationPair>;
  includePoints?: 'flat' | 'summary' | 'none';
}

export const executeExport = ({
  spectra,
  format,
  options,
  classificationMap,
  includePoints = 'summary',
}: ExecuteExportParams) => {
  if (spectra.length === 0) return;

  if (format === 'json') {
    const payload = buildJsonExport({ spectra, options, format, classificationMap });
    if (includePoints === 'none') {
      payload.spectra = payload.spectra.map((s) => ({
        meta: s.meta,
        classification: s.classification,
        lineMeasurements: s.lineMeasurements,
      }));
      console.warn('[exportUtils] includePoints="none" 模式：已排除所有采样点数据，仅保留元数据、分类结果和谱线测量值');
    }
    const content = JSON.stringify(payload, null, 2);
    triggerBrowserDownload(
      content,
      generateFilename('spectra_export', 'json'),
      'application/json;charset=utf-8'
    );
    return;
  }

  const delimiter: ',' | '\t' = format === 'tsv' ? '\t' : ',';
  const mime = format === 'tsv' ? 'text/tab-separated-values;charset=utf-8' : 'text/csv;charset=utf-8';

  if (includePoints === 'flat') {
    const flatRows = buildFlatExportRows({ spectra, options, classificationMap }).map((r) => {
      const row: Record<string, unknown> = { ...r };
      if (!options.includeNormalized) delete row.normalizedIntensity;
      return row;
    });
    const headers = buildFlatCsvHeader(options);
    const content = formatAsDelimited(flatRows, headers, delimiter);
    triggerBrowserDownload(content, generateFilename('spectra_points', format), mime);
    return;
  }

  if (includePoints === 'none') {
    console.warn('[exportUtils] includePoints="none" 模式：CSV/TSV 下等价于摘要模式（无采样点行），仅输出元数据、分类结果和谱线测量值');
  }

  const summaryRows = buildSummaryExportRows({ spectra, options, classificationMap });
  const headers = buildSummaryCsvHeader(options);
  const content = formatAsDelimited(summaryRows, headers, delimiter);
  triggerBrowserDownload(content, generateFilename('spectra_summary', format), mime);
};

export { exportMetaFields, classificationFields, lineMeasurementFields, getLineWavelength };
