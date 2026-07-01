#!/usr/bin/env node
// 037 reconcile 권위 fetch 통합 검증
// Runs against the configured DM chat: send -> exists -> delete -> absent scenario.
// "fetchMessages(offsetId=0) 가 서버 삭제를 반영함" 을 증명한다.
// 실행: node scripts/test-reconcile-integration.js

import { io } from 'socket.io-client';

const CHAT_ID = process.env.CHAT_ID || '12345678';
const URL = 'http://localhost:9087';
const TIMEOUT_MS = 45000;

const socket = io(URL, { transports: ['polling'], upgrade: false });
let done = false;
const finish = (code, msg) => {
  if (done) return;
  done = true;
  console.log(msg);
  socket.close();
  process.exit(code);
};

const timer = setTimeout(() => finish(1, '[FAIL] timeout'), TIMEOUT_MS);

function req(method, params) {
  return new Promise((resolve, reject) => {
    const id = `rci-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const to = setTimeout(() => reject(new Error(`timeout: ${method}`)), 20000);
    socket.once(`api:response:${id}`, (res) => {
      clearTimeout(to);
      if (res && res.error) reject(new Error(res.error.message || JSON.stringify(res.error)));
      else resolve(res && res.data !== undefined ? res.data : res);
    });
    socket.emit('api:request', { id, method, params });
  });
}

async function fetchLatest() {
  const res = await req('fetchMessages', {
    chat: { id: CHAT_ID },
    offsetId: 0,
    addOffset: 0,
    limit: 30,
  });
  return (res && res.messages) || [];
}

async function run() {
  // Step 1: 테스트 메시지 전송
  const tag = `[reconcile-test ${Date.now()}]`;
  console.log(`[1] sendMessage to DM ${CHAT_ID}: "${tag}"`);
  await req('sendMessage', { chatId: CHAT_ID, text: tag });
  console.log('    → 전송 요청 완료 (임시 ID 무시, text 로 확인)');

  // 전송 후 서버 반영 대기
  await new Promise((r) => setTimeout(r, 3000));

  // Step 2: fetchMessages — 전송한 메시지 존재 확인 (text 매칭)
  console.log('[2] fetchMessages(offsetId=0) — 전송 메시지 존재 확인 (text 기반)');
  const msgs1 = await fetchLatest();
  const foundMsg = msgs1.find((m) => {
    const txt = m.content?.text?.text || '';
    return txt.includes('[reconcile-test') && txt.includes(tag.split(' ')[1].replace(']', ''));
  });
  if (!foundMsg) {
    const texts = msgs1.map((m) => (m.content?.text?.text || '').substring(0, 60));
    throw new Error(`전송 메시지가 fetchMessages 결과에 없음 (${msgs1.length}건):\n  ${texts.join('\n  ')}`);
  }
  const realId = foundMsg.id;
  console.log(`    → PASS: id=${realId} text="${(foundMsg.content?.text?.text || '').substring(0, 40)}" 존재 확인 (총 ${msgs1.length}건)`);

  // Step 3: 메시지 삭제 (revoke=true)
  console.log(`[3] deleteMessages(chatId=${CHAT_ID}, id=${realId}, revoke=true)`);
  const delRes = await req('deleteMessages', {
    chatId: CHAT_ID,
    messageIds: [Number(realId)],
    shouldDeleteForAll: true,
  });
  if (!delRes || !delRes.ok) throw new Error(`deleteMessages 실패: ${JSON.stringify(delRes)}`);
  console.log('    → 삭제 요청 OK');

  // 삭제 후 서버 반영 대기
  await new Promise((r) => setTimeout(r, 3000));

  // Step 4: fetchMessages — 삭제된 메시지 부재 확인 (text 기반)
  console.log('[4] fetchMessages(offsetId=0) — 삭제 메시지 부재 확인 (text 기반)');
  const msgs2 = await fetchLatest();
  const stillFound = msgs2.find((m) => {
    const txt = m.content?.text?.text || '';
    return txt.includes('[reconcile-test') && txt.includes(tag.split(' ')[1].replace(']', ''));
  });
  if (stillFound) {
    throw new Error(`id=${realId} 가 삭제 후에도 fetchMessages 에 남아있음: "${(stillFound.content?.text?.text || '').substring(0, 60)}"`);
  }
  console.log(`    → PASS: id=${realId} 부재 확인 (총 ${msgs2.length}건)`);

  clearTimeout(timer);
  finish(0, '[PASS] 전송→존재→삭제→부재 모두 통과 — reconcileChat 권위 fetch 입력 검증 완료');
}

socket.on('connect', () => {
  console.log('[INFO] socket connected');
  run().catch((e) => {
    clearTimeout(timer);
    finish(1, `[FAIL] ${e.message}`);
  });
});

socket.on('connect_error', (e) => {
  clearTimeout(timer);
  finish(1, `[FAIL] connect_error: ${e.message}`);
});
