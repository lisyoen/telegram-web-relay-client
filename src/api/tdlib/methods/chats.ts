/**
 * TDLib Chats API
 */
import type { ApiChat, ApiChatMember, ApiPeer, ApiUser, ApiUserStatus } from '../../types';

import { buildApiBotCommands, buildApiChat, buildApiChats, buildApiUser } from '../converters';
import { callApi } from './init';

type ChatListData = {
  chatIds: string[];
  chats: ApiChat[];
  users?: any[];
  userStatusesById?: Record<string, any>;
  orderedPinnedIds?: string[];
};

export async function fetchChats({
  limit,
  archived,
}: {
  limit: number;
  offsetDate?: number;
  offsetPeer?: ApiPeer;
  offsetId?: number;
  archived?: boolean;
  withPinned?: boolean;
  lastLocalServiceMessageId?: number;
}): Promise<ChatListData | undefined> {
  try {
    const response = await callApi('fetchChats', {
      limit,
      archived: archived || false,
    });

    if (!response || !response.chats) {
      return undefined;
    }

    const { chats: apiChats, orderedPinnedIds } = buildApiChats(response.chats);
    const chatIds = apiChats.map((chat) => chat.id);

    return {
      chatIds,
      chats: apiChats,
      orderedPinnedIds,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[TDLib] fetchChats error:', error);
    return undefined;
  }
}

export async function fetchFullChat(chat?: ApiChat) {
  // v0.23: 1:1 봇 채팅에 한해 server.js getBotCommands 로 botCommands 만 채운다.
  // v0.55: 그룹/슈퍼그룹 채팅도 그룹 분기로 chatFullInfo.botCommands 적재.
  // 비봇 1:1 / 채널 등 그 외는 종전 stub 동작(undefined) 유지 — 회귀 방지.
  if (!chat || !chat.id) {
    return undefined;
  }
  if (chat.type === 'chatTypePrivate') {
    try {
      const response = await callApi<{ commands?: Array<{ command: string; description?: string }> }>(
        'getBotCommands',
        { userId: chat.id },
      );
      const botCommands = buildApiBotCommands(String(chat.id), response?.commands);
      if (!botCommands.length) {
        return undefined;
      }
      return {
        fullInfo: { botCommands },
        chats: [],
        userStatusesById: {},
      };
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[v0.23 botCommands] fetchFullChat error:', e);
      return undefined;
    }
  }
  if (chat.type === 'chatTypeBasicGroup' || chat.type === 'chatTypeSuperGroup') {
    try {
      const response = await callApi<{
        commands?: Array<{ command: string; description?: string; botId?: string }>;
        group?: boolean;
        source?: string;
      }>('getBotCommands', { chatId: chat.id });
      const raw = response?.commands || [];
      const botCommands = raw
        .filter((c) => c && typeof c.command === 'string')
        .map((c) => ({
          botId: String(c.botId || ''),
          command: c.command,
          description: c.description || '',
        }))
        .filter((c) => c.botId);
      if (!botCommands.length) {
        // 봇 없는 일반 그룹/명령 미등록 → undefined (replaceChatFullInfo 회귀 차단)
        return undefined;
      }
      return {
        fullInfo: { botCommands },
        chats: [],
        userStatusesById: {},
      };
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[v0.55 botCommands group] fetchFullChat error:', e);
      return undefined;
    }
  }
  return undefined;
}

export async function fetchChat() {
  // Phase 2에서 구현
  return undefined;
}

type SearchChatsResult = {
  accountResultIds: string[];
  globalResultIds: string[];
  chats: ApiChat[];
  users: ApiUser[];
  userStatusesById: Record<string, ApiUserStatus>;
};

function normalizeApiChat(chat: any): ApiChat {
  if (chat?.type && typeof chat.type === 'string') {
    return chat as ApiChat;
  }
  return buildApiChat(chat);
}

function normalizeApiUser(user: any): ApiUser {
  if (user?.firstName !== undefined || user?.usernames !== undefined) {
    return user as ApiUser;
  }
  return buildApiUser(user);
}

export async function searchChats({ query }: { query: string }): Promise<SearchChatsResult | undefined> {
  try {
    const response = await callApi<SearchChatsResult>('searchChats', { query });
    if (!response) {
      return undefined;
    }

    const chats = (response.chats || []).map(normalizeApiChat);
    const users = (response.users || []).map(normalizeApiUser);

    return {
      accountResultIds: response.accountResultIds || [],
      globalResultIds: response.globalResultIds || [],
      chats,
      users,
      userStatusesById: response.userStatusesById || {},
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[TDLib] searchChats error:', error);
    return undefined;
  }
}

export async function fetchChatSettings() {
  // Phase 2에서 구현
  return undefined;
}

export async function updateChatMutedState() {
  // Phase 2에서 구현
  return undefined;
}

export async function createChannel() {
  // Phase 2에서 구현
  return undefined;
}

export async function joinChannel() {
  // Phase 2에서 구현
  return undefined;
}

export async function deleteChatUser() {
  // Phase 2에서 구현
  return undefined;
}

export async function deleteChat() {
  // Phase 2에서 구현
  return undefined;
}

export async function leaveChannel() {
  // Phase 2에서 구현
  return undefined;
}

export async function deleteChannel() {
  // Phase 2에서 구현
  return undefined;
}

export async function createGroupChat() {
  // Phase 2에서 구현
  return undefined;
}

export async function editChatPhoto() {
  // Phase 2에서 구현
  return undefined;
}

export async function setChatEmojiStatus() {
  // Phase 2에서 구현
  return undefined;
}

export async function toggleSignatures() {
  // Phase 2에서 구현
  return undefined;
}

export async function updateChatDefaultBannedRights() {
  // Phase 2에서 구현
  return undefined;
}

export async function updateChatMemberBannedRights() {
  // Phase 2에서 구현
  return undefined;
}

export async function updateChatAdmin() {
  // Phase 2에서 구현
  return undefined;
}

export async function updateChatAbout() {
  // Phase 2에서 구현
  return undefined;
}

export async function updateChatTitle() {
  // Phase 2에서 구현
  return undefined;
}

export async function toggleChatPinned() {
  // Phase 2에서 구현
  return undefined;
}

export async function toggleChatArchived() {
  // Phase 2에서 구현
  return undefined;
}

export async function toggleChatUnread() {
  // Phase 2에서 구현
  return undefined;
}

export async function loadChatFolders() {
  // Phase 2에서 구현
  return undefined;
}

export async function loadRecommendedChatFolders() {
  // Phase 2에서 구현
  return undefined;
}

export async function editChatFolder() {
  // Phase 2에서 구현
  return undefined;
}

export async function deleteChatFolder() {
  // Phase 2에서 구현
  return undefined;
}

export async function sortChatFolders() {
  // Phase 2에서 구현
  return undefined;
}

export async function toggleDialogUnread() {
  // Phase 2에서 구현
  return undefined;
}

export async function loadChatJoin() {
  // Phase 2에서 구현
  return undefined;
}

export async function importChatInvite() {
  // Phase 2에서 구현
  return undefined;
}

function tdUserStatusToApi(st: any): ApiUserStatus {
  const t = st && st._;
  switch (t) {
    case 'userStatusOnline':
      return { type: 'userStatusOnline', expires: Number(st.expires) || 0 };
    case 'userStatusOffline':
      return { type: 'userStatusOffline', wasOnline: Number(st.was_online) || 0 };
    case 'userStatusRecently':
      return { type: 'userStatusRecently' };
    case 'userStatusLastWeek':
      return { type: 'userStatusLastWeek' };
    case 'userStatusLastMonth':
      return { type: 'userStatusLastMonth' };
    default:
      return { type: 'userStatusEmpty' };
  }
}

// [027] v2 그룹 정보 패널 참가자 탭 — loadMoreMembers 액션이 호출하는 진입점
// server.js getGroupMembers 에서 원시 TDLib user 객체를 받아 buildApiUser 로 변환
// [028] userStatusesById 하드코딩 제거 → 실제 TDLib status 매핑
export async function fetchMembers({ chat, offset = 0 }: { chat: ApiChat; offset?: number }): Promise<
  { members: ApiChatMember[]; users: ApiUser[]; userStatusesById: Record<string, ApiUserStatus> } | undefined
> {
  if (!chat || !chat.id) return undefined;
  try {
    const response = await callApi<{
      total_count: number;
      members: Array<{ userId: string; isAdmin?: boolean; isOwner?: boolean }>;
      users: any[];
    }>('getGroupMembers', { chatId: chat.id, offset, limit: 200 });

    if (!response || !response.members || !response.members.length) return undefined;

    const members: ApiChatMember[] = response.members.map((m) => ({
      userId: m.userId,
      ...(m.isOwner ? { isOwner: true as const } : {}),
      ...(m.isAdmin ? { isAdmin: true as const } : {}),
    }));

    const users: ApiUser[] = (response.users || []).map((u: any) => buildApiUser(u));

    const userStatusesById: Record<string, ApiUserStatus> = {};
    for (const u of response.users || []) {
      userStatusesById[String(u.id)] = tdUserStatusToApi(u.status);
    }

    return { members, users, userStatusesById };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[fetchMembers] error:', e);
    return undefined;
  }
}
