import type { SpectralLine, MKTemplate } from '@/types';

export const SPECTRAL_LINES: SpectralLine[] = [
  { element: 'H', ion: 'I', label: 'Hα', wavelength: 6562.8, color: '#ff4444', category: 'hydrogen' },
  { element: 'H', ion: 'I', label: 'Hβ', wavelength: 4861.3, color: '#ff6666', category: 'hydrogen' },
  { element: 'H', ion: 'I', label: 'Hγ', wavelength: 4340.5, color: '#ff8888', category: 'hydrogen' },
  { element: 'H', ion: 'I', label: 'Hδ', wavelength: 4101.7, color: '#ff9999', category: 'hydrogen' },
  { element: 'H', ion: 'I', label: 'Hε', wavelength: 3970.1, color: '#ffaaaa', category: 'hydrogen' },
  { element: 'H', ion: 'I', label: 'Hζ', wavelength: 3889.0, color: '#ffbbbb', category: 'hydrogen' },
  { element: 'H', ion: 'I', label: 'Hη', wavelength: 3835.4, color: '#ffcccc', category: 'hydrogen' },
  { element: 'H', ion: 'I', label: 'Hθ', wavelength: 3797.9, color: '#ffdddd', category: 'hydrogen' },
  { element: 'He', ion: 'I', label: 'He I 7065', wavelength: 7065.2, color: '#44aaff', category: 'helium' },
  { element: 'He', ion: 'I', label: 'He I 6678', wavelength: 6678.2, color: '#44aaff', category: 'helium' },
  { element: 'He', ion: 'I', label: 'He I 5876', wavelength: 5875.6, color: '#44aaff', category: 'helium' },
  { element: 'He', ion: 'I', label: 'He I 5016', wavelength: 5015.7, color: '#44aaff', category: 'helium' },
  { element: 'He', ion: 'I', label: 'He I 4713', wavelength: 4713.1, color: '#44aaff', category: 'helium' },
  { element: 'He', ion: 'I', label: 'He I 4471', wavelength: 4471.5, color: '#44aaff', category: 'helium' },
  { element: 'He', ion: 'II', label: 'He II 4686', wavelength: 4685.7, color: '#2288ff', category: 'helium' },
  { element: 'He', ion: 'II', label: 'He II 5412', wavelength: 5411.5, color: '#2288ff', category: 'helium' },
  { element: 'Ca', ion: 'II', label: 'Ca II K', wavelength: 3933.7, color: '#ffaa44', category: 'metal' },
  { element: 'Ca', ion: 'II', label: 'Ca II H', wavelength: 3968.5, color: '#ffaa44', category: 'metal' },
  { element: 'Na', ion: 'I', label: 'Na I D1', wavelength: 5895.9, color: '#ffee44', category: 'metal' },
  { element: 'Na', ion: 'I', label: 'Na I D2', wavelength: 5889.9, color: '#ffee44', category: 'metal' },
  { element: 'Mg', ion: 'I', label: 'Mg I b1', wavelength: 5183.6, color: '#88ff88', category: 'metal' },
  { element: 'Mg', ion: 'I', label: 'Mg I b2', wavelength: 5172.7, color: '#88ff88', category: 'metal' },
  { element: 'Fe', ion: 'I', label: 'Fe I 4383', wavelength: 4383.5, color: '#aaffaa', category: 'metal' },
  { element: 'Fe', ion: 'I', label: 'Fe I 5270', wavelength: 5270.4, color: '#aaffaa', category: 'metal' },
  { element: 'Fe', ion: 'I', label: 'Fe I 4325', wavelength: 4325.8, color: '#aaffaa', category: 'metal' },
  { element: 'Si', ion: 'II', label: 'Si II 6347', wavelength: 6347.1, color: '#aa88ff', category: 'metal' },
  { element: 'Si', ion: 'II', label: 'Si II 6371', wavelength: 6371.4, color: '#aa88ff', category: 'metal' },
  { element: 'C', ion: 'III', label: 'C III 4647', wavelength: 4647.4, color: '#ff88ff', category: 'metal' },
  { element: 'N', ion: 'III', label: 'N III 4634', wavelength: 4634.1, color: '#88ffff', category: 'metal' },
];

export const MK_TEMPLATES: MKTemplate[] = [
  {
    spectralType: 'O',
    luminosityClass: 'V',
    label: 'O5V',
    colorTemp: 42000,
    lineRatios: { 'HeII4686/HeI4471': 1.5, 'HeI4471/Hβ': 0.8, 'Hα/Hβ': 2.5 },
  },
  {
    spectralType: 'O',
    luminosityClass: 'V',
    label: 'O9V',
    colorTemp: 32000,
    lineRatios: { 'HeII4686/HeI4471': 0.8, 'HeI4471/Hβ': 0.6, 'Hα/Hβ': 2.8 },
  },
  {
    spectralType: 'B',
    luminosityClass: 'V',
    label: 'B0V',
    colorTemp: 29000,
    lineRatios: { 'HeII4686/HeI4471': 0.3, 'HeI4471/Hβ': 0.8, 'Hα/Hβ': 3.0 },
  },
  {
    spectralType: 'B',
    luminosityClass: 'V',
    label: 'B5V',
    colorTemp: 15400,
    lineRatios: { 'HeII4686/HeI4471': 0.0, 'HeI4471/Hβ': 0.5, 'Hα/Hβ': 3.2 },
  },
  {
    spectralType: 'B',
    luminosityClass: 'V',
    label: 'B8V',
    colorTemp: 11900,
    lineRatios: { 'HeII4686/HeI4471': 0.0, 'HeI4471/Hβ': 0.2, 'Hα/Hβ': 3.3 },
  },
  {
    spectralType: 'A',
    luminosityClass: 'V',
    label: 'A0V',
    colorTemp: 9600,
    lineRatios: { 'HeII4686/HeI4471': 0.0, 'HeI4471/Hβ': 0.05, 'Hα/Hβ': 3.5, 'CaII_H/Hδ': 0.2 },
  },
  {
    spectralType: 'A',
    luminosityClass: 'V',
    label: 'A5V',
    colorTemp: 8200,
    lineRatios: { 'HeII4686/HeI4471': 0.0, 'HeI4471/Hβ': 0.0, 'Hα/Hβ': 3.3, 'CaII_H/Hδ': 0.5 },
  },
  {
    spectralType: 'F',
    luminosityClass: 'V',
    label: 'F0V',
    colorTemp: 7350,
    lineRatios: { 'Hα/Hβ': 2.8, 'CaII_K/Hγ': 0.8, 'CaII_H/Hδ': 1.0 },
  },
  {
    spectralType: 'F',
    luminosityClass: 'V',
    label: 'F5V',
    colorTemp: 6550,
    lineRatios: { 'Hα/Hβ': 2.3, 'CaII_K/Hγ': 1.2, 'CaII_H/Hδ': 1.5 },
  },
  {
    spectralType: 'G',
    luminosityClass: 'V',
    label: 'G0V',
    colorTemp: 6050,
    lineRatios: { 'Hα/Hβ': 2.0, 'CaII_K/Hγ': 1.6, 'NaI_D/Hβ': 0.3 },
  },
  {
    spectralType: 'G',
    luminosityClass: 'V',
    label: 'G2V',
    colorTemp: 5770,
    lineRatios: { 'Hα/Hβ': 1.9, 'CaII_K/Hγ': 1.8, 'NaI_D/Hβ': 0.4, 'MgI_b/Hβ': 0.5 },
  },
  {
    spectralType: 'G',
    luminosityClass: 'V',
    label: 'G5V',
    colorTemp: 5660,
    lineRatios: { 'Hα/Hβ': 1.8, 'CaII_K/Hγ': 2.0, 'NaI_D/Hβ': 0.5, 'MgI_b/Hβ': 0.6 },
  },
  {
    spectralType: 'K',
    luminosityClass: 'V',
    label: 'K0V',
    colorTemp: 5240,
    lineRatios: { 'Hα/Hβ': 1.5, 'CaII_K/Hγ': 2.5, 'NaI_D/Hβ': 0.7, 'MgI_b/Hβ': 0.8 },
  },
  {
    spectralType: 'K',
    luminosityClass: 'V',
    label: 'K5V',
    colorTemp: 4350,
    lineRatios: { 'Hα/Hβ': 1.2, 'CaII_K/Hγ': 3.0, 'NaI_D/Hβ': 1.0, 'MgI_b/Hβ': 1.2 },
  },
  {
    spectralType: 'M',
    luminosityClass: 'V',
    label: 'M0V',
    colorTemp: 3850,
    lineRatios: { 'Hα/Hβ': 1.0, 'CaII_K/Hγ': 3.5, 'NaI_D/Hβ': 1.3, 'TiO_visible': 1.0 },
  },
  {
    spectralType: 'M',
    luminosityClass: 'V',
    label: 'M5V',
    colorTemp: 3240,
    lineRatios: { 'Hα/Hβ': 0.8, 'CaII_K/Hγ': 4.0, 'NaI_D/Hβ': 1.6, 'TiO_visible': 2.0 },
  },
  {
    spectralType: 'B',
    luminosityClass: 'I',
    label: 'B0Ia',
    colorTemp: 26000,
    lineRatios: { 'HeI4471/Hβ': 0.6, 'Hα/Hβ': 4.0, 'SiII6347/Hβ': 0.3 },
  },
  {
    spectralType: 'A',
    luminosityClass: 'I',
    label: 'A0Ia',
    colorTemp: 9730,
    lineRatios: { 'Hα/Hβ': 4.5, 'CaII_H/Hδ': 0.3 },
  },
  {
    spectralType: 'G',
    luminosityClass: 'I',
    label: 'G2Ia',
    colorTemp: 5550,
    lineRatios: { 'Hα/Hβ': 2.5, 'CaII_K/Hγ': 2.2, 'NaI_D/Hβ': 0.3 },
  },
  {
    spectralType: 'B',
    luminosityClass: 'III',
    label: 'B5III',
    colorTemp: 15000,
    lineRatios: { 'HeI4471/Hβ': 0.4, 'Hα/Hβ': 3.5 },
  },
  {
    spectralType: 'A',
    luminosityClass: 'III',
    label: 'A5III',
    colorTemp: 8200,
    lineRatios: { 'Hα/Hβ': 3.8, 'CaII_H/Hδ': 0.4 },
  },
  {
    spectralType: 'G',
    luminosityClass: 'III',
    label: 'G8III',
    colorTemp: 4900,
    lineRatios: { 'Hα/Hβ': 2.0, 'CaII_K/Hγ': 2.0, 'NaI_D/Hβ': 0.6 },
  },
  {
    spectralType: 'K',
    luminosityClass: 'III',
    label: 'K5III',
    colorTemp: 3990,
    lineRatios: { 'Hα/Hβ': 1.3, 'CaII_K/Hγ': 3.0, 'NaI_D/Hβ': 1.0, 'MgI_b/Hβ': 1.0 },
  },
];

export const WAVELENGTH_RANGES = {
  optical: { min: 3800, max: 7500, label: '可见光' },
  blue: { min: 3800, max: 5000, label: '蓝光区' },
  green: { min: 5000, max: 5800, label: '绿光区' },
  red: { min: 5800, max: 7500, label: '红光区' },
};

export const generateSampleSpectrum = (spectralType: string = 'A5V', noise: number = 0.02) => {
  const points: { wavelength: number; intensity: number }[] = [];
  const template = MK_TEMPLATES.find(t => t.label === spectralType) || MK_TEMPLATES[11];
  
  for (let wl = 3800; wl <= 7500; wl += 2) {
    let intensity = 1.0;
    const temp = template.colorTemp;
    const wlMicron = wl / 10000;
    const bbTop = 2.898e-3 / temp * 1e4;
    const bbRatio = Math.exp(-1.4388 / (wlMicron * temp / 10000)) / Math.exp(-1.4388 / (bbTop / 10000 * temp / 10000));
    intensity = bbRatio;
    
    for (const line of SPECTRAL_LINES) {
      const dist = Math.abs(wl - line.wavelength);
      if (dist < 50) {
        let depth = 0;
        if (line.category === 'hydrogen') {
          if (template.spectralType === 'O') depth = 0.05;
          else if (template.spectralType === 'B') depth = 0.15;
          else if (template.spectralType === 'A') depth = line.label === 'Hα' ? 0.4 : 0.35;
          else if (template.spectralType === 'F') depth = line.label === 'Hα' ? 0.25 : 0.2;
          else if (template.spectralType === 'G') depth = line.label === 'Hα' ? 0.15 : 0.12;
          else if (template.spectralType === 'K') depth = line.label === 'Hα' ? 0.08 : 0.06;
          else if (template.spectralType === 'M') depth = line.label === 'Hα' ? 0.04 : 0.03;
        } else if (line.category === 'helium') {
          if (template.spectralType === 'O') depth = line.ion === 'II' ? 0.3 : 0.2;
          else if (template.spectralType === 'B') depth = line.ion === 'II' ? 0.05 : 0.25;
          else if (template.spectralType === 'A') depth = 0.03;
        } else if (line.category === 'metal') {
          if (template.spectralType === 'O' || template.spectralType === 'B') depth = 0.02;
          else if (template.spectralType === 'A') depth = 0.05;
          else if (template.spectralType === 'F') depth = 0.15;
          else if (template.spectralType === 'G') depth = 0.25;
          else if (template.spectralType === 'K') depth = 0.35;
          else if (template.spectralType === 'M') depth = 0.45;
        }
        const sigma = 8;
        const gaussian = Math.exp(-(dist * dist) / (2 * sigma * sigma));
        intensity -= depth * gaussian;
      }
    }
    
    intensity += (Math.random() - 0.5) * noise;
    intensity = Math.max(0.05, Math.min(1.5, intensity));
    
    points.push({ wavelength: wl, intensity });
  }
  
  const maxInt = Math.max(...points.map(p => p.intensity));
  return points.map(p => ({ wavelength: p.wavelength, intensity: p.intensity / maxInt }));
};
