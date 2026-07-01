import assert from 'node:assert/strict';
import { io } from 'socket.io-client';

const SERVER = process.env.SEARCH_RELAY_URL || 'http://localhost:9087';
const QUERY = process.env.SEARCH_QUERY || 'Telegram';
const TIMEOUT_MS = Number(process.env.SEARCH_TIMEOUT_MS || 15000);

function request(socket, method, params) {
  const id = `search-relay-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(`api:response:${id}`, onResponse);
      reject(new Error(`Timed out waiting for ${method}`));
    }, TIMEOUT_MS);

    function onResponse(response) {
      clearTimeout(timeout);
      if (response?.error) {
        reject(new Error(typeof response.error === 'string' ? response.error : JSON.stringify(response.error)));
        return;
      }
      resolve(response?.data);
    }

    socket.once(`api:response:${id}`, onResponse);
    socket.emit('api:request', { id, method, params });
  });
}

const socket = io(SERVER, {
  transports: ['polling'],
  upgrade: false,
  timeout: TIMEOUT_MS,
});

try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out connecting to ${SERVER}`)), TIMEOUT_MS);
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
    socket.once('connect', () => clearTimeout(timeout));
    socket.once('connect_error', () => clearTimeout(timeout));
  });

  const data = await request(socket, 'searchChats', { query: QUERY });

  assert.ok(data && typeof data === 'object', 'searchChats response data must be an object');
  assert.ok(Object.prototype.hasOwnProperty.call(data, 'accountResultIds'), 'missing accountResultIds');
  assert.ok(Object.prototype.hasOwnProperty.call(data, 'globalResultIds'), 'missing globalResultIds');
  assert.ok(Object.prototype.hasOwnProperty.call(data, 'chats'), 'missing chats');
  assert.ok(Array.isArray(data.accountResultIds), 'accountResultIds must be an array');
  assert.ok(Array.isArray(data.globalResultIds), 'globalResultIds must be an array');
  assert.ok(Array.isArray(data.chats), 'chats must be an array');
  assert.ok(data.chats.length > 0, `expected non-empty chats for query "${QUERY}"`);

  console.log([
    'SEARCH_RELAY_OK',
    `query="${QUERY}"`,
    `accountResultIds=${data.accountResultIds.length}`,
    `globalResultIds=${data.globalResultIds.length}`,
    `chats=${data.chats.length}`,
    `users=${Array.isArray(data.users) ? data.users.length : 0}`,
  ].join(' '));
} finally {
  socket.close();
}

process.exit(0);
