import type { FitsHeader, FitsImageData } from './types';

function getIntReader(byteWidth: number, signed: boolean, littleEndian: boolean) {
  switch (byteWidth) {
    case 1:
      return signed
        ? (dv: DataView, offset: number) => dv.getInt8(offset)
        : (dv: DataView, offset: number) => dv.getUint8(offset);
    case 2:
      return signed
        ? (dv: DataView, offset: number) => dv.getInt16(offset, littleEndian)
        : (dv: DataView, offset: number) => dv.getUint16(offset, littleEndian);
    case 4:
      return signed
        ? (dv: DataView, offset: number) => dv.getInt32(offset, littleEndian)
        : (dv: DataView, offset: number) => dv.getUint32(offset, littleEndian);
    default:
      throw new Error(`Unsupported integer byte width: ${byteWidth}`);
  }
}

function getFloatReader(byteWidth: number, littleEndian: boolean) {
  switch (byteWidth) {
    case 4:
      return (dv: DataView, offset: number) => dv.getFloat32(offset, littleEndian);
    case 8:
      return (dv: DataView, offset: number) => dv.getFloat64(offset, littleEndian);
    default:
      throw new Error(`Unsupported float byte width: ${byteWidth}`);
  }
}

export function parseImageData(
  buffer: ArrayBuffer,
  dataOffset: number,
  header: FitsHeader
): FitsImageData {
  const bitpix = header.get('BITPIX') as number;
  const naxis = header.get('NAXIS') as number;
  const naxes: number[] = [];
  for (let i = 1; i <= naxis; i++) {
    naxes.push(header.get(`NAXIS${i}`) as number);
  }

  const bscale = (header.get('BSCALE') as number) ?? 1;
  const bzero = (header.get('BZERO') as number) ?? 0;

  let totalPixels = 1;
  for (const n of naxes) {
    totalPixels *= n;
  }

  const data = new Float64Array(totalPixels);
  const littleEndian = false;

  if (bitpix > 0) {
    const byteWidth = bitpix / 8;
    const signed = true;
    const reader = getIntReader(byteWidth, signed, littleEndian);
    const dv = new DataView(buffer, dataOffset);
    for (let i = 0; i < totalPixels; i++) {
      const raw = reader(dv, i * byteWidth);
      data[i] = raw * bscale + bzero;
    }
  } else if (bitpix < 0) {
    const byteWidth = Math.abs(bitpix) / 8;
    const reader = getFloatReader(byteWidth, littleEndian);
    const dv = new DataView(buffer, dataOffset);
    for (let i = 0; i < totalPixels; i++) {
      const raw = reader(dv, i * byteWidth);
      data[i] = raw * bscale + bzero;
    }
  } else {
    throw new Error(`Unsupported BITPIX value: ${bitpix}`);
  }

  return {
    type: 'IMAGE',
    bitpix,
    naxis,
    naxes,
    data,
    bscale,
    bzero,
  };
}

export function computeImageDataSize(header: FitsHeader): number {
  const bitpix = Math.abs(header.get('BITPIX') as number) / 8;
  const gcount = (header.get('GCOUNT') as number) ?? 1;
  const pcount = (header.get('PCOUNT') as number) ?? 0;
  const naxis = header.get('NAXIS') as number;

  if (naxis === 0) return 0;

  let naxesProduct = 1;
  for (let i = 1; i <= naxis; i++) {
    naxesProduct *= header.get(`NAXIS${i}`) as number;
  }

  const rawSize = Math.max(0, naxesProduct + pcount) * gcount * bitpix;
  const blockSize = 2880;
  return Math.ceil(rawSize / blockSize) * blockSize;
}
