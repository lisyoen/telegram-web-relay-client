// [027] 그룹 정보 패널 참가자 탭 — getGroupMembers 소켓 메서드 검증
// Example forbidden group (-100999999999) is blocked. Default: example group (-100111111111)
import { io } from 'socket.io-client';

const URL = 'http://localhost:9087';
const GROUP_ID = process.env.GROUP_ID || '-100111111111';
const TIMEOUT_MS = 30000;

if (GROUP_ID === '-100999999999') {
  console.error('[ABORT] forbidden example group is not allowed for this test');
  process.exit(2);
}

const socket = io(URL, { transports: ['polling'], upgrade: false });
let done = false;
const finish = (code, msg) => {
  if (done) return;
  done = true;
  console.log(msg);
  socket.close();
  process.exit(code);
};

const timer = setTimeout(() => finish(1, '[FAIL] timeout: getGroupMembers 응답 없음'), TIMEOUT_MS);

let reqId = 'gm-' + Date.now();

socket.on('connect', () => {
  console.log(`[INFO] 연결됨. GROUP_ID=${GROUP_ID} 요청 전송...`);
  socket.emit('api:request', { id: reqId, method: 'getGroupMembers', params: { chatId: GROUP_ID, offset: 0, limit: 50 } });
});

socket.on('api:response:' + reqId, (res) => {
  clearTimeout(timer);
  if (!res) return finish(1, '[FAIL] 응답이 null/undefined');
  if (res.error) return finish(1, `[FAIL] 서버 에러: ${res.error.message || JSON.stringify(res.error)}`);

  const data = res.data;
  if (!data) return finish(1, '[FAIL] res.data 없음');

  const members = data.members || [];
  const users = data.users || [];
  const total = data.total_count || 0;

  console.log(`[INFO] total_count=${total} members=${members.length} users=${users.length}`);
  if (members.length > 0) {
    console.log(`[INFO] 첫 멤버 userId: ${members[0].userId}`);
  }
  if (users.length > 0) {
    const u = users[0];
    console.log(`[INFO] 첫 user id=${u.id} first_name=${u.first_name}`);
  }

  if (members.length === 0) return finish(1, '[FAIL] members 비어 있음');
  if (users.length === 0) return finish(1, '[FAIL] users 비어 있음');

  // [028] status 분포 출력 — 전원 userStatusEmpty 가 아님을 단언
  const statusDist = {};
  for (const u of users) {
    const st = (u.status && u.status._) || 'none';
    statusDist[st] = (statusDist[st] || 0) + 1;
  }
  console.log('[INFO] status 분포:', JSON.stringify(statusDist));

  const allEmpty = Object.keys(statusDist).length === 1 && statusDist['userStatusEmpty'] > 0;
  if (allEmpty) return finish(1, '[FAIL] 전원 userStatusEmpty — 서버가 status 를 반환하지 않음');

  const hasRealStatus = Object.keys(statusDist).some((k) => k !== 'userStatusEmpty' && k !== 'none');
  if (!hasRealStatus) return finish(1, `[FAIL] 실제 상태 없음: ${JSON.stringify(statusDist)}`);

  finish(0, `[PASS] members=${members.length} users=${users.length} total=${total} status=${JSON.stringify(statusDist)}`);
});

socket.on('connect_error', (e) => finish(1, `[FAIL] connect_error: ${e.message}`));
