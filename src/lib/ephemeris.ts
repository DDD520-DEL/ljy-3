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

export function calculateEphemeris(
  obj: CelestialObject,
  location: ObserverLocation,
  date: Date = new Date()
): EphemerisResult {
  const { altitude, azimuth, hourAngle } = equatorialToHorizontal(
    obj.ra,
    obj.dec,
    location.latitude,
    location.longitude,
    date
  );
  const airmass = calculateAirmass(altitude);
  const sunTimes = calculateSunTimes(date, location.latitude, location.longitude);
  const riseSetTransit = calculateObjectRiseSetTransit(
    obj.ra,
    obj.dec,
    location.latitude,
    location.longitude,
    date
  );
  const observationWindows = calculateObservationWindows(
    obj.ra,
    obj.dec,
    location.latitude,
    location.longitude,
    date
  );

  return {
    object: obj,
    j2000: {
      ra: obj.ra,
      dec: obj.dec,
      raHours: raToHms(obj.ra),
      decDegrees: decToDms(obj.dec),
    },
    apparent: {
      ra: obj.ra,
      dec: obj.dec,
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
