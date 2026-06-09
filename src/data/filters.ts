import type { FilterData, FilterResponsePoint } from '@/types';

function gaussianResponse(
  centerWl: number,
  fwhm: number,
  wlStart: number,
  wlEnd: number,
  step: number,
  peakTransmission: number = 1.0
): FilterResponsePoint[] {
  const sigma = fwhm / (2 * Math.sqrt(2 * Math.log(2)));
  const points: FilterResponsePoint[] = [];
  for (let wl = wlStart; wl <= wlEnd; wl += step) {
    const transmission = peakTransmission * Math.exp(-Math.pow(wl - centerWl, 2) / (2 * sigma * sigma));
    points.push({ wavelength: wl, transmission });
  }
  return points;
}

function trapezoidalResponse(
  wlBlue50: number,
  wlBlue100: number,
  wlRed100: number,
  wlRed50: number,
  wlStart: number,
  wlEnd: number,
  step: number,
  peakTransmission: number = 1.0
): FilterResponsePoint[] {
  const points: FilterResponsePoint[] = [];
  for (let wl = wlStart; wl <= wlEnd; wl += step) {
    let t = 0;
    if (wl < wlBlue50) t = 0;
    else if (wl >= wlBlue50 && wl < wlBlue100)
      t = peakTransmission * (wl - wlBlue50) / (wlBlue100 - wlBlue50);
    else if (wl >= wlBlue100 && wl <= wlRed100) t = peakTransmission;
    else if (wl > wlRed100 && wl <= wlRed50)
      t = peakTransmission * (wlRed50 - wl) / (wlRed50 - wlRed100);
    else t = 0;
    points.push({ wavelength: wl, transmission: t });
  }
  return points;
}

export const STANDARD_FILTERS: FilterData[] = [
  {
    id: 'johnson_u',
    name: 'U',
    system: 'Johnson/Bessel UBVRI',
    description: 'Johnson U 滤光片，紫外波段',
    color: '#8b5cf6',
    centralWavelength: 3650,
    fwhm: 660,
    points: trapezoidalResponse(3080, 3250, 3950, 4120, 2900, 4400, 10, 0.9),
  },
  {
    id: 'johnson_b',
    name: 'B',
    system: 'Johnson/Bessel UBVRI',
    description: 'Johnson B 滤光片，蓝色波段',
    color: '#3b82f6',
    centralWavelength: 4400,
    fwhm: 980,
    points: trapezoidalResponse(3780, 3950, 4780, 4950, 3600, 5200, 10, 0.95),
  },
  {
    id: 'johnson_v',
    name: 'V',
    system: 'Johnson/Bessel UBVRI',
    description: 'Johnson V 滤光片，可见光（黄绿）波段',
    color: '#22c55e',
    centralWavelength: 5500,
    fwhm: 890,
    points: trapezoidalResponse(4920, 5050, 5900, 6030, 4700, 6300, 10, 0.98),
  },
  {
    id: 'bessel_r',
    name: 'R',
    system: 'Johnson/Bessel UBVRI',
    description: 'Cousins R 滤光片，红波段',
    color: '#f97316',
    centralWavelength: 6400,
    fwhm: 1580,
    points: trapezoidalResponse(5520, 5750, 6950, 7180, 5300, 7400, 10, 0.96),
  },
  {
    id: 'bessel_i',
    name: 'I',
    system: 'Johnson/Bessel UBVRI',
    description: 'Cousins I 滤光片，近红外波段',
    color: '#ef4444',
    centralWavelength: 7900,
    fwhm: 1540,
    points: trapezoidalResponse(6950, 7150, 8550, 8750, 6700, 9000, 10, 0.94),
  },
  {
    id: 'sdss_u',
    name: 'u\'',
    system: 'SDSS ugriz',
    description: 'SDSS u\' 滤光片，紫外波段',
    color: '#6366f1',
    centralWavelength: 3551,
    fwhm: 560,
    points: gaussianResponse(3551, 560, 2900, 4200, 10, 0.92),
  },
  {
    id: 'sdss_g',
    name: 'g\'',
    system: 'SDSS ugriz',
    description: 'SDSS g\' 滤光片，绿色波段',
    color: '#10b981',
    centralWavelength: 4686,
    fwhm: 1260,
    points: gaussianResponse(4686, 1260, 3600, 5800, 10, 0.97),
  },
  {
    id: 'sdss_r',
    name: 'r\'',
    system: 'SDSS ugriz',
    description: 'SDSS r\' 滤光片，红色波段',
    color: '#ea580c',
    centralWavelength: 6165,
    fwhm: 1150,
    points: gaussianResponse(6165, 1150, 5100, 7300, 10, 0.95),
  },
  {
    id: 'sdss_i',
    name: 'i\'',
    system: 'SDSS ugriz',
    description: 'SDSS i\' 滤光片，近红外波段',
    color: '#dc2626',
    centralWavelength: 7481,
    fwhm: 1240,
    points: gaussianResponse(7481, 1240, 6300, 8700, 10, 0.93),
  },
  {
    id: 'sdss_z',
    name: 'z\'',
    system: 'SDSS ugriz',
    description: 'SDSS z\' 滤光片，红外波段',
    color: '#991b1b',
    centralWavelength: 8931,
    fwhm: 995,
    points: gaussianResponse(8931, 995, 7800, 10100, 10, 0.91),
  },
];

export const FILTER_SYSTEMS: { id: string; name: string; filterIds: string[] }[] = [
  {
    id: 'johnson_ubvri',
    name: 'Johnson/Bessel UBVRI',
    filterIds: ['johnson_u', 'johnson_b', 'johnson_v', 'bessel_r', 'bessel_i'],
  },
  {
    id: 'sdss_ugriz',
    name: 'SDSS ugriz',
    filterIds: ['sdss_u', 'sdss_g', 'sdss_r', 'sdss_i', 'sdss_z'],
  },
];

export function getFilterById(id: string): FilterData | undefined {
  return STANDARD_FILTERS.find((f) => f.id === id);
}

export function getFiltersBySystem(systemId: string): FilterData[] {
  const system = FILTER_SYSTEMS.find((s) => s.id === systemId);
  if (!system) return [];
  return system.filterIds.map((id) => getFilterById(id)).filter((f): f is FilterData => f !== undefined);
}
