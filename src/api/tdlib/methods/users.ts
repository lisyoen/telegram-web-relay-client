/**
 * TDLib Users API
 */
import type { ApiUserFullInfo } from '../../types';

import { buildApiBotCommands, buildApiUser } from '../converters';
import { callApi } from './init';

export async function fetchCurrentUser() {
  try {
    const response = await callApi('fetchCurrentUser');

    if (!response || !response.user) {
      return undefined;
    }

    const user = buildApiUser(response.user);

    return { user };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[TDLib] fetchCurrentUser error:', error);
    return undefined;
  }
}

// v0.25: 1:1 봇 채팅 botCommands 바인딩. Composer mapStateToProps 는
// isChatWithUser=true 일 때 chatFullInfo 를 보지 않고 userFullInfo.botInfo.commands
// 만 본다(v2 src/components/common/Composer.tsx:2670). 그래서 v0.23/v0.24 가 채운
// chatFullInfo.botCommands 는 봇 DM 에서 안 읽힌다. 본 함수는 server.js getBotCommands
// 응답({commands, user}) 을 받아 ApiUser + ApiUserFullInfo(botInfo.commands) 를 만들어
// loadFullUser → updateUserFullInfo 경로로 users.fullInfoById[id] 에 적재한다.
//
// 비봇(self/일반 유저)도 createPrivateChat→getUser 로 user 는 채워지고 commands 만
// 빈 배열이 되므로, fullInfo 는 botInfo 없이 반환되어 회귀가 발생하지 않는다.
export async function fetchFullUser(args: { id: string; accessHash?: string }) {
  if (!args || !args.id) return undefined;
  const userId = String(args.id);
  try {
    const response = await callApi<{
      commands?: Array<{ command: string; description?: string }>;
      user?: any;
      commonChatsCount?: number;
    }>('getBotCommands', { userId });
    const rawUser = response && response.user;
    if (!rawUser) {
      return undefined;
    }
    const user = buildApiUser(rawUser);
    const commands = buildApiBotCommands(userId, response?.commands);
    const fullInfo: ApiUserFullInfo = {};
    if (commands.length) {
      fullInfo.botInfo = {
        botId: userId,
        commands,
        menuButton: { type: 'commands' },
      };
    }
    // v0.48: 1:1 유저 프로필 "그룹" 탭(공통그룹) 노출 조건. server.js getBotCommands 가
    // getGroupsInCommon limit=1 의 total_count 를 함께 반환. Profile.tsx hasCommonChatsTab
    // 은 userFullInfo?.commonChatsCount Boolean 으로 판정.
    if (typeof response?.commonChatsCount === 'number') {
      fullInfo.commonChatsCount = response.commonChatsCount;
    }
    return {
      user,
      fullInfo,
      users: [],
      chats: [],
      userStatusesById: {},
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[v0.25 fetchFullUser] error id', userId, e);
    return undefined;
  }
}

export async function fetchCommonChats(args: { user: { id: string }; maxId?: string }) {
  // v0.48: server.js fetchCommonChats 핸들러로 위임. 응답 shape:
  //   { chatIds: string[], count: number, chats: ApiChat[] }
  // chats 는 GroupChatInfo 가 global.chats[id] 를 lookup 하기 위함이며
  // global/actions/api/users.ts:loadCommonChats 가 updateChats 로 머지한다.
  if (!args || !args.user || !args.user.id) return undefined;
  try {
    const response = await callApi<{
      chatIds?: string[];
      count?: number;
      chats?: any[];
    }>('fetchCommonChats', {
      user: { id: String(args.user.id) },
      maxId: args.maxId,
    });
    if (!response) return undefined;
    return {
      chatIds: response.chatIds || [],
      count: response.count || 0,
      chats: response.chats || [],
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[v0.48 fetchCommonChats] error', e);
    return undefined;
  }
}

export async function fetchNearestCountry() {
  // Phase 2에서 구현
  return undefined;
}

export async function fetchTopUsers() {
  // Phase 2에서 구현
  return undefined;
}

export async function fetchContactList() {
  // Phase 2에서 구현
  return undefined;
}

export async function fetchUsers() {
  // Phase 2에서 구현
  return undefined;
}

export async function setUserStatus() {
  // Phase 2에서 구현
  return undefined;
}

export async function updateProfile() {
  // Phase 2에서 구현
  return undefined;
}

export async function updateBotProfile() {
  // Phase 2에서 구현
  return undefined;
}

export async function checkUsername() {
  // Phase 2에서 구현
  return undefined;
}

export async function updateUsername() {
  // Phase 2에서 구현
  return undefined;
}

export async function updateUserEmojiStatus() {
  // Phase 2에서 구현
  return undefined;
}

export async function toggleUsername() {
  // Phase 2에서 구현
  return undefined;
}

export async function sortUsernames() {
  // Phase 2에서 구현
  return undefined;
}

export async function deleteContact() {
  // Phase 2에서 구현
  return undefined;
}

export async function addContact() {
  // Phase 2에서 구현
  return undefined;
}

export async function importContact() {
  // Phase 2에서 구현
  return undefined;
}

export async function updateContact() {
  // Phase 2에서 구현
  return undefined;
}

export async function fetchProfilePhotos() {
  // Phase 2에서 구현
  return undefined;
}

export async function uploadProfilePhoto() {
  // Phase 2에서 구현
  return undefined;
}

export async function deleteProfilePhotos() {
  // Phase 2에서 구현
  return undefined;
}

export async function updateProfilePhoto() {
  // Phase 2에서 구현
  return undefined;
}

export async function reportSpam() {
  // Phase 2에서 구현
  return undefined;
}

export async function reportPeer() {
  // Phase 2에서 구현
  return undefined;
}

export async function reportProfilePhoto() {
  // Phase 2에서 구현
  return undefined;
}
