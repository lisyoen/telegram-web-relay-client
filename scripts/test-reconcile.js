#!/usr/bin/env node
// 036 reconcile 순수함수 단위 검증 — 역삼파 실증 시나리오 포함

function computeReconcileDeletions({ cachedIds, serverIds, lastMessageId, pendingIds }) {
  if (cachedIds.length === 0 || serverIds.length === 0) {
    return { toDelete: [], tailRemoved: 0, midRemoved: 0 };
  }

  const serverIdSet = new Set(serverIds);
  const pendingIdSet = new Set(pendingIds);
  const minServerId = Math.min(...serverIds);

  let tailRemoved = 0;
  let midRemoved = 0;
  const toDelete = [];

  for (const id of cachedIds) {
    if (pendingIdSet.has(id)) continue;
    if (id > lastMessageId) {
      toDelete.push(id);
      tailRemoved++;
    } else if (id >= minServerId && !serverIdSet.has(id)) {
      toDelete.push(id);
      midRemoved++;
    }
  }

  return { toDelete, tailRemoved, midRemoved };
}

let passed = 0;
let failed = 0;

function assert(label, actual, expected) {
  const actualSorted = [...actual].sort((a, b) => a - b);
  const expectedSorted = [...expected].sort((a, b) => a - b);
  const ok = JSON.stringify(actualSorted) === JSON.stringify(expectedSorted);
  if (ok) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.log(`  FAIL  ${label}`);
    console.log(`        expected: [${expectedSorted}]`);
    console.log(`        actual:   [${actualSorted}]`);
    failed++;
  }
}

// 케이스1: 역삼파 실증 — 잔존 2건 제거, "네" 1건 보존
console.log('케이스1 (역삼파 실증):');
{
  const r = computeReconcileDeletions({
    cachedIds: [615794081792, 615811907585, 615858044928],
    serverIds: [615794081792],
    lastMessageId: 615794081792,
    pendingIds: [],
  });
  assert('제거 목록 [615811907585, 615858044928]', r.toDelete, [615811907585, 615858044928]);
  assert('tailRemoved=2', [r.tailRemoved], [2]);
  assert('midRemoved=0', [r.midRemoved], [0]);
}

// 케이스2: pending 보존
console.log('케이스2 (pending 보존):');
{
  const r = computeReconcileDeletions({
    cachedIds: [615794081792, 615900000000],
    serverIds: [615794081792],
    lastMessageId: 615794081792,
    pendingIds: [615900000000],
  });
  assert('제거 목록 []', r.toDelete, []);
  assert('tailRemoved=0', [r.tailRemoved], [0]);
  assert('midRemoved=0', [r.midRemoved], [0]);
}

// 케이스3: mid-range orphan 제거
console.log('케이스3 (mid-range):');
{
  const r = computeReconcileDeletions({
    cachedIds: [100, 200, 300],
    serverIds: [100, 300],
    lastMessageId: 300,
    pendingIds: [],
  });
  assert('제거 목록 [200]', r.toDelete, [200]);
  assert('midRemoved=1', [r.midRemoved], [1]);
}

// 케이스4: 범위 밖 보존 (id < min(serverIds))
console.log('케이스4 (범위 밖 보존):');
{
  const r = computeReconcileDeletions({
    cachedIds: [50, 100],
    serverIds: [100],
    lastMessageId: 100,
    pendingIds: [],
  });
  assert('제거 목록 []', r.toDelete, []);
  assert('tailRemoved=0', [r.tailRemoved], [0]);
  assert('midRemoved=0', [r.midRemoved], [0]);
}

console.log('');
console.log(`결과: ${passed}/${passed + failed} PASS${failed > 0 ? ` (${failed} FAIL)` : ''}`);
process.exit(failed > 0 ? 1 : 0);
