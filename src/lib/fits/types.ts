export interface FitsHeaderCard {
  keyword: string;
  value: string | number | boolean | null;
  comment?: string;
}

export interface FitsHeader {
  cards: FitsHeaderCard[];
  get: (keyword: string) => string | number | boolean | null;
  has: (keyword: string) => boolean;
  getAll: () => FitsHeaderCard[];
}

export type FitsDataType =
  | 'IMAGE'
  | 'BINTABLE'
  | 'TABLE'
  | 'UNKNOWN';

export interface FitsImageData {
  type: 'IMAGE';
  bitpix: number;
  naxis: number;
  naxes: number[];
  data: Float64Array;
  bscale: number;
  bzero: number;
}

export interface FitsTableColumn {
  name: string;
  format: string;
  unit?: string;
  data: unknown[];
}

export interface FitsBinaryTableData {
  type: 'BINTABLE';
  columns: FitsTableColumn[];
  nrows: number;
  ncols: number;
}

export interface FitsAsciiTableData {
  type: 'TABLE';
  columns: FitsTableColumn[];
  nrows: number;
  ncols: number;
}

export type FitsDataUnit =
  | FitsImageData
  | FitsBinaryTableData
  | FitsAsciiTableData
  | null;

export interface FitsHDU {
  header: FitsHeader;
  data: FitsDataUnit;
  dataType: FitsDataType;
}

export interface FitsObservationMetadata {
  targetName: string;
  observationDate: string;
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
  rawHeaders: Record<string, string | number | boolean | null>;
}

export interface FitsSpectrumData {
  points: { wavelength: number; intensity: number }[];
  metadata: FitsObservationMetadata;
}
