import { addCallback } from '../../../lib/teact/teactn';

import type { ApiNotification } from '../../../api/types';
import type { LangCode } from '../../../types';
import type { ActionReturnType, GlobalState } from '../../types';

import { requestMutation } from '../../../lib/fasterdom/fasterdom';
import { IS_ELECTRON, IS_MULTIACCOUNT_SUPPORTED, IS_TAURI } from '../../../util/browser/globalEnvironment';
import {
  IS_ANDROID, IS_IOS, IS_LINUX,
  IS_MAC_OS, IS_SAFARI, IS_TOUCH_ENV, IS_WINDOWS,
} from '../../../util/browser/windowEnvironment';
import { getCurrentTabId } from '../../../util/establishMultitabRole';
import generateUniqueId from '../../../util/generateUniqueId';
import { subscribe, unsubscribe } from '../../../util/notifications';
import { oldSetLanguage } from '../../../util/oldLangProvider';
import { decryptSessionByCurrentHash } from '../../../util/passcode';
import { applyPerformanceSettings } from '../../../util/perfomanceSettings';
import { hasStoredSession, storeSession } from '../../../util/sessions';
import switchTheme from '../../../util/switchTheme';
import { getSystemTheme, setSystemThemeChangeCallback } from '../../../util/systemTheme';
import { startWebsync, stopWebsync } from '../../../util/websync';
import { callApi } from '../../../api/gramjs';
import { clearCaching, setupCaching } from '../../cache';
import { addActionHandler, getGlobal, setGlobal } from '../../index';
import { updateSharedSettings } from '../../reducers';
import { updateAuth } from '../../reducers/auth';
import { updateTabState } from '../../reducers/tabs';
import {
  selectCanAnimateInterface,
  selectPerformanceSettings,
  selectSettingsKeys,
  selectTabState,
  selectTheme,
} from '../../selectors';
import { selectSharedSettings } from '../../selectors/sharedState';
import { destroySharedStatePort, initSharedState } from '../../shared/sharedStateConnector';

const HISTORY_ANIMATION_DURATION = 450;

// v0.65 (#050) — 탭별 Socket.io 멱등 가드.
// telegram-tt-ref/src/global/actions/ui/initial.ts:90 은 마스터 분기에서만 initApi() 를
// 호출한다(원본은 GramJS 워커 1개를 마스터가 소유하고 비마스터가 프록시하는 구조).
// 본 포크는 connector → Socket.io 로 탭마다 server.js(:9087) 와 자기 소켓을 직접 갖는
// 구조이므로, 마스터/비마스터 무관하게 모든 탭이 자기 initApi() 를 1회 호출해야 한다.
// 마스터 게이팅을 유지하면: 단독 탭에서 establishMultitabRole 이 비마스터 통지를 보낸 뒤
// switchMultitabRole 이 same-role EARLY RETURN 하여 initApi() 영구 미호출 → callApi 가
// apiRequestsQueue(init.ts:23) 에 적재만 되고 어떤 메시지도 전송/에러 없이 사라진다.
// 동시에 init.ts:25 의 setupUpdates 는 매 호출마다 소켓 이벤트 리스너를 재등록하므로
// 멱등 가드 없이 호출하면 update 핸들러가 중복 등록된다. 따라서 탭당 정확히 1회만 허용.
let hasInitedApiThisTab = false;

function ensureApiConnectedForThisTab(actions: any): void {
  const global = getGlobal();

  if (global.passcode.hasPasscode && global.passcode.isScreenLocked) {
    // eslint-disable-next-line no-console
    console.log('>>> ensureApiConnectedForThisTab SKIPPED - passcode locked');
    return;
  }

  if (hasInitedApiThisTab) {
    return;
  }
  hasInitedApiThisTab = true;

  if (global.connectionState === 'connectionStateReady') {
    setGlobal({
      ...global,
      connectionState: 'connectionStateConnecting',
    });
  }

  // eslint-disable-next-line no-console
  console.log('>>> ensureApiConnectedForThisTab -> initApi() (per-tab, master-independent)');
  actions.initApi();
}

setSystemThemeChangeCallback((theme) => {
  let global = getGlobal();

  if (!global.isInited || !selectSharedSettings(global).shouldUseSystemTheme) return;

  global = updateSharedSettings(global, { theme });
  setGlobal(global);
});

addActionHandler('switchMultitabRole', async (global, actions, payload): Promise<void> => {
  const { isMasterTab, tabId = getCurrentTabId() } = payload;
  // eslint-disable-next-line no-console
  console.log('>>> switchMultitabRole called, isMasterTab:', isMasterTab, 'current:', selectTabState(global, tabId).isMasterTab);

  if (isMasterTab === selectTabState(global, tabId).isMasterTab) {
    // eslint-disable-next-line no-console
    console.log('>>> switchMultitabRole EARLY RETURN (same role)');
    callApi('broadcastLocalDbUpdateFull');
    // v0.65 (#050) same-role 통지(비마스터 단독 탭 포함) 에서도 자기 소켓을 연결.
    ensureApiConnectedForThisTab(actions);
    return;
  }

  global = updateTabState(global, {
    isMasterTab,
  }, tabId);
  setGlobal(global, { forceSyncOnIOs: true });

  if (!isMasterTab) {
    void unsubscribe();
    // v0.65 (#050) 탭별 소켓 구조이므로 강등 시 자기 소켓을 끊으면 안 된다.
    // actions.destroyConnection() / stopWebsync() / clearCaching() 제거 — 이전엔 마스터가
    // GramJS 워커를 소유한다는 telegram-tt 가정에서 비롯된 정리였으나 본 포크엔 무의미·유해.
    destroySharedStatePort();
    actions.onSomeTabSwitchedMultitabRole();
    ensureApiConnectedForThisTab(actions);
  } else {
    if (global.passcode.hasPasscode && !global.passcode.isScreenLocked) {
      const { sessionJson } = await decryptSessionByCurrentHash();
      const session = JSON.parse(sessionJson);
      storeSession(session);
    }

    if (hasStoredSession()) {
      setupCaching();
    }

    ensureApiConnectedForThisTab(actions);

    startWebsync();
    if (IS_MULTIACCOUNT_SUPPORTED) {
      global = getGlobal();
      initSharedState(global.sharedState);
    }
  }
});

addActionHandler('onSomeTabSwitchedMultitabRole', async (global): Promise<void> => {
  if (global.passcode.hasPasscode && !global.passcode.isScreenLocked) {
    const { sessionJson } = await decryptSessionByCurrentHash();
    const session = JSON.parse(sessionJson);
    storeSession(session);
  }

  callApi('broadcastLocalDbUpdateFull');
});

addActionHandler('initShared', (): ActionReturnType => {
  startWebsync();
});

addActionHandler('initMain', (global): ActionReturnType => {
  const { hasWebNotifications, hasPushNotifications } = selectSettingsKeys(global);
  if (hasWebNotifications && hasPushNotifications) {
    // Most of the browsers only show the notifications permission prompt after the first user gesture.
    const events = ['click', 'keypress'];
    const subscribeAfterUserGesture = () => {
      void subscribe();
      events.forEach((event) => {
        document.removeEventListener(event, subscribeAfterUserGesture);
      });
    };
    events.forEach((event) => {
      document.addEventListener(event, subscribeAfterUserGesture, { once: true });
    });
  }
});

addCallback((global: GlobalState) => {
  let isUpdated = false;
  const tabState = selectTabState(global, getCurrentTabId());
  if (!tabState?.shouldInit) return;

  global = getGlobal();

  global = updateTabState(global, {
    shouldInit: false,
  }, tabState.id);

  const { messageTextSize, language, shouldUseSystemTheme } = selectSharedSettings(global);

  const globalTheme = selectTheme(global);
  const systemTheme = getSystemTheme();
  const theme = shouldUseSystemTheme ? systemTheme : globalTheme;

  const performanceType = selectPerformanceSettings(global);

  void oldSetLanguage(language as LangCode, undefined);

  requestMutation(() => {
    document.documentElement.style.setProperty(
      '--composer-text-size', `${Math.max(messageTextSize, IS_IOS ? 16 : 15)}px`,
    );
    document.documentElement.style.setProperty('--message-meta-height', `${Math.floor(messageTextSize * 1.3125)}px`);
    document.documentElement.style.setProperty('--message-text-size', `${messageTextSize}px`);
    document.documentElement.setAttribute('data-message-text-size', messageTextSize.toString());
    document.body.classList.add('initial');
    document.body.classList.add(IS_TOUCH_ENV ? 'is-touch-env' : 'is-pointer-env');
    applyPerformanceSettings(performanceType);

    if (IS_IOS) {
      document.body.classList.add('is-ios');
    } else if (IS_ANDROID) {
      document.body.classList.add('is-android');
    } else if (IS_MAC_OS) {
      document.body.classList.add('is-macos');
    } else if (IS_WINDOWS) {
      document.body.classList.add('is-windows');
    } else if (IS_LINUX) {
      document.body.classList.add('is-linux');
    }
    if (IS_SAFARI) {
      document.body.classList.add('is-safari');
    }
    if (IS_TAURI) {
      document.body.classList.add('is-tauri');
    }
    if (IS_ELECTRON) { // Legacy, pretend to be Tauri
      document.body.classList.add('is-tauri');
    }
  });

  const canAnimate = selectCanAnimateInterface(global);

  switchTheme(theme, canAnimate);
  // Make sure global has the latest theme. Will cause `switchTheme` on change
  global = updateSharedSettings(global, { theme });

  startWebsync();

  isUpdated = true;

  if (isUpdated) setGlobal(global);
});

addActionHandler('setInstallPrompt', (global, actions, payload): ActionReturnType => {
  const { canInstall, tabId = getCurrentTabId() } = payload;
  return updateTabState(global, {
    canInstall,
  }, tabId);
});

addActionHandler('setIsUiReady', (global, actions, payload): ActionReturnType => {
  const { uiReadyState, tabId = getCurrentTabId() } = payload;

  if (uiReadyState === 2) {
    requestMutation(() => {
      document.body.classList.remove('initial');
    });
  }

  return updateTabState(global, {
    uiReadyState,
  }, tabId);
});

addActionHandler('setAuthPhoneNumber', (global, actions, payload): ActionReturnType => {
  const { phoneNumber } = payload;

  return updateAuth(global, {
    phoneNumber,
  });
});

addActionHandler('setAuthRememberMe', (global, actions, payload): ActionReturnType => {
  return updateAuth(global, {
    rememberMe: Boolean(payload.value),
  });
});

addActionHandler('clearAuthErrorKey', (global): ActionReturnType => {
  return updateAuth(global, {
    errorKey: undefined,
  });
});

addActionHandler('disableHistoryAnimations', (global, actions, payload): ActionReturnType => {
  const { tabId = getCurrentTabId() } = payload || {};

  setTimeout(() => {
    global = getGlobal();
    global = updateTabState(global, {
      shouldSkipHistoryAnimations: false,
    }, tabId);
    setGlobal(global);

    requestMutation(() => {
      document.body.classList.remove('no-animate');
    });
  }, HISTORY_ANIMATION_DURATION);

  global = updateTabState(global, {
    shouldSkipHistoryAnimations: true,
  }, tabId);
  setGlobal(global, { forceSyncOnIOs: true });
});

addActionHandler('showNotification', (global, actions, payload): ActionReturnType => {
  const { tabId = getCurrentTabId(), ...notification } = payload;
  const hasLocalId = notification.localId;
  notification.localId ||= generateUniqueId();

  const newNotifications = [...selectTabState(global, tabId).notifications];
  const existingNotificationIndex = newNotifications.findIndex((n) => (
    hasLocalId ? n.localId === notification.localId : n.message === notification.message
  ));
  if (existingNotificationIndex !== -1) {
    newNotifications.splice(existingNotificationIndex, 1);
  }

  newNotifications.push(notification as ApiNotification);

  return updateTabState(global, {
    notifications: newNotifications,
  }, tabId);
});

addActionHandler('dismissNotification', (global, actions, payload): ActionReturnType => {
  const { tabId = getCurrentTabId() } = payload;
  const newNotifications = selectTabState(global, tabId)
    .notifications.filter(({ localId }) => localId !== payload.localId);

  return updateTabState(global, {
    notifications: newNotifications,
  }, tabId);
});
