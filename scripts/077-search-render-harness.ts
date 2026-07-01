import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { io } from 'socket.io-client';

import type { ApiMessage } from '../src/api/types';
import type { GlobalState } from '../src/global/types';
import { parseSearchResultKey } from '../src/util/keys/searchResultKey';

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.scss')) {
      return {
        format: 'module',
        shortCircuit: true,
        source: 'export default {};',
      };
    }

    return nextLoad(url, context);
  },
});

Object.assign(globalThis, {
  APP_VERSION: 'search-render-harness',
  Audio: class {
    canPlayType() {
      return '';
    }
  },
  BroadcastChannel: class {
    postMessage() {}
    addEventListener() {}
    removeEventListener() {}
    close() {}
  },
  CSS: {
    supports: () => false,
  },
  self: globalThis,
  window: {
    navigator: {
      userAgent: 'node',
      platform: 'linux',
    },
    location: {
      host: 'localhost',
      hostname: 'localhost',
      href: 'http://localhost/',
      protocol: 'http:',
      search: '',
    },
    matchMedia: () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  },
  document: {
    referrer: '',
    body: { appendChild: () => undefined },
    documentElement: {
      classList: { contains: () => false },
      style: { setProperty: () => undefined },
    },
    createElement: () => ({
      canPlayType: () => '',
      getContext: () => ({}),
      style: {},
      classList: { add: () => undefined, contains: () => false },
      appendChild: () => undefined,
      remove: () => undefined,
      offsetWidth: 0,
      clientWidth: 0,
      offsetHeight: 0,
      clientHeight: 0,
    }),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  },
});

const [{ updateGlobalSearchResults }, { addMessages }] = await Promise.all([
  import('../src/global/reducers/globalSearch'),
  import('../src/global/reducers/messages'),
]);

const SERVER = process.env.SEARCH_RELAY_URL || 'http://localhost:9087';
const QUERY = process.env.SEARCH_QUERY || '그러게말야.';
const TIMEOUT_MS = Number(process.env.SEARCH_TIMEOUT_MS || 15000);
const TAB_ID = 1;

function request(socket: ReturnType<typeof io>, method: string, params: Record<string, unknown>) {
  const id = `search-render-077-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return new Promise<any>((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(`api:response:${id}`, onResponse);
      reject(new Error(`Timed out waiting for ${method}`));
    }, TIMEOUT_MS);

    function onResponse(response: Record<string, any>) {
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

function createHarnessGlobal(): GlobalState {
  return {
    byTabId: {
      [TAB_ID]: {
        globalSearch: {
          query: QUERY,
          fetchingStatus: { messages: true },
        },
      },
    },
    messages: {
      byChatId: {},
    },
  } as unknown as GlobalState;
}

function resolveChatMessageResultsCount(global: GlobalState) {
  const foundIds = global.byTabId[TAB_ID].globalSearch.resultsByType?.text?.foundIds || [];
  const globalMessagesByChatId = global.messages.byChatId;

  return foundIds
    .map((id) => {
      const [chatId, messageId] = parseSearchResultKey(id);

      return globalMessagesByChatId[chatId]?.byId[messageId];
    })
    .filter(Boolean).length;
}

const socket = io(SERVER, {
  transports: ['polling'],
  upgrade: false,
  timeout: TIMEOUT_MS,
});

try {
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out connecting to ${SERVER}`)), TIMEOUT_MS);
    socket.once('connect', () => {
      clearTimeout(timeout);
      resolve();
    });
    socket.once('connect_error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });

  const data = await request(socket, 'searchMessagesGlobal', {
    query: QUERY,
    limit: 20,
    type: 'text',
  });

  assert.ok(data && typeof data === 'object', 'searchMessagesGlobal response data must be an object');
  assert.ok(Array.isArray(data.messages), 'missing messages array');

  const messages = data.messages as ApiMessage[];
  let global = createHarnessGlobal();
  global = addMessages(global, messages);
  global = updateGlobalSearchResults(
    global,
    messages,
    data.totalCount || messages.length,
    'text',
    undefined,
    undefined,
    undefined,
    undefined,
    TAB_ID,
  );

  const foundIdsCount = global.byTabId[TAB_ID].globalSearch.resultsByType?.text?.foundIds.length || 0;
  const resolvedCount = resolveChatMessageResultsCount(global);

  console.log([
    'SEARCH_RENDER_HARNESS_OK',
    `query="${QUERY}"`,
    `relayMessages=${messages.length}`,
    `totalCount=${data.totalCount || messages.length}`,
    `resultsByType.text.foundIds=${foundIdsCount}`,
    `chatMessageSelectorResolved=${resolvedCount}`,
  ].join(' '));

  assert.equal(foundIdsCount, messages.length, 'foundIds count must match first-page messages');
  assert.equal(resolvedCount, messages.length, 'ChatMessageResults selector must resolve all first-page messages');
} finally {
  socket.close();
}

process.exit(0);
