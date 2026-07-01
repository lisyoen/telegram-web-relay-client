// [058] CustomEmoji fallback — renderText('emoji') produces non-empty output
// All emoji literals use \u{...} escapes only — no raw surrogates or literal emoji.
// window.matchMedia is mocked globally in tests/init.js (setupFilesAfterEnv).

import renderText from './renderText';

const RIBBON_ESCAPE = '\u{1F380}';   // U+1F380 RIBBON (supplementary plane)
const STAR_ESCAPE   = '\u{2B50}';    // U+2B50 WHITE MEDIUM STAR (BMP)

describe('renderText emoji filter — non-empty output guarantee (058 fallback seam)', () => {
  test('RIBBON \\u{1F380}: result array is non-empty (fallback visible)', () => {
    const result = renderText(RIBBON_ESCAPE, ['emoji']);
    expect(result.length).toBeGreaterThan(0);
    expect(result.some((part) => part !== '' && part !== undefined && part !== null)).toBe(true);
  });

  test('STAR \\u{2B50}: result array is non-empty (fallback visible)', () => {
    const result = renderText(STAR_ESCAPE, ['emoji']);
    expect(result.length).toBeGreaterThan(0);
    expect(result.some((part) => part !== '' && part !== undefined && part !== null)).toBe(true);
  });

  test('plain ASCII: renderText passes through unchanged', () => {
    const result = renderText('hello', ['emoji']);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toBe('hello');
  });

  test('non-string input is returned as single-element array', () => {
    const node = { type: 'bold' } as unknown as string;
    const result = renderText(node, ['emoji']);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(node);
  });
});
