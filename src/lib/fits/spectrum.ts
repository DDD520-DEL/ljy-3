import type {
  FitsHDU,
  FitsImageData,
  FitsBinaryTableData,
  FitsHeader,
  FitsSpectrumData,
} from './types';
import { extractObservationMetadata } from './metadata';

function findWavelengthColumn(colNames: string[]): string | null {
  const patterns = [
    /^(wav|wave|wavelength|lambda|angstrom|wl|freq|frequency|vac|vacuum|air|wavel)$/i,
    /(wav|wave|length|lambda|angstrom|wl)/i,
  ];
  for (const pattern of patterns) {
    const found = colNames.find((n) => pattern.test(n));
    if (found) return found;
  }
  return null;
}

function findFluxColumn(colNames: string[]): string | null {
  const patterns = [
    /^(flux|intensity|count|counts|value|data|spec|spectrum|flambda|fnu|rel|relative)$/i,
    /(flux|intensity|count|counts|flam|fn|data|signal)/i,
  ];
  for (const pattern of patterns) {
    const found = colNames.find((n) => pattern.test(n));
    if (found) return found;
  }
  return null;
}

function extractSpectrumFromImage(
  image: FitsImageData,
  header: FitsHeader
): { wavelength: number[]; intensity: number[] } | null {
  if (image.naxis < 1) return null;

  let data: number[];
  if (image.naxis === 1) {
    data = Array.from(image.data);
  } else if (image.naxis === 2) {
    const naxis1 = image.naxes[0];
    const naxis2 = image.naxes[1];
    if (naxis2 === 1) {
      data = Array.from(image.data);
    } else {
      const midRow = Math.floor(naxis2 / 2);
      data = [];
      for (let i = 0; i < naxis1; i++) {
        data.push(image.data[midRow * naxis1 + i]);
      }
    }
  } else if (image.naxis === 3) {
    const naxis1 = image.naxes[0];
    const naxis2 = image.naxes[1];
    const midRow = Math.floor(naxis2 / 2);
    const firstPlane = 0;
    const planeSize = naxis1 * naxis2;
    data = [];
    for (let i = 0; i < naxis1; i++) {
      data.push(image.data[firstPlane * planeSize + midRow * naxis1 + i]);
    }
  } else {
    return null;
  }

  const npix = data.length;
  const crpix1 = (header.get('CRPIX1') as number) ?? 1;
  const crval1 = (header.get('CRVAL1') as number) ?? 0;
  const cdelt1 = (header.get('CDELT1') as number) ?? (header.get('CD1_1') as number) ?? 1;
  const ctype1 = (header.get('CTYPE1') as string) ?? '';

  const wavelengths: number[] = [];
  for (let i = 0; i < npix; i++) {
    const pixel = i + 1;
    const wl = crval1 + (pixel - crpix1) * cdelt1;
    wavelengths.push(wl);
  }

  if (ctype1 && ctype1.toUpperCase().includes('LOG')) {
    for (let i = 0; i < wavelengths.length; i++) {
      wavelengths[i] = Math.pow(10, wavelengths[i]);
    }
  }

  return { wavelength: wavelengths, intensity: data };
}

function extractSpectrumFromBinaryTable(
  table: FitsBinaryTableData
): { wavelength: number[]; intensity: number[] } | null {
  if (table.ncols === 0 || table.nrows === 0) return null;

  const colNames = table.columns.map((c) => c.name);
  const wlColName = findWavelengthColumn(colNames);
  const fluxColName = findFluxColumn(colNames);

  let wlColIdx = wlColName ? colNames.indexOf(wlColName) : 0;
  let fluxColIdx = fluxColName
    ? colNames.indexOf(fluxColName)
    : Math.min(1, colNames.length - 1);

  if (wlColIdx === fluxColIdx && colNames.length > 1) {
    fluxColIdx = wlColIdx === 0 ? 1 : 0;
  }

  const wlCol = table.columns[wlColIdx];
  const fluxCol = table.columns[fluxColIdx];

  if (!wlCol || !fluxCol) return null;

  const wavelength: number[] = [];
  const intensity: number[] = [];

  for (let i = 0; i < table.nrows; i++) {
    const wlVal = Number(wlCol.data[i]);
    const intVal = Number(fluxCol.data[i]);
    if (!isNaN(wlVal) && !isNaN(intVal) && isFinite(wlVal) && isFinite(intVal)) {
      wavelength.push(wlVal);
      intensity.push(intVal);
    }
  }

  if (wavelength.length < 10) return null;

  return { wavelength, intensity };
}

export function extractSpectrumFromHDUs(hdus: FitsHDU[]): FitsSpectrumData | null {
  let primaryHeader: FitsHeader | null = null;
  for (const hdu of hdus) {
    if (hdu.header.has('SIMPLE')) {
      primaryHeader = hdu.header;
      break;
    }
  }
  if (!primaryHeader && hdus.length > 0) {
    primaryHeader = hdus[0].header;
  }

  for (const hdu of hdus) {
    if (hdu.data?.type === 'IMAGE') {
      const result = extractSpectrumFromImage(hdu.data, hdu.header);
      if (result && result.wavelength.length >= 10) {
        const points = result.wavelength
          .map((wl, i) => ({ wavelength: wl, intensity: result.intensity[i] }))
          .filter((p) => isFinite(p.wavelength) && isFinite(p.intensity) && p.wavelength > 0);

        if (points.length >= 10) {
          const headerToUse = hdu.header.has('OBJECT') || hdu.header.has('DATE-OBS')
            ? hdu.header
            : primaryHeader || hdu.header;
          return {
            points,
            metadata: extractObservationMetadata(headerToUse),
          };
        }
      }
    }

    if (hdu.data?.type === 'BINTABLE') {
      const result = extractSpectrumFromBinaryTable(hdu.data);
      if (result && result.wavelength.length >= 10) {
        const points = result.wavelength
          .map((wl, i) => ({ wavelength: wl, intensity: result.intensity[i] }))
          .filter((p) => isFinite(p.wavelength) && isFinite(p.intensity) && p.wavelength > 0);

        if (points.length >= 10) {
          const headerToUse = hdu.header.has('OBJECT') || hdu.header.has('DATE-OBS')
            ? hdu.header
            : primaryHeader || hdu.header;
          return {
            points,
            metadata: extractObservationMetadata(headerToUse),
          };
        }
      }
    }
  }

  return null;
}
