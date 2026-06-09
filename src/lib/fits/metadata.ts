import type { FitsHeader, FitsObservationMetadata } from './types';
import { headerToPlainObject } from './header';

function getHeaderValue(
  header: FitsHeader,
  keywords: string[]
): string | number | boolean | null {
  for (const kw of keywords) {
    if (header.has(kw)) {
      return header.get(kw);
    }
  }
  return null;
}

function getStringValue(header: FitsHeader, keywords: string[]): string | undefined {
  const val = getHeaderValue(header, keywords);
  if (val === null || val === undefined) return undefined;
  return String(val).trim() || undefined;
}

function getNumberValue(header: FitsHeader, keywords: string[]): number | undefined {
  const val = getHeaderValue(header, keywords);
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const num = Number(val);
    if (!isNaN(num) && isFinite(num)) return num;
  }
  return undefined;
}

function parseISODateTime(dateStr: string): { date: string; time?: string } {
  if (!dateStr) return { date: new Date().toISOString().split('T')[0] };

  try {
    const dt = new Date(dateStr);
    if (!isNaN(dt.getTime())) {
      const iso = dt.toISOString();
      return {
        date: iso.split('T')[0],
        time: iso.split('T')[1].split('.')[0],
      };
    }
  } catch {
  }

  if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
    const parts = dateStr.split('T');
    return {
      date: parts[0],
      time: parts[1]?.split(/[.Z]/)[0] || undefined,
    };
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { date: dateStr };
  }

  if (/^\d{4}\/\d{2}\/\d{2}/.test(dateStr)) {
    const normalized = dateStr.replace(/\//g, '-');
    return parseISODateTime(normalized);
  }

  return { date: new Date().toISOString().split('T')[0] };
}

function jdToDate(jd: number): string {
  const millis = (jd - 2440587.5) * 86400 * 1000;
  const dt = new Date(millis);
  if (!isNaN(dt.getTime())) {
    return dt.toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
}

function mjdToDate(mjd: number): string {
  return jdToDate(mjd + 2400000.5);
}

export function extractObservationMetadata(header: FitsHeader): FitsObservationMetadata {
  const targetName = getStringValue(header, [
    'OBJECT', 'TARGET', 'TARGNAME', 'OBJNAME', 'SOURCE', 'STAR', 'NAME',
  ]);

  let observationDate = new Date().toISOString().split('T')[0];
  let observationTime: string | undefined;

  const dateObs = getStringValue(header, ['DATE-OBS', 'DATE_OBS', 'DATE', 'UTDATE', 'DATEOBS']);
  if (dateObs) {
    const parsed = parseISODateTime(dateObs);
    observationDate = parsed.date;
    observationTime = parsed.time;
  } else {
    const jd = getNumberValue(header, ['JD', 'JD-OBS', 'JDOBS', 'JD_OBS']);
    if (jd !== undefined) {
      observationDate = jdToDate(jd);
    } else {
      const mjd = getNumberValue(header, ['MJD', 'MJD-OBS', 'MJDOBS', 'MJD_OBS']);
      if (mjd !== undefined) {
        observationDate = mjdToDate(mjd);
      }
    }
  }

  if (!observationTime) {
    observationTime = getStringValue(header, ['UT', 'UT-TIME', 'TIME-OBS', 'TIME_OBS', 'OBSTIME']);
  }

  const exposureTime = getNumberValue(header, [
    'EXPTIME', 'EXPOSURE', 'EXPOS', 'EXP_TIME', 'EXP', 'EXPTOT',
    'INTEGRAT', 'ITIME', 'DWELL',
  ]);

  const telescope = getStringValue(header, [
    'TELESCOP', 'TELESCOPE', 'TELESCOP', 'OBSERVAT', 'OBSERVATORY',
    'SITE', 'TEL',
  ]);

  const instrument = getStringValue(header, [
    'INSTRUME', 'INSTRUMENT', 'INST', 'CAMERA', 'SPECTRO', 'DETECTOR',
  ]);

  const observer = getStringValue(header, ['OBSERVER', 'OBS', 'OPERATOR']);
  const grating = getStringValue(header, ['GRATING', 'GRISM', 'DISPERSE', 'DISPERSER']);
  const dispersion = getNumberValue(header, ['DISPERSI', 'DISPERSION', 'WATTS', 'DPL']);
  const wavelengthPixelSize = getNumberValue(header, ['CDELT1', 'CD1_1', 'WDELTA', 'DLDP', 'PIXELSIZ']);
  const centralWavelength = getNumberValue(header, ['CRVAL1', 'CRPIX1', 'WAVELEN', 'CENTWAVE', 'CWAVE']);

  const binning = getStringValue(header, ['BINNING', 'XBINNING', 'CCDSUM', 'DETSIZE']);
  const filter = getStringValue(header, ['FILTER', 'FILT', 'FILTER1', 'FILTER2']);
  const gain = getNumberValue(header, ['GAIN', 'CCDGAIN', 'EGAIN']);
  const temperature = getNumberValue(header, ['TEMP', 'TEMPERAT', 'CCD-TEMP', 'CCDTEMP', 'DET_TEMP']);
  const airmass = getNumberValue(header, ['AIRMASS', 'AMASS', 'AM']);
  const ra = getStringValue(header, ['RA', 'OBJCTRA', 'RADEG', 'RA_OBJ', 'RIGHTASC']);
  const dec = getStringValue(header, ['DEC', 'OBJCTDEC', 'DECDEG', 'DEC_OBJ', 'DECLINAT']);
  const equinox = getNumberValue(header, ['EQUINOX', 'EPOCH']);
  const radialVelocity = getNumberValue(header, ['RADVEL', 'VRAD', 'RV', 'HELIOCORR']);
  const resolution = getNumberValue(header, ['RESOLUTN', 'RESOLUTION', 'R', 'SPECRES']);
  const notes = getStringValue(header, ['NOTES', 'COMMENT', 'REMARK', 'REMARKS']);

  const jd = getNumberValue(header, ['JD', 'JD-OBS', 'JDOBS', 'JD_OBS']);
  const mjd = getNumberValue(header, ['MJD', 'MJD-OBS', 'MJDOBS', 'MJD_OBS']);
  const observatory = getStringValue(header, ['OBSERVAT', 'OBSERVATORY', 'SITE']);

  return {
    targetName: targetName || 'Unknown',
    observationDate,
    observationTime,
    exposureTime,
    telescope,
    instrument,
    observatory,
    observer,
    grating,
    dispersion,
    wavelengthPixelSize,
    centralWavelength,
    binning,
    filter,
    gain,
    temperature,
    airmass,
    ra,
    dec,
    jd,
    mjd,
    equinox,
    radialVelocity,
    resolution,
    notes,
    rawHeaders: headerToPlainObject(header),
  };
}
