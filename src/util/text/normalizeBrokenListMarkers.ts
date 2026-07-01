import type { ApiMessageEntity } from '../../api/types';

// Matches a line that contains only a list marker (bullet or numbered),
// followed by one or more blank lines, then a non-space character.
// Group 1: preceding newline (or start), Group 2: indent, Group 3: marker glyph.
const LIST_MARKER_PATTERN = /(^|\n)([ \t]*)((?:[•‣◦▪·])|(?:[-*+])|(?:\d+[.)]))[ \t]*\n(?:[ \t]*\n)+(?=\S)/g;

interface Removal {
  index: number;
  matchLen: number;
  repl: string;
}

// Maps a position in the original text to its equivalent in the new text,
// accounting for all removals that precede that position.
function mapPos(origPos: number, removals: Removal[]): number {
  let delta = 0;
  for (const { index, matchLen, repl } of removals) {
    const matchEnd = index + matchLen;
    if (matchEnd <= origPos) {
      delta += matchLen - repl.length;
    } else if (index < origPos) {
      // origPos falls inside a removed region; map to end of replacement
      return index - delta + repl.length;
    } else {
      break;
    }
  }
  return origPos - delta;
}

export function normalizeBrokenListMarkers(
  text: string,
  entities?: ApiMessageEntity[],
): { text: string; entities?: ApiMessageEntity[] } {
  if (!text.includes('\n')) {
    return { text, entities };
  }

  LIST_MARKER_PATTERN.lastIndex = 0;

  const removals: Removal[] = [];
  let m: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((m = LIST_MARKER_PATTERN.exec(text)) !== null) {
    removals.push({
      index: m.index,
      matchLen: m[0].length,
      repl: m[1] + m[2] + m[3] + ' ',
    });
  }

  if (removals.length === 0) {
    return { text, entities };
  }

  let newText = '';
  let srcPos = 0;
  for (const { index, matchLen, repl } of removals) {
    newText += text.slice(srcPos, index) + repl;
    srcPos = index + matchLen;
  }
  newText += text.slice(srcPos);

  if (!entities?.length) {
    return { text: newText };
  }

  const newEntities: ApiMessageEntity[] = [];
  for (const entity of entities) {
    const newOffset = mapPos(entity.offset, removals);
    const newEnd = mapPos(entity.offset + entity.length, removals);
    const newLength = newEnd - newOffset;
    if (newLength > 0) {
      newEntities.push({ ...entity, offset: newOffset, length: newLength });
    }
  }

  return { text: newText, entities: newEntities };
}
