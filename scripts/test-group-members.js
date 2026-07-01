/**
 * test-group-members.js
 * [041] getGroupMembers 소켓 엔드포인트 통합 검증
 * 실행: node scripts/test-group-members.js
 * Target: example group (-100111111111); forbidden example group (-100999999999) is blocked
 */

import { io } from 'socket.io-client';

const SERVER = 'http://localhost:9087';
const GROUP_ID = process.env.GROUP_ID || '-100111111111';
const TIMEOUT = 30000;

if (GROUP_ID === '-100999999999') {
  console.error('[ABORT] forbidden example group is not allowed for this test');
  process.exit(2);
}

function callApi(socket, method, params) {
  return new Promise((resolve, reject) => {
    const reqId = `test-${method}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const t = setTimeout(() => reject(new Error(`${method} 응답 타임아웃`)), TIMEOUT);
    socket.once(`api:response:${reqId}`, (res) => {
      clearTimeout(t);
      if (res.error) {
        reject(new Error(`${method} 오류: ${res.error.message || JSON.stringify(res.error)}`));
      } else {
        resolve(res.data);
      }
    });
    socket.emit('api:request', { id: reqId, method, params });
  });
}

async function run() {
  const socket = io(SERVER, {
    transports: ['polling'],
    reconnection: false,
    timeout: TIMEOUT,
  });

  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('연결 타임아웃')), TIMEOUT);
    socket.on('connect', () => { clearTimeout(t); resolve(); });
    socket.on('connect_error', (e) => { clearTimeout(t); reject(e); });
  });
  console.log('[연결] 소켓 연결 성공, id:', socket.id);

  const result = await callApi(socket, 'getGroupMembers', {
    chatId: GROUP_ID,
    offset: 0,
    limit: 200,
  });

  const members = (result && result.members) || [];
  const users = (result && result.users) || [];
  const totalCount = (result && result.total_count) || 0;

  console.log(`[결과] total_count=${totalCount} members=${members.length} users=${users.length}`);

  if (members.length > 0) {
    console.log(`[첫멤버] userId=${members[0].userId}`);
  }
  if (users.length > 0) {
    console.log(`[첫유저] id=${users[0].id} first_name=${users[0].first_name}`);
  }

  socket.disconnect();

  if (members.length === 0) {
    console.error('[FAIL] members 배열이 비어 있음');
    process.exit(1);
  }
  if (users.length === 0) {
    console.error('[FAIL] users 배열이 비어 있음');
    process.exit(1);
  }

  console.log(`[PASS] getGroupMembers 정상 반환 — members=${members.length} users=${users.length}`);
  process.exit(0);
}

run().catch((e) => {
  console.error('[ERROR]', e.message);
  process.exit(1);
});
