import type {
  CelestialObject,
  EquatorialCoordinates,
  ApparentPosition,
  SunTimes,
  ObservationWindow,
  EphemerisResult,
  ObserverLocation,
  TimelineEvent,
} from '@/types';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const J2000_EPOCH = Date.UTC(2000, 0, 1, 12, 0, 0);
const SECONDS_PER_DAY = 86400;
const DAYS_PER_CENTURY = 36525;

function toJulianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

function julianCenturies(jd: number): number {
  return (jd - 2451545.0) / DAYS_PER_CENTURY;
}

function normalizeAngle(deg: number): number {
  let result = deg % 360;
  if (result < 0) result += 360;
  return result;
}

function normalizeHourAngle(hours: number): number {
  let result = hours % 24;
  if (result < 0) result += 24;
  return result;
}

export function raToHms(raDeg: number): string {
  const hours = raDeg / 15;
  const h = Math.floor(hours);
  const mFloat = (hours - h) * 60;
  const m = Math.floor(mFloat);
  const s = ((mFloat - m) * 60).toFixed(2);
  return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.padStart(5, '0')}s`;
}

export function decToDms(decDeg: number): string {
  const sign = decDeg >= 0 ? '+' : '-';
  const abs = Math.abs(decDeg);
  const d = Math.floor(abs);
  const mFloat = (abs - d) * 60;
  const m = Math.floor(mFloat);
  const s = ((mFloat - m) * 60).toFixed(2);
  return `${sign}${d.toString().padStart(2, '0')}° ${m.toString().padStart(2, '0')}' ${s.padStart(5, '0')}"`;
}

function greenwichMeanSiderealTime(date: Date): number {
  const jd = toJulianDate(date);
  const T = julianCenturies(jd);
  let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.0003032 * T * T - (T * T * T) / 38710000.0;
  gmst = normalizeAngle(gmst);
  return gmst / 15;
}

export function localSiderealTime(date: Date, longitude: number): number {
  const gmst = greenwichMeanSiderealTime(date);
  let lst = gmst + longitude / 15;
  lst = normalizeHourAngle(lst);
  return lst;
}

export function equatorialToHorizontal(
  raDeg: number,
  decDeg: number,
  latitude: number,
  longitude: number,
  date: Date
): { altitude: number; azimuth: number; hourAngle: number } {
  const lst = localSiderealTime(date, longitude);
  const raHours = raDeg / 15;
  let ha = lst - raHours;
  ha = normalizeHourAngle(ha);
  if (ha > 12) ha -= 24;

  const haRad = ha * 15 * DEG2RAD;
  const decRad = decDeg * DEG2RAD;
  const latRad = latitude * DEG2RAD;

  const sinAlt = Math.sin(decRad) * Math.sin(latRad) + Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad);
  const altitude = Math.asin(sinAlt) * RAD2DEG;

  const cosAz = (Math.sin(decRad) - Math.sin(altitude * DEG2RAD) * Math.sin(latRad)) / (Math.cos(altitude * DEG2RAD) * Math.cos(latRad));
  const sinAz = (-Math.cos(decRad) * Math.sin(haRad)) / Math.cos(altitude * DEG2RAD);
  let azimuth = Math.atan2(sinAz, cosAz) * RAD2DEG;
  azimuth = normalizeAngle(azimuth);

  return { altitude, azimuth, hourAngle: ha };
}

export function calculateAirmass(altitude: number): number {
  if (altitude <= 0) return 999;
  const z = 90 - altitude;
  const zRad = z * DEG2RAD;
  const cosZ = Math.cos(zRad);
  return 1 / (cosZ + 0.50572 * Math.pow(96.07995 - z, -1.6364));
}

function sunMeanLongitude(T: number): number {
  let L = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  return normalizeAngle(L);
}

function sunMeanAnomaly(T: number): number {
  let M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  return normalizeAngle(M);
}

function sunEquationOfCenter(T: number): number {
  const M = sunMeanAnomaly(T) * DEG2RAD;
  const C =
    Math.sin(M) * (1.914602 - 0.004817 * T - 0.000014 * T * T) +
    Math.sin(2 * M) * (0.019993 - 0.000101 * T) +
    Math.sin(3 * M) * 0.000289;
  return C;
}

function sunTrueLongitude(T: number): number {
  return sunMeanLongitude(T) + sunEquationOfCenter(T);
}

function sunApparentLongitude(T: number): number {
  const trueLong = sunTrueLongitude(T);
  const omega = 125.04 - 1934.136 * T;
  return trueLong - 0.00569 - 0.00478 * Math.sin(omega * DEG2RAD);
}

function meanObliquityOfEcliptic(T: number): number {
  return 23 + (26 + (21.448 - 46.815 * T - 0.00059 * T * T + 0.001813 * T * T * T) / 60) / 60;
}

function obliquityCorrection(T: number): number {
  const e0 = meanObliquityOfEcliptic(T);
  const omega = 125.04 - 1934.136 * T;
  return e0 + 0.00256 * Math.cos(omega * DEG2RAD);
}

function sunDeclination(T: number): number {
  const e = obliquityCorrection(T) * DEG2RAD;
  const lambda = sunApparentLongitude(T) * DEG2RAD;
  const sinDec = Math.sin(e) * Math.sin(lambda);
  return Math.asin(sinDec) * RAD2DEG;
}

function sunRightAscension(T: number): number {
  const e = obliquityCorrection(T) * DEG2RAD;
  const lambda = sunApparentLongitude(T) * DEG2RAD;
  const y = Math.tan(e / 2) * Math.tan(e / 2);
  let ra =
    Math.atan2(Math.sin(lambda) * Math.cos(e) - y * Math.sin(lambda), Math.cos(lambda)) * RAD2DEG;
  return normalizeAngle(ra);
}

function equationOfTime(T: number): number {
  const epsilon = obliquityCorrection(T) * DEG2RAD;
  const y = Math.tan(epsilon / 2) * Math.tan(epsilon / 2);
  const L0 = sunMeanLongitude(T) * DEG2RAD;
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
  const M = sunMeanAnomaly(T) * DEG2RAD;
  const Etime =
    y * Math.sin(2 * L0) -
    2 * e * Math.sin(M) +
    4 * e * y * Math.sin(M) * Math.cos(2 * L0) -
    0.5 * y * y * Math.sin(4 * L0) -
    1.25 * e * e * Math.sin(2 * M);
  return Etime * RAD2DEG * 4;
}

export function calculateSunTimes(date: Date, latitude: number, longitude: number): SunTimes {
  const jd = toJulianDate(date);
  const T = julianCenturies(jd);
  const eot = equationOfTime(T);
  const solarDec = sunDeclination(T);

  function getTimeForAltitude(targetAlt: number, isMorning: boolean): Date {
    const latRad = latitude * DEG2RAD;
    const decRad = solarDec * DEG2RAD;
    const altRad = targetAlt * DEG2RAD;

    const cosH =
      (Math.sin(altRad) - Math.sin(latRad) * Math.sin(decRad)) / (Math.cos(latRad) * Math.cos(decRad));

    if (cosH > 1) return new Date(NaN);
    if (cosH < -1) return new Date(NaN);

    let H = Math.acos(cosH) * RAD2DEG / 15;
    if (!isMorning) H = -H;

    const solarNoonMinutes = 720 - 4 * longitude - eot;
    const timeMinutes = solarNoonMinutes + H * 60;

    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    result.setMinutes(result.getMinutes() + timeMinutes);
    return result;
  }

  const solarNoon = (() => {
    const solarNoonMinutes = 720 - 4 * longitude - eot;
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    result.setMinutes(result.getMinutes() + solarNoonMinutes);
    return result;
  })();

  return {
    sunrise: getTimeForAltitude(-0.833, true),
    sunset: getTimeForAltitude(-0.833, false),
    civilTwilightStart: getTimeForAltitude(-6, true),
    civilTwilightEnd: getTimeForAltitude(-6, false),
    nauticalTwilightStart: getTimeForAltitude(-12, true),
    nauticalTwilightEnd: getTimeForAltitude(-12, false),
    astronomicalTwilightStart: getTimeForAltitude(-18, true),
    astronomicalTwilightEnd: getTimeForAltitude(-18, false),
    solarNoon,
  };
}

export function calculateObjectRiseSetTransit(
  raDeg: number,
  decDeg: number,
  latitude: number,
  longitude: number,
  date: Date
): { riseTime: Date | null; setTime: Date | null; transitTime: Date | null; transitAltitude: number; isCircumpolar: boolean; isNeverRises: boolean } {
  const latRad = latitude * DEG2RAD;
  const decRad = decDeg * DEG2RAD;

  const isCircumpolar = decDeg > 90 - latitude;
  const isNeverRises = decDeg < -(90 - latitude);

  let transitAltitude = 90 - latitude + decDeg;
  if (transitAltitude > 90) transitAltitude = 180 - transitAltitude;

  const midnight = new Date(date);
  midnight.setHours(0, 0, 0, 0);
  const lstMidnight = localSiderealTime(midnight, longitude);
  const raHours = raDeg / 15;

  let transitHA = raHours - lstMidnight;
  transitHA = normalizeHourAngle(transitHA);
  if (transitHA > 12) transitHA -= 24;

  const transitTime = new Date(midnight);
  transitTime.setHours(transitTime.getHours() + transitHA);

  if (isCircumpolar || isNeverRises) {
    return {
      riseTime: null,
      setTime: null,
      transitTime,
      transitAltitude,
      isCircumpolar,
      isNeverRises,
    };
  }

  const h0 = -0.5667;
  const cosH =
    (Math.sin(h0 * DEG2RAD) - Math.sin(latRad) * Math.sin(decRad)) /
    (Math.cos(latRad) * Math.cos(decRad));

  let H: number;
  if (cosH > 1) H = 0;
  else if (cosH < -1) H = 12;
  else H = Math.acos(cosH) * RAD2DEG / 15;

  const riseTime = new Date(transitTime);
  riseTime.setHours(riseTime.getHours() - H);

  const setTime = new Date(transitTime);
  setTime.setHours(setTime.getHours() + H);

  return {
    riseTime,
    setTime,
    transitTime,
    transitAltitude,
    isCircumpolar,
    isNeverRises,
  };
}

export function calculateObservationWindows(
  raDeg: number,
  decDeg: number,
  latitude: number,
  longitude: number,
  date: Date,
  minAltitude: number = 30,
  maxAirmass: number = 2.0
): ObservationWindow[] {
  const windows: ObservationWindow[] = [];
  const sunTimes = calculateSunTimes(date, latitude, longitude);
  const riseSet = calculateObjectRiseSetTransit(raDeg, decDeg, latitude, longitude, date);

  if (riseSet.isNeverRises) {
    return windows;
  }

  const nightStart = sunTimes.astronomicalTwilightEnd;
  const nightEnd = new Date(sunTimes.astronomicalTwilightStart);
  nightEnd.setDate(nightEnd.getDate() + 1);

  const stepMinutes = 5;
  let currentWindowStart: Date | null = null;
  let currentWindowMinAlt = 90;
  let currentWindowMaxAlt = -90;
  let currentWindowMinAirmass = 999;
  let currentWindowMaxAirmass = 0;

  const checkTime = new Date(nightStart);

  while (checkTime <= nightEnd) {
    const { altitude } = equatorialToHorizontal(raDeg, decDeg, latitude, longitude, checkTime);
    const airmass = calculateAirmass(altitude);

    const isGood = altitude >= minAltitude && airmass <= maxAirmass;

    if (isGood) {
      if (!currentWindowStart) {
        currentWindowStart = new Date(checkTime);
        currentWindowMinAlt = altitude;
        currentWindowMaxAlt = altitude;
        currentWindowMinAirmass = airmass;
        currentWindowMaxAirmass = airmass;
      } else {
        currentWindowMinAlt = Math.min(currentWindowMinAlt, altitude);
        currentWindowMaxAlt = Math.max(currentWindowMaxAlt, altitude);
        currentWindowMinAirmass = Math.min(currentWindowMinAirmass, airmass);
        currentWindowMaxAirmass = Math.max(currentWindowMaxAirmass, airmass);
      }
    } else if (currentWindowStart) {
      const endTime = new Date(checkTime);
      const duration = (endTime.getTime() - currentWindowStart.getTime()) / 60000;
      if (duration >= 15) {
        windows.push({
          startTime: currentWindowStart,
          endTime,
          durationMinutes: Math.round(duration),
          description: getWindowDescription(currentWindowMaxAlt),
          altitudeRange: { min: Math.round(currentWindowMinAlt * 10) / 10, max: Math.round(currentWindowMaxAlt * 10) / 10 },
          airmassRange: { min: Math.round(currentWindowMinAirmass * 100) / 100, max: Math.round(currentWindowMaxAirmass * 100) / 100 },
        });
      }
      currentWindowStart = null;
    }

    checkTime.setMinutes(checkTime.getMinutes() + stepMinutes);
  }

  if (currentWindowStart) {
    const endTime = new Date(checkTime);
    const duration = (endTime.getTime() - currentWindowStart.getTime()) / 60000;
    if (duration >= 15) {
      windows.push({
        startTime: currentWindowStart,
        endTime,
        durationMinutes: Math.round(duration),
        description: getWindowDescription(currentWindowMaxAlt),
        altitudeRange: { min: Math.round(currentWindowMinAlt * 10) / 10, max: Math.round(currentWindowMaxAlt * 10) / 10 },
        airmassRange: { min: Math.round(currentWindowMinAirmass * 100) / 100, max: Math.round(currentWindowMaxAirmass * 100) / 100 },
      });
    }
  }

  return windows;
}

function getWindowDescription(maxAltitude: number): string {
  if (maxAltitude >= 70) return '极佳观测条件（高空）';
  if (maxAltitude >= 50) return '优良观测条件';
  if (maxAltitude >= 40) return '良好观测条件';
  if (maxAltitude >= 30) return '可用观测条件';
  return '较差观测条件';
}

interface PlanetOrbitalElements {
  a: number;
  e: number;
  I: number;
  L: number;
  wBar: number;
  Omega: number;
  aDot: number;
  eDot: number;
  IDot: number;
  LDot: number;
  wBarDot: number;
  OmegaDot: number;
}

const PLANET_ELEMENTS: Record<string, PlanetOrbitalElements> = {
  mercury: {
    a: 0.38709927, e: 0.20563593, I: 7.00497902,
    L: 252.25032350, wBar: 77.45779628, Omega: 48.33076593,
    aDot: 0.00000037, eDot: 0.00001906, IDot: -0.00594749,
    LDot: 149472.67411175, wBarDot: 0.16047689, OmegaDot: -0.12534081,
  },
  venus: {
    a: 0.72333566, e: 0.00677672, I: 3.39467605,
    L: 181.97909950, wBar: 131.60246718, Omega: 76.67984255,
    aDot: 0.00000390, eDot: -0.00004107, IDot: -0.00078890,
    LDot: 58517.81538729, wBarDot: 0.00268329, OmegaDot: -0.27769418,
  },
  mars: {
    a: 1.52371034, e: 0.09339410, I: 1.84969142,
    L: -4.55343205, wBar: -23.94362959, Omega: 49.55953891,
    aDot: 0.00001847, eDot: 0.00007882, IDot: -0.00813131,
    LDot: 19140.30268499, wBarDot: 0.44441088, OmegaDot: -0.29257343,
  },
  jupiter: {
    a: 5.20288700, e: 0.04838624, I: 1.30439695,
    L: 34.39644051, wBar: 14.72847983, Omega: 100.47390909,
    aDot: -0.00011607, eDot: -0.00013253, IDot: -0.00183714,
    LDot: 3034.74612775, wBarDot: 0.21252668, OmegaDot: 0.20469106,
  },
  saturn: {
    a: 9.53667594, e: 0.05386179, I: 2.48599187,
    L: 49.95424423, wBar: 92.59887831, Omega: 113.66242448,
    aDot: -0.00125060, eDot: -0.00050991, IDot: 0.00193609,
    LDot: 1222.49362201, wBarDot: -0.41897216, OmegaDot: -0.28867794,
  },
};

function solveKepler(M: number, e: number): number {
  const eRad = e;
  let E = M + eRad * Math.sin(M * DEG2RAD);
  for (let i = 0; i < 30; i++) {
    const dM = M - (E * RAD2DEG - eRad * Math.sin(E) * RAD2DEG);
    const dE = dM / (1 - eRad * Math.cos(E));
    E += dE * DEG2RAD;
    if (Math.abs(dM) < 1e-8) break;
  }
  return E;
}

function eclipticToEquatorial(lambdaDeg: number, betaDeg: number): { ra: number; dec: number } {
  const epsilon = 23.43928 * DEG2RAD;
  const lambda = lambdaDeg * DEG2RAD;
  const beta = betaDeg * DEG2RAD;

  const cosBeta = Math.cos(beta);
  const sinBeta = Math.sin(beta);
  const cosLambda = Math.cos(lambda);
  const sinLambda = Math.sin(lambda);
  const cosEpsilon = Math.cos(epsilon);
  const sinEpsilon = Math.sin(epsilon);

  const x = cosBeta * cosLambda;
  const y = cosBeta * sinLambda * cosEpsilon - sinBeta * sinEpsilon;
  const z = cosBeta * sinLambda * sinEpsilon + sinBeta * cosEpsilon;

  let ra = Math.atan2(y, x) * RAD2DEG;
  const dec = Math.asin(z) * RAD2DEG;
  ra = normalizeAngle(ra);

  return { ra, dec };
}

export function calculatePlanetCoordinates(planetId: string, date: Date): { ra: number; dec: number; heliocentricLon: number; heliocentricLat: number; distance: number } {
  const elements = PLANET_ELEMENTS[planetId];
  if (!elements) {
    return { ra: 0, dec: 0, heliocentricLon: 0, heliocentricLat: 0, distance: 0 };
  }

  const jd = toJulianDate(date);
  const T = (jd - 2451545.0) / 36525.0;
  const Tc = T / 100.0;

  const a = elements.a + elements.aDot * Tc;
  const e = elements.e + elements.eDot * Tc;
  const I = elements.I + elements.IDot * Tc;
  const L = normalizeAngle(elements.L + elements.LDot * Tc);
  const wBar = normalizeAngle(elements.wBar + elements.wBarDot * Tc);
  const Omega = normalizeAngle(elements.Omega + elements.OmegaDot * Tc);

  const w = normalizeAngle(wBar - Omega);
  const M = normalizeAngle(L - wBar);

  const E = solveKepler(M, e);

  const xPrime = a * (Math.cos(E * DEG2RAD) - e);
  const yPrime = a * Math.sqrt(1 - e * e) * Math.sin(E * DEG2RAD);

  const cosW = Math.cos(w * DEG2RAD);
  const sinW = Math.sin(w * DEG2RAD);
  const cosOmega = Math.cos(Omega * DEG2RAD);
  const sinOmega = Math.sin(Omega * DEG2RAD);
  const cosI = Math.cos(I * DEG2RAD);
  const sinI = Math.sin(I * DEG2RAD);

  const xHelio = (cosW * cosOmega - sinW * sinOmega * cosI) * xPrime + (-sinW * cosOmega - cosW * sinOmega * cosI) * yPrime;
  const yHelio = (cosW * sinOmega + sinW * cosOmega * cosI) * xPrime + (-sinW * sinOmega + cosW * cosOmega * cosI) * yPrime;
  const zHelio = (sinW * sinI) * xPrime + (cosW * sinI) * yPrime;

  const distance = Math.sqrt(xHelio * xHelio + yHelio * yHelio + zHelio * zHelio);
  let heliocentricLon = Math.atan2(yHelio, xHelio) * RAD2DEG;
  heliocentricLon = normalizeAngle(heliocentricLon);
  const heliocentricLat = Math.asin(zHelio / distance) * RAD2DEG;

  const sunLon = normalizeAngle(sunApparentLongitude(T));
  const sunLat = 0;
  const sunDistance = 1.00000101778;

  const cosSunLon = Math.cos(sunLon * DEG2RAD);
  const sinSunLon = Math.sin(sunLon * DEG2RAD);
  const cosPLon = Math.cos(heliocentricLon * DEG2RAD);
  const sinPLon = Math.sin(heliocentricLon * DEG2RAD);
  const cosPLat = Math.cos(heliocentricLat * DEG2RAD);
  const sinPLat = Math.sin(heliocentricLat * DEG2RAD);

  const xGeo = distance * cosPLat * cosPLon - sunDistance * cosSunLon;
  const yGeo = distance * cosPLat * sinPLon - sunDistance * sinSunLon;
  const zGeo = distance * sinPLat;

  let geocentricLon = Math.atan2(yGeo, xGeo) * RAD2DEG;
  geocentricLon = normalizeAngle(geocentricLon);
  const geocentricLat = Math.atan2(zGeo, Math.sqrt(xGeo * xGeo + yGeo * yGeo)) * RAD2DEG;

  const { ra, dec } = eclipticToEquatorial(geocentricLon, geocentricLat);

  return { ra, dec, heliocentricLon, heliocentricLat, distance };
}

export function getEffectiveCoordinates(obj: CelestialObject, date: Date): { ra: number; dec: number; isDynamic: boolean } {
  if (obj.type === 'planet' && PLANET_ELEMENTS[obj.id]) {
    const coords = calculatePlanetCoordinates(obj.id, date);
    return { ra: coords.ra, dec: coords.dec, isDynamic: true };
  }
  return { ra: obj.ra, dec: obj.dec, isDynamic: false };
}

export function calculateEphemeris(
  obj: CelestialObject,
  location: ObserverLocation,
  date: Date = new Date()
): EphemerisResult {
  const { ra, dec } = getEffectiveCoordinates(obj, date);

  const { altitude, azimuth, hourAngle } = equatorialToHorizontal(
    ra,
    dec,
    location.latitude,
    location.longitude,
    date
  );
  const airmass = calculateAirmass(altitude);
  const sunTimes = calculateSunTimes(date, location.latitude, location.longitude);
  const riseSetTransit = calculateObjectRiseSetTransit(
    ra,
    dec,
    location.latitude,
    location.longitude,
    date
  );
  const observationWindows = calculateObservationWindows(
    ra,
    dec,
    location.latitude,
    location.longitude,
    date
  );

  return {
    object: obj,
    j2000: {
      ra,
      dec,
      raHours: raToHms(ra),
      decDegrees: decToDms(dec),
    },
    apparent: {
      ra,
      dec,
      altitude: Math.round(altitude * 10) / 10,
      azimuth: Math.round(azimuth * 10) / 10,
      hourAngle: Math.round(hourAngle * 100) / 100,
      airmass: Math.round(airmass * 100) / 100,
    },
    sunTimes,
    observationWindows,
    riseTime: riseSetTransit.riseTime,
    setTime: riseSetTransit.setTime,
    transitTime: riseSetTransit.transitTime,
    transitAltitude: Math.round(riseSetTransit.transitAltitude * 10) / 10,
    isCircumpolar: riseSetTransit.isCircumpolar,
    isNeverRises: riseSetTransit.isNeverRises,
    observerLocation: location,
    calculationTime: date,
  };
}

export function buildTimeline(result: EphemerisResult): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const genId = () => Math.random().toString(36).substring(2, 9);

  events.push({
    id: genId(),
    time: result.sunTimes.sunrise,
    label: '日出',
    type: 'sunrise',
  });
  events.push({
    id: genId(),
    time: result.sunTimes.astronomicalTwilightStart,
    label: '天文晨光始',
    type: 'twilight',
  });
  events.push({
    id: genId(),
    time: result.sunTimes.nauticalTwilightStart,
    label: '航海晨光始',
    type: 'twilight',
  });
  events.push({
    id: genId(),
    time: result.sunTimes.civilTwilightStart,
    label: '民用晨光始',
    type: 'twilight',
  });
  events.push({
    id: genId(),
    time: result.sunTimes.solarNoon,
    label: '太阳中天',
    type: 'transit',
  });
  events.push({
    id: genId(),
    time: result.sunTimes.civilTwilightEnd,
    label: '民用昏影终',
    type: 'twilight',
  });
  events.push({
    id: genId(),
    time: result.sunTimes.nauticalTwilightEnd,
    label: '航海昏影终',
    type: 'twilight',
  });
  events.push({
    id: genId(),
    time: result.sunTimes.astronomicalTwilightEnd,
    label: '天文昏影终',
    type: 'twilight',
  });
  events.push({
    id: genId(),
    time: result.sunTimes.sunset,
    label: '日落',
    type: 'sunset',
  });

  if (result.riseTime) {
    events.push({
      id: genId(),
      time: result.riseTime,
      label: `${result.object.name} 升起`,
      type: 'rise',
    });
  }
  if (result.transitTime) {
    events.push({
      id: genId(),
      time: result.transitTime,
      label: `${result.object.name} 中天 (${result.transitAltitude}°)`,
      type: 'transit',
    });
  }
  if (result.setTime) {
    events.push({
      id: genId(),
      time: result.setTime,
      label: `${result.object.name} 落下`,
      type: 'set',
    });
  }

  result.observationWindows.forEach((w) => {
    events.push({
      id: genId(),
      time: w.startTime,
      label: `可观测开始 (${w.altitudeRange.min}°)`,
      type: 'observation_start',
      description: w.description,
    });
    events.push({
      id: genId(),
      time: w.endTime,
      label: `可观测结束 (${w.altitudeRange.max}°)`,
      type: 'observation_end',
      description: w.description,
    });
  });

  return events.sort((a, b) => a.time.getTime() - b.time.getTime());
}

export const DEFAULT_LOCATIONS: ObserverLocation[] = [
  { name: '北京', latitude: 39.9042, longitude: 116.4074, elevation: 43, timezone: 'Asia/Shanghai' },
  { name: '上海', latitude: 31.2304, longitude: 121.4737, elevation: 4, timezone: 'Asia/Shanghai' },
  { name: '广州', latitude: 23.1291, longitude: 113.2644, elevation: 11, timezone: 'Asia/Shanghai' },
  { name: '成都', latitude: 30.5728, longitude: 104.0668, elevation: 500, timezone: 'Asia/Shanghai' },
  { name: '乌鲁木齐', latitude: 43.8256, longitude: 87.6168, elevation: 918, timezone: 'Asia/Shanghai' },
  { name: '昆明', latitude: 25.0389, longitude: 102.7183, elevation: 1891, timezone: 'Asia/Shanghai' },
  { name: '拉萨', latitude: 29.6520, longitude: 91.1721, elevation: 3650, timezone: 'Asia/Shanghai' },
];

export function parseRaInput(input: string): number | null {
  const trimmed = input.trim();
  
  const hmsMatch = trimmed.match(/^(\d+)\s*[h:]\s*(\d+)\s*[m:']?\s*(\d*\.?\d*)\s*s?"?$/i);
  if (hmsMatch) {
    const h = parseFloat(hmsMatch[1]);
    const m = parseFloat(hmsMatch[2] || '0');
    const s = parseFloat(hmsMatch[3] || '0');
    if (h >= 0 && h < 24 && m >= 0 && m < 60 && s >= 0 && s < 60) {
      return (h + m / 60 + s / 3600) * 15;
    }
  }

  const degMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*°?$/);
  if (degMatch) {
    const deg = parseFloat(degMatch[1]);
    if (deg >= 0 && deg < 360) {
      return deg;
    }
  }

  return null;
}

export function parseDecInput(input: string): number | null {
  const trimmed = input.trim();

  const dmsMatch = trimmed.match(/^([+-]?\d+)\s*[°:d]\s*(\d+)\s*[m:']\s*(\d*\.?\d*)\s*s?"?$/i);
  if (dmsMatch) {
    const sign = dmsMatch[1].startsWith('-') ? -1 : 1;
    const d = Math.abs(parseFloat(dmsMatch[1]));
    const m = parseFloat(dmsMatch[2] || '0');
    const s = parseFloat(dmsMatch[3] || '0');
    if (d >= 0 && d <= 90 && m >= 0 && m < 60 && s >= 0 && s < 60) {
      return sign * (d + m / 60 + s / 3600);
    }
  }

  const degMatch = trimmed.match(/^([+-]?\d+(?:\.\d+)?)\s*°?$/);
  if (degMatch) {
    const deg = parseFloat(degMatch[1]);
    if (deg >= -90 && deg <= 90) {
      return deg;
    }
  }

  return null;
}

export function formatTime(date: Date): string {
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatDateTime(date: Date): string {
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function azimuthToDirection(azimuth: number): string {
  const directions = ['北', '东北偏北', '东北', '东北偏东', '东', '东南偏东', '东南', '东南偏南', '南', '西南偏南', '西南', '西南偏西', '西', '西北偏西', '西北', '西北偏北'];
  const index = Math.round(azimuth / 22.5) % 16;
  return directions[index];
}
