#!/usr/bin/env node
/**
 * [026] Sticker null guard regression check
 * 검사 1: Sticker.tsx에 무방비 'isMissing' in stickerSetInfo 패턴이 없을 것 (널 안전성 회귀 방지)
 * 검사 2: src/ 전체에 Sticker-RCA / StickerConv-RCA 문자열이 없을 것 (임시 계측 제거 확인)
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(new URL('.', import.meta.url).pathname, '..');

let passed = 0;
let failed = 0;

// 검사 1: 무방비 패턴 부재 확인
const stickerTsx = readFileSync(join(ROOT, 'src/components/middle/message/Sticker.tsx'), 'utf8');
const barePattern = /'isMissing' in stickerSetInfo\b(?!Maybe)/;
if (barePattern.test(stickerTsx)) {
  console.error('[FAIL] Sticker.tsx: 무방비 \'isMissing\' in stickerSetInfo 패턴이 남아 있음 — 널 안전성 회귀');
  failed++;
} else {
  console.log('[PASS] Sticker.tsx: 무방비 패턴 없음 (가드 적용 확인)');
  passed++;
}

// 검사 2: src/ 전체에 RCA 계측 문자열 부재 확인
function walkSrc(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walkSrc(full));
    } else if (/\.(ts|tsx|js|mjs)$/.test(entry)) {
      results.push(full);
    }
  }
  return results;
}

const SRC = join(ROOT, 'src');
const RCA_PATTERNS = ['Sticker-RCA', 'StickerConv-RCA'];
let rcaFound = false;
for (const file of walkSrc(SRC)) {
  const content = readFileSync(file, 'utf8');
  for (const pat of RCA_PATTERNS) {
    if (content.includes(pat)) {
      console.error(`[FAIL] src/ 에 RCA 계측 문자열 잔존: ${file} ('${pat}')`);
      rcaFound = true;
      failed++;
    }
  }
}
if (!rcaFound) {
  console.log('[PASS] src/ 전체: Sticker-RCA / StickerConv-RCA 문자열 없음');
  passed++;
}

console.log(`\n결과: ${passed} PASS / ${failed} FAIL`);
if (failed > 0) process.exit(1);
