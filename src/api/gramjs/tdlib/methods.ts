// TDLib-based method implementations for Phase 1

import type { ApiChat, ApiChatMember, ApiMessage, ApiUser, ApiUserStatus } from '../../types';
import type { ThreadId } from '../../../types';

import { MAIN_THREAD_ID } from '../../types';
import { getTdLibClient } from './socketClient';
import {
  buildApiChatFromTdLib,
  buildApiMessageFromTdLib,
  buildApiUserFromTdLib,
} from './converters';
import { sendApiUpdate } from '../updates/apiUpdateEmitter';

type ChatListData = {
  chatIds: string[];
  chats: ApiChat[];
  users: ApiUser[];
  draftsById: Record<string, any>;
  replyingToById: Record<string, any>;
  orderedPinnedIds?: string[];
};

export async function fetchChats({
  limit,
  offsetDate,
  offsetPeer,
  offsetId,
  archived,
  withPinned,
  lastLocalServiceMessageId,
}: {
  limit: number;
  offsetDate?: number;
  offsetPeer?: any;
  offsetId?: number;
  archived?: boolean;
  withPinned?: boolean;
  lastLocalServiceMessageId?: number;
}): Promise<ChatListData | undefined> {
  try {
    const client = getTdLibClient();

    const tdChats = await client.getChats({
      limit,
    });

    if (!tdChats || tdChats.length === 0) {
      return undefined;
    }

    const chats = tdChats.map(buildApiChatFromTdLib);
    const chatIds = chats.map((chat) => chat.id);

    const users = [];
    for (const tdChat of tdChats) {
      if (tdChat._user) {
        users.push(buildApiUserFromTdLib(tdChat._user));
      }
    }

    return {
      chatIds,
      chats,
      users,
      draftsById: {},
      replyingToById: {},
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[TDLib] fetchChats error:', error);
    return undefined;
  }
}

export async function fetchMessages({
  chat,
  threadId,
  offsetId,
  isSavedDialog,
  addOffset,
  limit,
}: {
  chat: ApiChat;
  threadId?: ThreadId;
  offsetId?: number;
  isSavedDialog?: boolean;
  addOffset?: number;
  limit: number;
}) {
  try {
    const client = getTdLibClient();
    const chatId = Number(chat.id);

    const tdMessages = await client.getMessages({
      chatId,
      limit,
      fromMessageId: offsetId,
    });

    if (!tdMessages || tdMessages.length === 0) {
      return undefined;
    }

    const messages = tdMessages.map(buildApiMessageFromTdLib);

    return {
      messages,
      users: [],
      chats: [],
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[TDLib] fetchMessages error:', error);
    return undefined;
  }
}

export async function sendMessage(params: {
  chat: ApiChat;
  text?: string;
  entities?: any[];
  replyInfo?: any;
  attachment?: any;
  sticker?: any;
  isSilent?: boolean;
  scheduledAt?: number;
  sendAs?: any;
  groupedId?: string;
  noWebPage?: boolean;
}) {
  try {
    const client = getTdLibClient();
    const chatId = Number(params.chat.id);

    if (!params.text) {
      return undefined;
    }

    const tdMessage = await client.sendMessage({
      chatId,
      text: params.text,
      replyToMessageId: params.replyInfo?.replyToMsgId,
    });

    if (!tdMessage) {
      return undefined;
    }

    const message = buildApiMessageFromTdLib(tdMessage);

    // Send update to UI
    sendApiUpdate({
      '@type': 'updateNewMessage',
      id: message.id,
      chatId: message.chatId,
      message,
    });

    return message;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[TDLib] sendMessage error:', error);
    return undefined;
  }
}

export async function markMessagesRead({
  chat,
  messageIds,
}: {
  chat: ApiChat;
  messageIds: number[];
}) {
  try {
    const client = getTdLibClient();
    const chatId = Number(chat.id);

    await client.markAsRead({
      chatId,
      messageIds,
    });

    // Send update to UI
    sendApiUpdate({
      '@type': 'updateCommonBoxMessages',
      ids: messageIds,
      messageUpdate: {
        hasUnreadMention: false,
        isMediaUnread: false,
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[TDLib] markMessagesRead error:', error);
  }
}

export async function markMessageListRead({
  chat,
  threadId,
  maxId,
}: {
  chat: ApiChat;
  threadId?: ThreadId;
  maxId?: number;
}) {
  try {
    const client = getTdLibClient();
    const chatId = Number(chat.id);
    const effectiveMaxId = Number(maxId || 0);

    if (!effectiveMaxId) return;
    if (threadId !== undefined && threadId !== MAIN_THREAD_ID) return;

    await client.markAsRead({
      chatId,
      messageIds: [effectiveMaxId],
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[TDLib] markMessageListRead error:', error);
  }
}

export async function saveDraft({
  chat,
  draft,
}: {
  chat: ApiChat;
  draft?: any;
}): Promise<{ ok: boolean } | undefined> {
  try {
    const client = getTdLibClient();
    const chatId = String(chat.id);
    const text = draft?.text?.text || '';
    const entities = draft?.text?.entities;
    const replyToMessageId = draft?.replyInfo?.replyToMsgId;

    return await client.saveDraft({
      chatId,
      text,
      ...(entities ? { entities } : {}),
      ...(replyToMessageId ? { replyToMessageId } : {}),
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[TDLib] saveDraft error:', error);
    return undefined;
  }
}

// Placeholder implementations for other required methods
export async function fetchSavedChats(params: any) {
  return undefined;
}

export async function fetchFullChat(chat: ApiChat) {
  return undefined;
}

export async function fetchPeerSettings(peer: any) {
  return undefined;
}

export async function fetchChat(params: any) {
  return undefined;
}

export async function fetchChatFolders() {
  return undefined;
}

export async function fetchPinnedDialogs(params: any) {
  return undefined;
}

export async function fetchRecommendedChatFolders() {
  return undefined;
}

export async function fetchMembers({
  chat,
  offset,
  query,
}: {
  chat: ApiChat;
  offset?: number;
  query?: string;
}) {
  try {
    const client = getTdLibClient();
    const chatId = Number(chat.id);

    const membersData = await client.searchMembers({
      chatId,
      query: query || '',
    });

    if (!membersData || membersData.length === 0) {
      return undefined;
    }

    const members: ApiChatMember[] = [];
    const users: ApiUser[] = [];
    const userStatusesById: Record<string, ApiUserStatus> = {};

    membersData.forEach((memberData) => {
      const userId = memberData.userId;

      // Build ApiChatMember
      members.push({
        userId,
      });

      // Build ApiUser
      const nameParts = memberData.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ');

      const user: ApiUser = {
        id: userId,
        type: 'userTypeRegular',
        isMin: false,
        firstName,
        phoneNumber: '',
      };

      if (lastName) {
        user.lastName = lastName;
      }

      if (memberData.username) {
        user.usernames = [{
          username: memberData.username,
          isActive: true,
          isEditable: false,
        }];
        user.hasUsername = true;
      }

      users.push(user);

      // Build ApiUserStatus (default to empty)
      userStatusesById[userId] = {
        type: 'userStatusEmpty',
      };
    });

    return {
      members,
      users,
      userStatusesById,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[TDLib] fetchMembers error:', error);
    return undefined;
  }
}

export async function fetchMember(params: any) {
  return undefined;
}

export async function fetchGroupsForDiscussion() {
  return undefined;
}

export async function fetchLeaveChatlistSuggestions(params: any) {
  return undefined;
}

export async function fetchChatlistInvites(params: any) {
  return undefined;
}

export async function fetchChannelRecommendations(params: any) {
  return undefined;
}

export async function fetchSponsoredPeer(params: any) {
  return undefined;
}
