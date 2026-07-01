// v0.33 fallback 단위 테스트
// jest 인프라(tests/init.js, tests/staticFileMock.js) 가 v2 프로젝트에서 누락되어
// `npm test` 가 setupFilesAfterEnv validation 에서 종료된다.
// 본 스크립트는 tsx 로 TS 소스를 직접 import 하여 buildApiMessageEntities /
// buildApiMessage 의 핵심 검증 케이스를 node:assert 로 실행한다.
//
// 실행: npx tsx scripts/test-entities.js
//
// 성공 시 종료코드 0 + "ALL PASS (N)" 출력.

import assert from 'node:assert/strict';
import { buildApiMessage, buildApiMessageEntities } from '../src/api/tdlib/converters.ts';
import { ApiMessageEntityTypes } from '../src/api/types/index.ts';

let count = 0;
function test(name, fn) {
  count += 1;
  try {
    fn();
    console.log(`  PASS [${count}] ${name}`);
  } catch (e) {
    console.error(`  FAIL [${count}] ${name}`);
    console.error(e);
    process.exit(1);
  }
}

console.log('buildApiMessageEntities — TDLib formattedText.entities → ApiMessageEntity[]');

test('textEntityTypeBotCommand → MessageEntityBotCommand (v0.33 핵심)', () => {
  const out = buildApiMessageEntities([
    { _: 'textEntity', offset: 0, length: 5, type: { _: 'textEntityTypeBotCommand' } },
  ]);
  assert.deepEqual(out, [
    { offset: 0, length: 5, type: ApiMessageEntityTypes.BotCommand },
  ]);
});

test('textEntityTypeTextUrl(+url) — url 필드 부착', () => {
  const out = buildApiMessageEntities([
    {
      _: 'textEntity', offset: 10, length: 8,
      type: { _: 'textEntityTypeTextUrl', url: 'https://example.com' },
    },
  ]);
  assert.deepEqual(out, [
    { offset: 10, length: 8, type: ApiMessageEntityTypes.TextUrl, url: 'https://example.com' },
  ]);
});

test('textEntityTypeMentionName(+user_id → userId)', () => {
  const out = buildApiMessageEntities([
    {
      _: 'textEntity', offset: 0, length: 4,
      type: { _: 'textEntityTypeMentionName', user_id: 12345678 },
    },
  ]);
  assert.deepEqual(out, [
    { offset: 0, length: 4, type: ApiMessageEntityTypes.MentionName, userId: '12345678' },
  ]);
});

test('textEntityTypePreCode(+language) → Pre + language', () => {
  const out = buildApiMessageEntities([
    {
      _: 'textEntity', offset: 0, length: 12,
      type: { _: 'textEntityTypePreCode', language: 'ts' },
    },
  ]);
  assert.deepEqual(out, [
    { offset: 0, length: 12, type: ApiMessageEntityTypes.Pre, language: 'ts' },
  ]);
});

test('textEntityTypeCustomEmoji(+custom_emoji_id → documentId)', () => {
  const out = buildApiMessageEntities([
    {
      _: 'textEntity', offset: 0, length: 2,
      type: { _: 'textEntityTypeCustomEmoji', custom_emoji_id: '12345' },
    },
  ]);
  assert.deepEqual(out, [
    { offset: 0, length: 2, type: ApiMessageEntityTypes.CustomEmoji, documentId: '12345' },
  ]);
});

test('Bold / Italic / Code / Url 단순 매핑', () => {
  const out = buildApiMessageEntities([
    { _: 'textEntity', offset: 0, length: 4, type: { _: 'textEntityTypeBold' } },
    { _: 'textEntity', offset: 5, length: 3, type: { _: 'textEntityTypeItalic' } },
    { _: 'textEntity', offset: 9, length: 5, type: { _: 'textEntityTypeCode' } },
    { _: 'textEntity', offset: 15, length: 7, type: { _: 'textEntityTypeUrl' } },
  ]);
  assert.deepEqual(out, [
    { offset: 0, length: 4, type: ApiMessageEntityTypes.Bold },
    { offset: 5, length: 3, type: ApiMessageEntityTypes.Italic },
    { offset: 9, length: 5, type: ApiMessageEntityTypes.Code },
    { offset: 15, length: 7, type: ApiMessageEntityTypes.Url },
  ]);
});

test('미지원 타입 드롭(warn) — 정상 entry 만 통과', () => {
  const origWarn = console.warn;
  const warnings = [];
  console.warn = (...args) => warnings.push(args);
  try {
    const out = buildApiMessageEntities([
      { _: 'textEntity', offset: 0, length: 1, type: { _: 'textEntityTypeBankCardNumber' } },
      { _: 'textEntity', offset: 2, length: 4, type: { _: 'textEntityTypeBold' } },
    ]);
    assert.deepEqual(out, [
      { offset: 2, length: 4, type: ApiMessageEntityTypes.Bold },
    ]);
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0][1], 'textEntityTypeBankCardNumber');
  } finally {
    console.warn = origWarn;
  }
});

test('빈 입력 / 비배열 가드', () => {
  assert.deepEqual(buildApiMessageEntities([]), []);
  assert.deepEqual(buildApiMessageEntities(undefined), []);
  assert.deepEqual(buildApiMessageEntities(null), []);
});

console.log('buildApiMessage — content.text.entities 부착 (근인 수정 검증)');

test('/help 메시지: BotCommand entity 가 ApiMessage.content.text.entities 에 박힘', () => {
  const msg = buildApiMessage({
    id: 5959,
    chat_id: 12345678,
    date: 1717400000,
    is_outgoing: false,
    sender_id: { _: 'messageSenderUser', user_id: 12345 },
    content: {
      _: 'messageText',
      text: {
        _: 'formattedText',
        text: '/help',
        entities: [
          { _: 'textEntity', offset: 0, length: 5, type: { _: 'textEntityTypeBotCommand' } },
        ],
      },
    },
  });
  assert.deepEqual(msg.content.text, {
    text: '/help',
    entities: [
      { offset: 0, length: 5, type: ApiMessageEntityTypes.BotCommand },
    ],
  });
});

test('entities 없는 일반 텍스트: entities 키 미부착 (v0.32 동작 보존)', () => {
  const msg = buildApiMessage({
    id: 1,
    chat_id: 1,
    date: 0,
    content: { _: 'messageText', text: { _: 'formattedText', text: '안녕' } },
  });
  assert.deepEqual(msg.content.text, { text: '안녕' });
  assert.equal(msg.content.text.entities, undefined);
});

console.log(`\nALL PASS (${count})`);
