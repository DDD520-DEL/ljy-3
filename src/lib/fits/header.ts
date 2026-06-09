import type { FitsHeader, FitsHeaderCard } from './types';

const BLOCK_SIZE = 2880;
const CARD_SIZE = 80;
const KEYWORD_SIZE = 8;
const VALUE_START = 10;

function parseCardValue(raw: string): { value: string | number | boolean | null; comment?: string } {
  let s = raw.trim();

  if (s.length === 0) {
    return { value: null };
  }

  if (s.startsWith("'")) {
    let end = s.indexOf("'", 1);
    let value = s.substring(1, end >= 0 ? end : s.length);
    let rest = end >= 0 ? s.substring(end + 1) : '';
    let comment: string | undefined;
    const slashIdx = rest.indexOf('/');
    if (slashIdx >= 0) {
      comment = rest.substring(slashIdx + 1).trim();
    }
    return { value: value.trim(), comment };
  }

  const slashIdx = s.indexOf('/');
  let valueStr = slashIdx >= 0 ? s.substring(0, slashIdx).trim() : s;
  let comment = slashIdx >= 0 ? s.substring(slashIdx + 1).trim() : undefined;

  if (valueStr.length === 0) {
    return { value: null, comment };
  }

  const upper = valueStr.toUpperCase();
  if (upper === 'T' || upper === 'TRUE') {
    return { value: true, comment };
  }
  if (upper === 'F' || upper === 'FALSE') {
    return { value: false, comment };
  }

  const num = Number(valueStr);
  if (!isNaN(num) && isFinite(num)) {
    return { value: num, comment };
  }

  return { value: valueStr, comment };
}

function parseSingleCard(bytes: Uint8Array, offset: number): FitsHeaderCard | null {
  if (offset + CARD_SIZE > bytes.length) return null;

  const keywordBytes = bytes.subarray(offset, offset + KEYWORD_SIZE);
  const keyword = String.fromCharCode(...keywordBytes).trim();

  if (keyword === 'END') {
    return { keyword: 'END', value: null };
  }

  if (keyword === '' || keyword === 'COMMENT' || keyword === 'HISTORY') {
    const restBytes = bytes.subarray(offset + KEYWORD_SIZE, offset + CARD_SIZE);
    const rest = String.fromCharCode(...restBytes);
    return { keyword, value: rest.trim() };
  }

  if (bytes.length > offset + VALUE_START && bytes[offset + KEYWORD_SIZE] === 0x3d) {
    const valueBytes = bytes.subarray(offset + VALUE_START, offset + CARD_SIZE);
    const valueStr = String.fromCharCode(...valueBytes);
    const { value, comment } = parseCardValue(valueStr);
    return { keyword, value, comment };
  }

  const restBytes = bytes.subarray(offset + KEYWORD_SIZE, offset + CARD_SIZE);
  return { keyword, value: String.fromCharCode(...restBytes).trim() };
}

export function parseHeaderFromBytes(bytes: Uint8Array): { header: FitsHeader; bytesRead: number } {
  const cards: FitsHeaderCard[] = [];
  let offset = 0;
  let reachedEnd = false;

  while (!reachedEnd && offset < bytes.length) {
    const blockStart = offset;
    while (offset < blockStart + BLOCK_SIZE && offset < bytes.length) {
      const card = parseSingleCard(bytes, offset);
      if (!card) {
        offset += CARD_SIZE;
        continue;
      }
      if (card.keyword === 'END') {
        reachedEnd = true;
        cards.push(card);
        break;
      }
      cards.push(card);
      offset += CARD_SIZE;
    }
    if (!reachedEnd) {
      offset = blockStart + BLOCK_SIZE;
    }
  }

  const headerEnd = offset;
  const paddedSize = Math.ceil(headerEnd / BLOCK_SIZE) * BLOCK_SIZE;

  const cardMap = new Map<string, FitsHeaderCard>();
  for (const card of cards) {
    if (card.keyword !== '' && card.keyword !== 'COMMENT' && card.keyword !== 'HISTORY') {
      cardMap.set(card.keyword, card);
    }
  }

  const header: FitsHeader = {
    cards,
    get: (keyword: string) => cardMap.get(keyword)?.value ?? null,
    has: (keyword: string) => cardMap.has(keyword),
    getAll: () => cards,
  };

  return { header, bytesRead: paddedSize };
}

export function headerToPlainObject(header: FitsHeader): Record<string, string | number | boolean | null> {
  const obj: Record<string, string | number | boolean | null> = {};
  for (const card of header.cards) {
    if (card.keyword !== '' && card.keyword !== 'END' && card.keyword !== 'COMMENT' && card.keyword !== 'HISTORY') {
      obj[card.keyword] = card.value;
    }
  }
  return obj;
}
