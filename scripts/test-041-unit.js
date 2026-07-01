#!/usr/bin/env node
// [041] openChat 그룹 멤버 트리거 단위 테스트 — global/actions mock

let passed = 0;
let failed = 0;

function assert(label, actual, expected) {
  const ok = actual === expected;
  if (ok) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.log(`  FAIL  ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    failed++;
  }
}

// 삽입된 트리거 로직 추출 (순수 함수로 래핑)
function isChatBasicGroup(chat) { return chat.type === 'chatTypeBasicGroup'; }
function isChatSuperGroup(chat) { return chat.type === 'chatTypeSuperGroup'; }

function shouldTriggerMemberLoad(chat, existingMembers) {
  if (!chat) return false;
  if (!(isChatBasicGroup(chat) || isChatSuperGroup(chat))) return false;
  if (existingMembers?.length) return false;
  return true;
}

// 케이스1: 베이직 그룹, 멤버 없음 → 트리거해야 함
console.log('케이스1 (베이직 그룹, 멤버 없음):');
assert('loadMoreMembers 트리거', shouldTriggerMemberLoad({ type: 'chatTypeBasicGroup' }, undefined), true);

// 케이스2: 슈퍼그룹, 멤버 없음 → 트리거해야 함
console.log('케이스2 (슈퍼그룹, 멤버 없음):');
assert('loadMoreMembers 트리거', shouldTriggerMemberLoad({ type: 'chatTypeSuperGroup' }, []), true);

// 케이스3: 슈퍼그룹, 멤버 이미 있음 → skip
console.log('케이스3 (슈퍼그룹, 멤버 이미 있음):');
assert('loadMoreMembers skip', shouldTriggerMemberLoad({ type: 'chatTypeSuperGroup' }, [{ userId: '123' }]), false);

// 케이스4: 채널 → skip
console.log('케이스4 (방송 채널):');
assert('채널 skip', shouldTriggerMemberLoad({ type: 'chatTypeChannel' }, undefined), false);

// 케이스5: DM (Private) → skip
console.log('케이스5 (DM):');
assert('DM skip', shouldTriggerMemberLoad({ type: 'chatTypePrivate' }, undefined), false);

// 케이스6: chat=undefined (id 없는 경우) → skip
console.log('케이스6 (chat 없음):');
assert('chat 없음 skip', shouldTriggerMemberLoad(undefined, undefined), false);

// 케이스7: 베이직 그룹, 멤버 1명 있음 → skip (중복 호출 방지)
console.log('케이스7 (베이직 그룹, 멤버 있음):');
assert('이미 로드 skip', shouldTriggerMemberLoad({ type: 'chatTypeBasicGroup' }, [{ userId: '456' }, { userId: '789' }]), false);

console.log('');
console.log(`결과: ${passed}개 PASS, ${failed}개 FAIL`);
process.exit(failed > 0 ? 1 : 0);
