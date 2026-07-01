// 봇/개인 DM @username 표시 회귀 검증
// getChats 응답의 private chat 에 _user(usernames) 가 실리는지 확인
import { io } from 'socket.io-client';

const URL = 'http://localhost:9087';
const TIMEOUT_MS = 15000;

const socket = io(URL, { transports: ['polling'], upgrade: false });
let done = false;
const finish = (code, msg) => {
  if (done) return;
  done = true;
  console.log(msg);
  socket.close();
  process.exit(code);
};

const timer = setTimeout(() => finish(1, '[FAIL] timeout: getChats 응답 없음'), TIMEOUT_MS);

socket.on('connect', () => {
  socket.emit('getChats', { limit: 50 }, (chats) => {
    clearTimeout(timer);
    if (!Array.isArray(chats) || chats.length === 0) {
      return finish(1, '[FAIL] getChats 빈 응답');
    }
    const privateChats = chats.filter((c) => c?.type?._ === 'chatTypePrivate');
    const withUser = privateChats.filter((c) => c._user);
    const withUsername = withUser.filter((c) => {
      const u = c._user;
      const names = u?.usernames?.active_usernames;
      return (Array.isArray(names) && names.length) || u?.username;
    });
    console.log(`[INFO] private=${privateChats.length} _user보유=${withUser.length} username보유=${withUsername.length}`);
    withUsername.slice(0, 8).forEach((c) => {
      const u = c._user;
      const names = u?.usernames?.active_usernames || (u?.username ? [u.username] : []);
      const isBot = u?.type?.['@type'] === 'userTypeBot';
      console.log(`  - ${c.title}: @${names.join(', @')}${isBot ? ' (bot)' : ''}`);
    });
    if (withUser.length === 0) return finish(1, '[FAIL] private chat 에 _user 미주입 — server.js getChats 수정 확인');
    if (withUsername.length === 0) return finish(1, '[FAIL] _user 는 있으나 username 0 — usernames 추출/데이터 확인');
    finish(0, '[PASS] private chat _user + username 정상 노출');
  });
});

socket.on('connect_error', (e) => finish(1, `[FAIL] connect_error: ${e.message}`));
