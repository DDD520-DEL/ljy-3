import type { FitsBinaryTableData, FitsHeader, FitsTableColumn } from './types';

const BLOCK_SIZE = 2880;

interface ColumnDescriptor {
  name: string;
  format: string;
  ttype: string;
  tform: string;
  tunit?: string;
  tzero?: number;
  tscale?: number;
  tnull?: number;
  repeat: number;
  width: number;
  offset: number;
}

function parseTFORM(format: string): { repeat: number; width: number; code: string } {
  const match = format.match(/^(\d*)([AILJEDBPQCXOM])(\d*\.?\d*)?/i);
  if (!match) {
    return { repeat: 1, width: 1, code: 'A' };
  }
  const repeat = match[1] ? parseInt(match[1], 10) : 1;
  const code = match[2].toUpperCase();
  let width = 1;

  switch (code) {
    case 'L':
    case 'X':
    case 'B':
      width = 1;
      break;
    case 'I':
      width = 2;
      break;
    case 'J':
      width = 4;
      break;
    case 'E':
      width = 4;
      break;
    case 'D':
      width = 8;
      break;
    case 'C':
      width = 8;
      break;
    case 'M':
      width = 16;
      break;
    case 'A':
      width = repeat;
      break;
    case 'P':
      width = 8;
      break;
    case 'Q':
      width = 16;
      break;
    case 'O':
      width = 8;
      break;
    default:
      width = 1;
  }

  return { repeat, width, code };
}

function getColumnDescriptors(header: FitsHeader): ColumnDescriptor[] {
  const tfields = (header.get('TFIELDS') as number) ?? 0;
  const cols: ColumnDescriptor[] = [];
  let runningOffset = 0;

  for (let i = 1; i <= tfields; i++) {
    const ttype = (header.get(`TTYPE${i}`) as string) ?? `FIELD${i}`;
    const tform = (header.get(`TFORM${i}`) as string) ?? '1A';
    const tunit = (header.get(`TUNIT${i}`) as string) ?? undefined;
    const tzero = header.get(`TZERO${i}`) as number | undefined;
    const tscale = header.get(`TSCAL${i}`) as number | undefined;
    const tnull = header.get(`TNULL${i}`) as number | undefined;

    const { repeat, width, code } = parseTFORM(tform);
    const colWidth = repeat * width;

    cols.push({
      name: ttype,
      format: tform,
      ttype,
      tform,
      tunit,
      tzero,
      tscale,
      tnull,
      repeat,
      width,
      offset: runningOffset,
    });

    runningOffset += colWidth;
  }

  return cols;
}

function readCell(
  dv: DataView,
  offset: number,
  code: string,
  repeat: number,
  width: number,
  littleEndian: boolean
): unknown {
  switch (code) {
    case 'L': {
      const byte = dv.getUint8(offset);
      return byte === 0x54 || byte === 0x74;
    }
    case 'X': {
      return dv.getUint8(offset);
    }
    case 'B': {
      return dv.getUint8(offset);
    }
    case 'I': {
      return dv.getInt16(offset, littleEndian);
    }
    case 'J': {
      return dv.getInt32(offset, littleEndian);
    }
    case 'E': {
      return dv.getFloat32(offset, littleEndian);
    }
    case 'D': {
      return dv.getFloat64(offset, littleEndian);
    }
    case 'C': {
      return {
        real: dv.getFloat32(offset, littleEndian),
        imag: dv.getFloat32(offset + 4, littleEndian),
      };
    }
    case 'M': {
      return {
        real: dv.getFloat64(offset, littleEndian),
        imag: dv.getFloat64(offset + 8, littleEndian),
      };
    }
    case 'A': {
      const bytes = new Uint8Array(dv.buffer, dv.byteOffset + offset, repeat);
      let str = '';
      for (let i = 0; i < bytes.length; i++) {
        if (bytes[i] === 0) break;
        str += String.fromCharCode(bytes[i]);
      }
      return str.trim();
    }
    default: {
      return null;
    }
  }
}

export function parseBinaryTable(
  buffer: ArrayBuffer,
  dataOffset: number,
  header: FitsHeader
): FitsBinaryTableData {
  const cols = getColumnDescriptors(header);
  const nrows = (header.get('NAXIS2') as number) ?? 0;
  const rowSize = (header.get('NAXIS1') as number) ?? 0;
  const littleEndian = false;

  const columns: FitsTableColumn[] = cols.map((c) => ({
    name: c.name,
    format: c.format,
    unit: c.tunit,
    data: [],
  }));

  const dv = new DataView(buffer, dataOffset);

  for (let row = 0; row < nrows; row++) {
    const rowOffset = row * rowSize;
    for (let i = 0; i < cols.length; i++) {
      const col = cols[i];
      const cellOffset = rowOffset + col.offset;
      let value = readCell(dv, cellOffset, parseTFORM(col.tform).code, col.repeat, col.width, littleEndian);

      if (col.tscale !== undefined && typeof value === 'number') {
        value = value * col.tscale;
      }
      if (col.tzero !== undefined && typeof value === 'number') {
        value = value + col.tzero;
      }
      if (col.tnull !== undefined && value === col.tnull) {
        value = null;
      }

      columns[i].data.push(value);
    }
  }

  return {
    type: 'BINTABLE',
    columns,
    nrows,
    ncols: cols.length,
  };
}

export function computeBinaryTableSize(header: FitsHeader): number {
  const naxis1 = (header.get('NAXIS1') as number) ?? 0;
  const naxis2 = (header.get('NAXIS2') as number) ?? 0;
  const pcount = (header.get('PCOUNT') as number) ?? 0;
  const gcount = (header.get('GCOUNT') as number) ?? 1;

  const rawSize = (naxis1 * naxis2 + pcount) * gcount;
  return Math.ceil(rawSize / BLOCK_SIZE) * BLOCK_SIZE;
}
