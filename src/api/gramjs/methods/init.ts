import type {
  ApiInitialArgs,
  ApiOnProgress,
  OnApiUpdate,
} from '../../types';
import type { LocalDb } from '../localDb';
import type { MethodArgs, MethodResponse, Methods } from './types';

import { DEBUG } from '../../../config';
import Deferred from '../../../util/Deferred';
import { updateFullLocalDb } from '../localDb';
import { init as initUpdateEmitter } from '../updates/apiUpdateEmitter';
import { init as initClient } from './client';
import { getTdLibClient } from '../tdlib/socketClient';
import * as methods from './index';
import * as tdlibMethods from '../tdlib/methods';

// Use TDLib for Phase 1 methods
const USE_TDLIB = true;

const TDLIB_METHOD_MAP: Record<string, keyof typeof tdlibMethods> = {
  fetchChats: 'fetchChats',
  fetchMessages: 'fetchMessages',
  sendMessage: 'sendMessage',
  markMessagesRead: 'markMessagesRead',
  markMessageListRead: 'markMessageListRead',
  fetchMembers: 'fetchMembers',
  saveDraft: 'saveDraft',
};

export async function initApi(_onUpdate: OnApiUpdate, initialArgs: ApiInitialArgs, initialLocalDb?: LocalDb) {
  initUpdateEmitter(_onUpdate);

  if (initialLocalDb) updateFullLocalDb(initialLocalDb);

  if (USE_TDLIB) {
    // Initialize TDLib client
    try {
      const tdlibClient = getTdLibClient();
      tdlibClient.setUpdateCallback(_onUpdate);
      await tdlibClient.connect();

      if (DEBUG) {
        // eslint-disable-next-line no-console
        console.log('[TDLib] Connected successfully');
      }

      // Send fake auth ready update to skip login screen
      _onUpdate({
        '@type': 'updateAuthReady',
      });
    } catch (error) {
      if (DEBUG) {
        // eslint-disable-next-line no-console
        console.error('[TDLib] Connection failed:', error);
      }
      throw error;
    }
  } else {
    const connectDeferred = new Deferred<void>();
    initClient(initialArgs, () => connectDeferred.resolve());
    return connectDeferred.promise;
  }
}

export function callApi<T extends keyof Methods>(fnName: T, ...args: MethodArgs<T>): MethodResponse<T> {
  // Route to TDLib methods if enabled
  if (USE_TDLIB && TDLIB_METHOD_MAP[fnName as string]) {
    const tdlibMethodName = TDLIB_METHOD_MAP[fnName as string];
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log(`[TDLib] Routing ${String(fnName)} to TDLib method ${tdlibMethodName}`);
    }
    // @ts-ignore
    return tdlibMethods[tdlibMethodName](...args) as MethodResponse<T>;
  }

  // @ts-ignore
  return methods[fnName](...args) as MethodResponse<T>;
}

export function cancelApiProgress(progressCallback: ApiOnProgress) {
  progressCallback.isCanceled = true;
}
