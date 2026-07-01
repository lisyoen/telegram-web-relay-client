import { getIsHeavyAnimating, onFullyIdle } from '../lib/teact/teact';
import { addCallback, removeCallback } from '../lib/teact/teactn';

import type {
  ApiAvailableReaction,
} from '../api/types';
import type { MessageList } from '../types';
import type { ActionReturnType, GlobalState, SharedState } from './types';
import { ApiMessageEntityTypes } from '../api/types';

import {
  ALL_FOLDER_ID, ANIMATION_LEVEL_DEFAULT,
  ARCHIVED_FOLDER_ID,
  DEBUG,
  FOLDERS_POSITION_DEFAULT,
  GLOBAL_STATE_CACHE_ARCHIVED_CHAT_LIST_LIMIT,
  GLOBAL_STATE_CACHE_CHAT_LIST_LIMIT,
  GLOBAL_STATE_CACHE_CUSTOM_EMOJI_LIMIT,
  GLOBAL_STATE_CACHE_DISABLED,
  GLOBAL_STATE_CACHE_USER_LIST_LIMIT,
  IS_SCREEN_LOCKED_CACHE_KEY,
  SAVED_FOLDER_ID,
  SHARED_STATE_CACHE_KEY,
} from '../config';
import { MAIN_IDB_STORE } from '../util/browser/idb';
import { isUserId } from '../util/entities/ids';
import { getOrderedIds } from '../util/folderManager';
import {
  compact, pick, pickTruthy, unique,
} from '../util/iteratees';
import { GLOBAL_STATE_CACHE_KEY } from '../util/multiaccount';
import { encryptSession } from '../util/passcode';
import { onBeforeUnload, throttle } from '../util/schedulers';
import { hasStoredSession } from '../util/sessions';
import { addActionHandler, getGlobal } from './index';
import { INITIAL_GLOBAL_STATE, INITIAL_PERFORMANCE_STATE_MED } from './initialState';
import { clearGlobalForLockScreen, clearSharedStateForLockScreen } from './reducers';
import {
  selectChatMessages,
  selectCurrentMessageList,
  selectFullWebPageFromMessage,
  selectViewportIds,
  selectVisibleUsers,
} from './selectors';

import { getIsMobile } from '../hooks/useAppLayout';

const UPDATE_THROTTLE = 5000;

const updateCacheThrottled = throttle(() => onFullyIdle(() => updateCache()), UPDATE_THROTTLE, false);
const updateCacheForced = () => updateCache(true);

let isCaching = false;
let isRemovingCache = false;
let cacheUpdateSuspensionTimestamp = 0;
let unsubscribeFromBeforeUnload: NoneToVoidFunction | undefined;

export function cacheGlobal(global: GlobalState) {
  return MAIN_IDB_STORE.set(GLOBAL_STATE_CACHE_KEY, global);
}

export function cacheSharedState(state: SharedState) {
  return MAIN_IDB_STORE.set(SHARED_STATE_CACHE_KEY, state);
}

export function loadCachedGlobal() {
  return MAIN_IDB_STORE.get<GlobalState>(GLOBAL_STATE_CACHE_KEY);
}

export function loadCachedSharedState() {
  return MAIN_IDB_STORE.get<SharedState>(SHARED_STATE_CACHE_KEY);
}

export function removeGlobalFromCache() {
  return MAIN_IDB_STORE.del(GLOBAL_STATE_CACHE_KEY);
}

export function removeSharedStateFromCache() {
  return MAIN_IDB_STORE.del(SHARED_STATE_CACHE_KEY);
}

function cacheIsScreenLocked(global: GlobalState) {
  if (global?.passcode?.isScreenLocked) localStorage.setItem(IS_SCREEN_LOCKED_CACHE_KEY, 'true');
}

export function initCache() {
  if (GLOBAL_STATE_CACHE_DISABLED) {
    return;
  }

  const resetCache = () => {
    isRemovingCache = true;
    removeGlobalFromCache().finally(() => {
      localStorage.removeItem(IS_SCREEN_LOCKED_CACHE_KEY);
      isRemovingCache = false;
      if (!isCaching) {
        return;
      }

      clearCaching();
    });
  };

  addActionHandler('saveSession', (): ActionReturnType => {
    if (isCaching) {
      return;
    }

    setupCaching();
    updateCacheForced();
  });

  addActionHandler('reset', resetCache);
}

export async function loadCache(initialState: GlobalState): Promise<GlobalState | undefined> {
  if (GLOBAL_STATE_CACHE_DISABLED) {
    return undefined;
  }

  const cache = await readCache(initialState);

  if (cache.passcode.hasPasscode || hasStoredSession()) {
    setupCaching();

    return cache;
  } else {
    clearCaching();

    return undefined;
  }
}

export function getIsCaching() {
  return isCaching;
}

export function setupCaching() {
  if (isCaching) return;
  isCaching = true;
  unsubscribeFromBeforeUnload = onBeforeUnload(updateCacheForced, true);
  window.addEventListener('blur', updateCacheForced);
  addCallback(updateCacheThrottled);
}

export function clearCaching() {
  isCaching = false;
  removeCallback(updateCacheThrottled);
  window.removeEventListener('blur', updateCacheForced);
  if (unsubscribeFromBeforeUnload) {
    unsubscribeFromBeforeUnload();
  }
}

async function readCache(initialState: GlobalState): Promise<GlobalState> {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.time('global-state-cache-read');
  }

  const json = localStorage.getItem(GLOBAL_STATE_CACHE_KEY);
  const cachedFromLocalStorage = json ? JSON.parse(json) as GlobalState : undefined;
  if (cachedFromLocalStorage) localStorage.removeItem(GLOBAL_STATE_CACHE_KEY);

  let cached = cachedFromLocalStorage || await loadCachedGlobal();
  const cachedSharedState = await loadCachedSharedState();
  const sharedState = cachedSharedState || initialState.sharedState;

  // eslint-disable-next-line no-console
  console.log('[LANGDIAG] load cachedSharedState.language=', (cachedSharedState as any)?.settings?.language, 'used=', (sharedState as any)?.settings?.language);

  if (cached) {
    cached = {
      ...cached,
      sharedState,
    };
  }

  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.timeEnd('global-state-cache-read');
  }

  if (cached) {
    migrateCache(cached, initialState);
  }

  const newState: GlobalState = {
    ...initialState,
    ...cached,
    messages: initialState.messages, // 045: 영속된 stale 메시지 복원 금지 — 채팅 진입 시 항상 fresh fetch (v0.51 캐시 활성화 부작용 완결)
    sharedState: {
      ...sharedState,
      ...cached?.sharedState, // Allow migration to override shared state
    },
  };

  return newState;
}

export function migrateCache(cached: GlobalState, initialState: GlobalState) {
  try {
    unsafeMigrateCache(cached, initialState);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
}

function unsafeMigrateCache(cached: GlobalState, initialState: GlobalState) {
  const untypedCached = cached as any;
  // Pre-fill settings with defaults
  cached.settings.byKey = {
    ...initialState.settings.byKey,
    ...cached.settings.byKey,
  };

  cached.chatFolders = {
    ...initialState.chatFolders,
    ...cached.chatFolders,
  };

  if (!cached.chats.similarChannelsById) {
    cached.chats.similarChannelsById = initialState.chats.similarChannelsById;
  }

  if (!cached.chats.similarBotsById) {
    cached.chats.similarBotsById = initialState.chats.similarBotsById;
  }

  if (!cached.chats.lastMessageIds) {
    cached.chats.lastMessageIds = initialState.chats.lastMessageIds;
  }

  // Clear old color storage to optimize cache size
  if (untypedCached?.appConfig.peerColors) {
    untypedCached.appConfig.peerColors = undefined;
    untypedCached.appConfig.darkPeerColors = undefined;
  }

  if (!cached.fileUploads.byMessageKey) {
    cached.fileUploads.byMessageKey = {};
  }

  if (!cached.reactions) {
    cached.reactions = initialState.reactions;
  }

  if (!cached.quickReplies) {
    cached.quickReplies = initialState.quickReplies;
  }

  if (!cached.users.previewMediaByBotId) {
    cached.users.previewMediaByBotId = initialState.users.previewMediaByBotId;
  }
  if (!cached.chats.loadingParameters) {
    cached.chats.loadingParameters = initialState.chats.loadingParameters;
  }
  if (!cached.topBotApps) {
    cached.topBotApps = initialState.topBotApps;
  }

  if (!cached.reactions.defaultTags?.[0]?.type) {
    cached.reactions = initialState.reactions;
  }

  if (!cached.users.commonChatsById) {
    cached.users.commonChatsById = initialState.users.commonChatsById;
  }
  if (!cached.users.botAppPermissionsById) {
    cached.users.botAppPermissionsById = initialState.users.botAppPermissionsById;
  }
  if (!cached.chats.topicsInfoById) {
    cached.chats.topicsInfoById = initialState.chats.topicsInfoById;
  }

  if (!cached.messages.pollById) {
    cached.messages.pollById = initialState.messages.pollById;
  }
  if (!cached.settings.botVerificationShownPeerIds) {
    cached.settings.botVerificationShownPeerIds = initialState.settings.botVerificationShownPeerIds;
  }

  if (!cached.peers) {
    cached.peers = initialState.peers;
  }

  if (!cached.settings.accountDaysTtl) {
    cached.settings.accountDaysTtl = initialState.settings.accountDaysTtl;
  }

  if (!cached.cacheVersion) {
    cached.cacheVersion = initialState.cacheVersion;
    // Reset because of the new action message structure
    cached.messages = initialState.messages;
    cached.chats.listIds = initialState.chats.listIds;
  }

  if (!cached.messages.playbackByChatId) {
    cached.messages.playbackByChatId = initialState.messages.playbackByChatId;
  }

  if (cached.cacheVersion < 2) {
    if (untypedCached.settings.themes.dark) {
      untypedCached.settings.themes.dark.patternColor = (initialState as any).settings.themes.dark!.patternColor;
    }

    if (untypedCached.settings.themes.light) {
      untypedCached.settings.themes.light.patternColor = (initialState as any).settings.themes.light!.patternColor;
    }

    cached.cacheVersion = 2;
  }

  if (!cached.chats.notifyExceptionById) {
    cached.chats.notifyExceptionById = initialState.chats.notifyExceptionById;
  }

  if (!cached.sharedState) {
    cached.sharedState = initialState.sharedState;
    cached.sharedState.settings = {
      canDisplayChatInTitle: untypedCached.settings.byKey.canDisplayChatInTitle,
      animationLevel: untypedCached.settings.byKey.animationLevel,
      foldersPosition: FOLDERS_POSITION_DEFAULT,
      messageSendKeyCombo: untypedCached.settings.byKey.messageSendKeyCombo,
      messageTextSize: untypedCached.settings.byKey.messageTextSize,
      performance: untypedCached.settings.performance,
      theme: untypedCached.settings.byKey.theme,
      timeFormat: untypedCached.settings.byKey.timeFormat,
      wasTimeFormatSetManually: untypedCached.settings.byKey.wasTimeFormatSetManually,
      shouldUseSystemTheme: untypedCached.settings.byKey.shouldUseSystemTheme,
      isConnectionStatusMinimized: untypedCached.settings.byKey.isConnectionStatusMinimized,
      shouldForceHttpTransport: untypedCached.settings.byKey.shouldForceHttpTransport,
      language: untypedCached.settings.byKey.language,
      languages: untypedCached.settings.languages,
      shouldSkipWebAppCloseConfirmation: untypedCached.settings.byKey.shouldSkipWebAppCloseConfirmation,
      miniAppsCachedPosition: untypedCached.settings.miniAppsCachedPosition,
      miniAppsCachedSize: untypedCached.settings.miniAppsCachedSize,
      shouldAllowHttpTransport: untypedCached.settings.byKey.shouldAllowHttpTransport,
      shouldCollectDebugLogs: untypedCached.settings.byKey.shouldCollectDebugLogs,
      shouldDebugExportedSenders: untypedCached.settings.byKey.shouldDebugExportedSenders,
      shouldWarnAboutFiles: untypedCached.settings.byKey.shouldWarnAboutFiles,
    };
  }

  if (!cached.settings.themes) {
    cached.settings.themes = initialState.settings.themes;
  }

  if (!cached.messages.webPageById) {
    cached.messages.webPageById = initialState.messages.webPageById;
  }

  const cachedSharedSettings = cached.sharedState.settings;
  if (!cachedSharedSettings.wasAnimationLevelSetManually) {
    cachedSharedSettings.animationLevel = ANIMATION_LEVEL_DEFAULT;
    cachedSharedSettings.performance = INITIAL_PERFORMANCE_STATE_MED;
  }

  if (!cachedSharedSettings.foldersPosition) {
    cachedSharedSettings.foldersPosition = FOLDERS_POSITION_DEFAULT;
  }

  if (!cached.appConfig) {
    cached.appConfig = initialState.appConfig;
  }

  if (untypedCached.sharedState?.settings?.shouldWarnAboutSvg) {
    cached.sharedState.settings.shouldWarnAboutFiles = true;
    untypedCached.sharedState.settings.shouldWarnAboutSvg = undefined;
  }

  if (!cached.auth) {
    cached.auth = initialState.auth;
    cached.auth.rememberMe = untypedCached.rememberMe;
  }

  if (cached.audioPlayer.volume === undefined) {
    cached.audioPlayer.volume = initialState.audioPlayer.volume;
  }
}

function updateCache(force?: boolean) {
  const global = getGlobal();
  if (isRemovingCache || !isCaching || global.auth.isLoggingOut || (!force && getIsHeavyAnimating())) {
    return;
  }

  forceUpdateCache();
}

export function temporarilySuspendCacheUpdate() {
  cacheUpdateSuspensionTimestamp = Date.now() + UPDATE_THROTTLE;
}

export function forceUpdateCache(noEncrypt = false) {
  if (Date.now() < cacheUpdateSuspensionTimestamp) {
    return;
  }

  const global = getGlobal();
  const { hasPasscode, isScreenLocked } = global.passcode;

  if (hasPasscode) {
    if (!isScreenLocked && !noEncrypt) {
      const serializedGlobal = serializeGlobal(global);
      void encryptSession(undefined, serializedGlobal);
    }

    cacheIsScreenLocked(global);
    cacheGlobal(clearGlobalForLockScreen(global, false));
    cacheSharedState(clearSharedStateForLockScreen(global.sharedState));
    return;
  }

  cacheIsScreenLocked(global);
  cacheGlobal(reduceGlobal(global));
  // eslint-disable-next-line no-console
  console.log('[LANGDIAG] save language=', (global.sharedState as any)?.settings?.language);
  cacheSharedState(reduceSharedState(global.sharedState));
}

export function reduceGlobal<T extends GlobalState>(global: T) {
  const reducedGlobal: GlobalState = {
    ...INITIAL_GLOBAL_STATE,
    ...pick(global, [
      'cacheVersion',
      'appConfig',
      'config',
      'auth',
      'attachMenu',
      'currentUserId',
      'contactList',
      'topPeers',
      'topInlineBots',
      'topBotApps',
      'recentEmojis',
      'recentCustomEmojis',
      'push',
      'serviceNotifications',
      'attachmentSettings',
      'leftColumnWidth',
      'archiveSettings',
      'mediaViewer',
      'audioPlayer',
      'shouldShowContextMenuHint',
      'trustedBotIds',
      'recentlyFoundChatIds',
      'peerColors',
      'savedReactionTags',
      'timezones',
      'availableEffectById',
    ]),
    lastIsChatInfoShown: !getIsMobile() ? global.lastIsChatInfoShown : undefined,
    stickers: reduceStickers(global),
    customEmojis: reduceCustomEmojis(global),
    users: reduceUsers(global),
    chats: reduceChats(global),
    messages: INITIAL_GLOBAL_STATE.messages,
    settings: reduceSettings(global),
    chatFolders: reduceChatFolders(global),
    groupCalls: reduceGroupCalls(global),
    reactions: {
      ...pick(global.reactions, [
        'defaultTags',
        'recentReactions',
        'topReactions',
        'effectReactions',
        'hash',
      ]),
      availableReactions: reduceAvailableReactions(global.reactions.availableReactions),
    },
    passcode: pick(global.passcode, [
      'isScreenLocked',
      'hasPasscode',
      'invalidAttemptsCount',
      'timeoutUntil',
    ]),
  };

  return reducedGlobal;
}

export function reduceSharedState(sharedState: SharedState): SharedState {
  return {
    ...sharedState,
    settings: {
      ...sharedState.settings,
      languages: undefined,
    },
    isInitial: undefined,
  };
}

export function serializeGlobal<T extends GlobalState>(global: T) {
  return JSON.stringify(reduceGlobal(global));
}

function reduceStickers<T extends GlobalState>(global: T): GlobalState['stickers'] {
  const { diceSetIdByEmoji, setsById } = global.stickers;
  return {
    ...INITIAL_GLOBAL_STATE.stickers,
    diceSetIdByEmoji,
    setsById: pickTruthy(setsById, Object.values(diceSetIdByEmoji || {})),
  };
}

function reduceCustomEmojis<T extends GlobalState>(global: T): GlobalState['customEmojis'] {
  const { lastRendered, byId } = global.customEmojis;
  const folderEmojiIds = Object.values(global.chatFolders.byId)
    .flatMap((folder) => (
      folder.title.entities
        ?.filter((entity) => entity.type === ApiMessageEntityTypes.CustomEmoji)
        ?.map((entity) => entity.documentId) || []
    ));
  const idsToSave = unique([...folderEmojiIds, ...lastRendered]).slice(0, GLOBAL_STATE_CACHE_CUSTOM_EMOJI_LIMIT);
  const byIdToSave = pick(byId, idsToSave);

  return {
    byId: byIdToSave,
    lastRendered: idsToSave,
    forEmoji: {},
    added: {},
    statusRecent: {},
  };
}

function reduceUsers<T extends GlobalState>(global: T): GlobalState['users'] {
  const {
    users: {
      byId, statusesById, fullInfoById, botAppPermissionsById,
    }, currentUserId,
  } = global;
  const currentChatIds = compact(
    Object.values(global.byTabId)
      .map(({ id: tabId }) => selectCurrentMessageList(global, tabId)),
  ).map(({ chatId }) => chatId).filter((chatId) => isUserId(chatId));

  const visibleUserIds = unique(compact(Object.values(global.byTabId)
    .flatMap(({ id: tabId }) => selectVisibleUsers(global, tabId)?.map((u) => u.id) || [])));

  const chatStoriesUserIds = currentChatIds
    .flatMap((chatId) => Object.values(selectChatMessages(global, chatId) || {}))
    .map((message) => {
      const webPage = selectFullWebPageFromMessage(global, message);
      return message.content.storyData?.peerId || webPage?.story?.peerId;
    })
    .filter((id): id is string => Boolean(id) && isUserId(id));

  const attachBotIds = Object.keys(global.attachMenu?.bots || {});

  const idsToSave = unique([
    ...currentUserId ? [currentUserId] : [],
    ...currentChatIds,
    ...chatStoriesUserIds,
    ...visibleUserIds || [],
    ...attachBotIds,
    ...global.topPeers.userIds || [],
    ...global.recentlyFoundChatIds?.filter(isUserId) || [],
    ...getOrderedIds(ARCHIVED_FOLDER_ID)?.slice(0, GLOBAL_STATE_CACHE_ARCHIVED_CHAT_LIST_LIMIT).filter(isUserId) || [],
    ...getOrderedIds(ALL_FOLDER_ID)?.filter(isUserId) || [],
    ...global.contactList?.userIds || [],
    ...Object.keys(byId),
  ]).slice(0, GLOBAL_STATE_CACHE_USER_LIST_LIMIT);

  return {
    ...INITIAL_GLOBAL_STATE.users,
    byId: pickTruthy(byId, idsToSave),
    statusesById: pickTruthy(statusesById, idsToSave),
    fullInfoById: pickTruthy(fullInfoById, idsToSave),
    botAppPermissionsById,
  };
}

function reduceChats<T extends GlobalState>(global: T): GlobalState['chats'] {
  const { chats: { byId }, currentUserId } = global;
  const currentChatIds = compact(
    Object.values(global.byTabId)
      .map(({ id: tabId }): MessageList | undefined => {
        return selectCurrentMessageList(global, tabId);
      }),
  ).map(({ chatId }) => chatId);

  const messagesChatIds = compact(Object.values(global.byTabId).flatMap(({ id: tabId }) => {
    const messageList = selectCurrentMessageList(global, tabId);
    if (!messageList) return undefined;

    const messages = selectChatMessages(global, messageList.chatId);
    const viewportIds = selectViewportIds(global, messageList.chatId, messageList.threadId, tabId);
    return viewportIds?.map((id) => {
      const message = messages[id];
      if (!message) return undefined;
      const content = message.content;
      const webPage = selectFullWebPageFromMessage(global, message);
      const replyPeer = message.replyInfo?.type === 'message' && message.replyInfo.replyToPeerId;
      return content.storyData?.peerId || webPage?.story?.peerId || replyPeer;
    });
  }));

  const unlinkedIdsToSave = [
    ...currentUserId ? [currentUserId] : [],
    ...currentChatIds,
    ...messagesChatIds,
    ...global.recentlyFoundChatIds || [],
    ...getOrderedIds(ARCHIVED_FOLDER_ID)?.slice(0, GLOBAL_STATE_CACHE_ARCHIVED_CHAT_LIST_LIMIT) || [],
    ...getOrderedIds(ALL_FOLDER_ID) || [],
    ...getOrderedIds(SAVED_FOLDER_ID) || [],
    ...Object.keys(byId),
  ];

  let idsToSave: string[] = [];

  for (const id of unlinkedIdsToSave) {
    const chat = byId[id];
    if (!chat) continue;

    idsToSave.push(id);

    if (chat.linkedMonoforumId) {
      idsToSave.push(chat.linkedMonoforumId);
    }
  }

  idsToSave = unique(idsToSave).slice(0, GLOBAL_STATE_CACHE_CHAT_LIST_LIMIT);

  return {
    ...global.chats,
    similarChannelsById: {},
    similarBotsById: {},
    isFullyLoaded: {},
    notifyExceptionById: pickTruthy(global.chats.notifyExceptionById, unlinkedIdsToSave),
    loadingParameters: INITIAL_GLOBAL_STATE.chats.loadingParameters,
    byId: pickTruthy(global.chats.byId, unlinkedIdsToSave),
    fullInfoById: pickTruthy(global.chats.fullInfoById, unlinkedIdsToSave),
    lastMessageIds: {
      all: pickTruthy(global.chats.lastMessageIds.all || {}, unlinkedIdsToSave),
      saved: global.chats.lastMessageIds.saved,
    },
    topicsInfoById: pickTruthy(global.chats.topicsInfoById, currentChatIds),
  };
}

function reduceSettings<T extends GlobalState>(global: T): GlobalState['settings'] {
  const {
    byKey, botVerificationShownPeerIds, notifyDefaults, lastPremiumBandwithNotificationDate, themes, accountDaysTtl,
  } = global.settings;

  return {
    byKey,
    privacy: {},
    botVerificationShownPeerIds,
    lastPremiumBandwithNotificationDate,
    notifyDefaults,
    themes,
    accountDaysTtl,
  };
}

function reduceChatFolders<T extends GlobalState>(global: T): GlobalState['chatFolders'] {
  return {
    ...global.chatFolders,
  };
}

function reduceGroupCalls<T extends GlobalState>(global: T): GlobalState['groupCalls'] {
  return {
    ...global.groupCalls,
    byId: {},
    activeGroupCallId: undefined,
  };
}

function reduceAvailableReactions(availableReactions?: ApiAvailableReaction[]): ApiAvailableReaction[] | undefined {
  return availableReactions
    ?.map((r) => pick(r, ['reaction', 'staticIcon', 'title', 'isInactive']));
}
