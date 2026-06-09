import type { FitsHDU, FitsDataType, FitsDataUnit, FitsHeader, FitsSpectrumData } from './types';
import { parseHeaderFromBytes } from './header';
import { parseImageData, computeImageDataSize } from './image';
import { parseBinaryTable, computeBinaryTableSize } from './binaryTable';
import { extractSpectrumFromHDUs } from './spectrum';
import { extractObservationMetadata } from './metadata';
import { headerToPlainObject } from './header';

const BLOCK_SIZE = 2880;

function determineHDUType(header: FitsHeader): FitsDataType {
  if (header.has('SIMPLE') || header.has('XTENSION')) {
    const xtension = header.get('XTENSION');
    if (xtension) {
      const xt = String(xtension).toUpperCase().trim();
      if (xt === 'BINTABLE' || xt === 'A3DTABLE') {
        return 'BINTABLE';
      }
      if (xt === 'TABLE') {
        return 'TABLE';
      }
      if (xt === 'IMAGE') {
        return 'IMAGE';
      }
    }
    const naxis = header.get('NAXIS');
    if (typeof naxis === 'number' && naxis >= 1) {
      return 'IMAGE';
    }
    return 'IMAGE';
  }
  return 'UNKNOWN';
}

function parseDataUnit(
  buffer: ArrayBuffer,
  dataOffset: number,
  header: FitsHeader,
  dataType: FitsDataType
): FitsDataUnit {
  try {
    switch (dataType) {
      case 'IMAGE':
        return parseImageData(buffer, dataOffset, header);
      case 'BINTABLE':
        return parseBinaryTable(buffer, dataOffset, header);
      default:
        return null;
    }
  } catch (e) {
    console.warn('Failed to parse FITS data unit:', e);
    return null;
  }
}

function computeDataSize(header: FitsHeader, dataType: FitsDataType): number {
  switch (dataType) {
    case 'IMAGE':
      return computeImageDataSize(header);
    case 'BINTABLE':
    case 'TABLE':
      return computeBinaryTableSize(header);
    default:
      return 0;
  }
}

export async function parseFitsFile(file: File | ArrayBuffer): Promise<FitsHDU[]> {
  let buffer: ArrayBuffer;
  if (file instanceof File) {
    buffer = await file.arrayBuffer();
  } else {
    buffer = file;
  }

  const bytes = new Uint8Array(buffer);
  const hdus: FitsHDU[] = [];
  let offset = 0;

  while (offset < bytes.length) {
    if (offset + BLOCK_SIZE > bytes.length) break;

    const blockBytes = bytes.subarray(offset);
    const { header, bytesRead: headerSize } = parseHeaderFromBytes(blockBytes);

    if (header.cards.length === 0 || header.cards.every((c) => c.keyword === '')) {
      break;
    }

    const dataType = determineHDUType(header);
    const dataOffset = offset + headerSize;
    const dataSize = computeDataSize(header, dataType);

    let data: FitsDataUnit = null;
    if (dataSize > 0 && dataOffset + dataSize <= bytes.length) {
      data = parseDataUnit(buffer, dataOffset, header, dataType);
    }

    hdus.push({
      header,
      data,
      dataType,
    });

    offset += headerSize + dataSize;

    if (!header.has('NEXTEND') && !header.has('EXTEND')) {
      if (hdus.length === 1 && hdus[0].data === null) {
        break;
      }
    }
  }

  return hdus;
}

export async function parseFitsSpectrum(file: File | ArrayBuffer): Promise<FitsSpectrumData> {
  const hdus = await parseFitsFile(file);
  if (hdus.length === 0) {
    throw new Error('无法解析 FITS 文件：未找到有效的 HDU');
  }

  const spectrum = extractSpectrumFromHDUs(hdus);
  if (spectrum) {
    return spectrum;
  }

  const primaryHeader = hdus[0].header;
  const metadata = extractObservationMetadata(primaryHeader);

  throw new Error(
    `无法从 FITS 文件中提取光谱数据（找到 ${hdus.length} 个 HDU）。请确认文件包含有效的 IMAGE 或 BINTABLE 光谱数据。`
  );
}

export { extractObservationMetadata, headerToPlainObject };
export * from './types';
