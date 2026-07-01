/**
 * TDLib Messages API
 */
import type { ThreadId } from '../../../types';
import type {
  ApiAttachment, ApiChat, ApiMessage, ApiOnProgress, ApiPeer, ApiUserStatus,
} from '../../types';
import type { ApiGlobalMessageSearchType, ApiMessageSearchContext } from '../../types/messages';

import { buildApiChat, buildApiMessage, buildApiUser } from '../converters';
import { callApi } from './init';

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function fetchMessages({
  chat,
  threadId,
  offsetId,
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
    const response = await callApi('fetchMessages', {
      chat: { id: chat.id },
      offsetId: offsetId || 0,
      addOffset: addOffset || 0,
      limit,
    });

    if (!response || !response.messages) {
      return undefined;
    }

    const messages = response.messages.map(buildApiMessage).filter(Boolean);

    return {
      messages,
      users: response.users || [],
      chats: response.chats || [],
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[TDLib] fetchMessages error:', error);
    return undefined;
  }
}

export async function sendMessage(
  params: {
    chat: ApiChat;
    text?: string;
    replyInfo?: any;
    attachment?: ApiAttachment;
    localMessage?: ApiMessage;
  },
  onProgress?: ApiOnProgress,
) {
  try {
    if (params.attachment) {
      const att = params.attachment;
      const dataUri = await blobToDataUri(att.blob);
      const isImage = Boolean(att.quick && !att.shouldSendAsFile && att.mimeType?.startsWith('image/'));
      const response = await callApi(isImage ? 'sendImage' : 'sendFile', {
        chat: { id: params.chat.id },
        chatId: params.chat.id,
        imageData: isImage ? dataUri : undefined,
        fileData: !isImage ? dataUri : undefined,
        fileName: att.filename,
        mimeType: att.mimeType,
        caption: params.text || '',
        replyInfo: params.replyInfo,
      });
      return response;
    }

    const response = await callApi('sendMessage', {
      chat: { id: params.chat.id },
      text: params.text || '',
      replyInfo: params.replyInfo,
    });

    return response;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[TDLib] sendMessage error:', error);
    return undefined;
  }
}

export async function editMessage(
  params: {
    chat: ApiChat;
    message: ApiMessage;
    text?: string;
    entities?: any;
    attachment?: ApiAttachment;
    noWebPage?: boolean;
  },
  onProgress?: ApiOnProgress,
) {
  try {
    const response = await callApi('editMessage', {
      chat: { id: params.chat.id },
      chatId: params.chat.id,
      message: { id: params.message.id },
      messageId: params.message.id,
      text: params.text || '',
    });
    return response;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[TDLib] editMessage error:', error);
    return undefined;
  }
}

export async function deleteMessages(params: {
  chat: { id: string | number };
  messageIds: number[];
  shouldDeleteForAll?: boolean;
}) {
  try {
    const response = await callApi('deleteMessages', {
      chatId: String(params.chat.id),
      messageIds: params.messageIds,
      revoke: !!params.shouldDeleteForAll,
    });
    return response;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[TDLib] deleteMessages error:', error);
    return undefined;
  }
}

export async function forwardMessages() {
  // Phase 2에서 구현
  return undefined;
}

export async function loadPollOptionResults() {
  // Phase 2에서 구현
  return undefined;
}

export async function sendPollVote() {
  // Phase 2에서 구현
  return undefined;
}

export async function closePoll() {
  // Phase 2에서 구현
  return undefined;
}

export async function loadExtendedMedia() {
  // Phase 2에서 구현
  return undefined;
}

export async function fetchWebPagePreview() {
  // Phase 2에서 구현
  return undefined;
}

export async function sendMessageAction() {
  // Phase 2에서 구현
  return undefined;
}

export async function fetchSendAs() {
  // Phase 2에서 구현
  return undefined;
}

export async function saveDefaultSendAs() {
  // Phase 2에서 구현
  return undefined;
}

export async function fetchSeenBy() {
  // Phase 2에서 구현
  return undefined;
}

export async function fetchSponsoredMessages() {
  // Phase 2에서 구현
  return undefined;
}

export async function viewSponsoredMessage() {
  // Phase 2에서 구현
  return undefined;
}

export async function clickSponsoredMessage() {
  // Phase 2에서 구현
  return undefined;
}

export async function fetchSendMessageActionEmoji() {
  // Phase 2에서 구현
  return undefined;
}

export async function fetchReactions() {
  // Phase 2에서 구현
  return undefined;
}

export async function sendEmojiInteraction() {
  // Phase 2에서 구현
  return undefined;
}

export async function sendWatchingEmojiInteraction() {
  // Phase 2에서 구현
  return undefined;
}

export async function stopActiveEmojiInteraction() {
  // Phase 2에서 구현
  return undefined;
}

export async function fetchDefaultTopicIcons() {
  // Phase 2에서 구현
  return undefined;
}

export async function sendMessageLocal() {
  // Phase 2에서 구현 (로컬 메시지 생성은 TDLib에서 처리)
  return undefined;
}

export async function pinMessage() {
  // Phase 2에서 구현
  return undefined;
}

export async function unpinMessage() {
  // Phase 2에서 구현
  return undefined;
}

export async function unpinAllMessages() {
  // Phase 2에서 구현
  return undefined;
}

export async function deleteScheduledMessages() {
  // Phase 2에서 구현
  return undefined;
}

export async function reportMessages() {
  // Phase 2에서 구현
  return undefined;
}

export async function sendScheduledMessages() {
  // Phase 2에서 구현
  return undefined;
}

export async function rescheduleMessage() {
  // Phase 2에서 구현
  return undefined;
}

export async function fetchScheduledHistory() {
  // Phase 2에서 구현
  return undefined;
}

export async function fetchMessageLink() {
  // Phase 2에서 구현
  return undefined;
}

export async function fetchMessagesById() {
  // Phase 2에서 구현
  return undefined;
}

export async function transcribeAudio() {
  // Phase 2에서 구현
  return undefined;
}

export async function translateText() {
  // Phase 2에서 구현
  return undefined;
}

export async function transcribeVideo() {
  // Phase 2에서 구현
  return undefined;
}

export async function requestMessageTranslation() {
  // Phase 2에서 구현
  return undefined;
}

export async function searchMessagesLocal() {
  // Phase 2에서 구현
  return undefined;
}

type SearchMessagesGlobalResult = {
  messages: ApiMessage[];
  userStatusesById: Record<number, ApiUserStatus>;
  totalCount: number;
  nextOffsetRate?: number;
  nextOffsetPeerId?: string;
  nextOffsetId?: number;
  searchFlood?: any;
  chats?: ApiChat[];
  users?: any[];
};

function normalizeApiMessage(message: any): ApiMessage | undefined {
  if (!message) return undefined;
  if (message.chatId !== undefined && message.content !== undefined) {
    return message as ApiMessage;
  }
  return buildApiMessage(message);
}

function normalizeApiChat(chat: any): ApiChat {
  if (chat?.type && typeof chat.type === 'string') {
    return chat as ApiChat;
  }
  return buildApiChat(chat);
}

function normalizeApiUser(user: any) {
  if (user?.firstName !== undefined || user?.usernames !== undefined) {
    return user;
  }
  return buildApiUser(user);
}

export async function searchMessagesGlobal({
  query,
  offsetRate,
  offsetPeer,
  offsetId,
  limit,
  type = 'text',
  context,
  minDate,
  maxDate,
}: {
  query: string;
  offsetRate?: number;
  offsetPeer?: ApiPeer;
  offsetId?: number;
  limit: number;
  type?: ApiGlobalMessageSearchType;
  context?: ApiMessageSearchContext;
  minDate?: number;
  maxDate?: number;
}): Promise<SearchMessagesGlobalResult | undefined> {
  try {
    const response = await callApi<SearchMessagesGlobalResult>('searchMessagesGlobal', {
      query,
      offsetRate,
      offsetPeer,
      offsetId,
      limit,
      type,
      context,
      minDate,
      maxDate,
    });

    if (!response) {
      return undefined;
    }

    return {
      messages: (response.messages || []).map(normalizeApiMessage).filter(Boolean) as ApiMessage[],
      userStatusesById: response.userStatusesById || {},
      totalCount: response.totalCount || 0,
      nextOffsetRate: response.nextOffsetRate,
      nextOffsetId: response.nextOffsetId,
      nextOffsetPeerId: response.nextOffsetPeerId,
      searchFlood: response.searchFlood,
      chats: (response.chats || []).map(normalizeApiChat),
      users: (response.users || []).map(normalizeApiUser),
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[TDLib] searchMessagesGlobal error:', error);
    return undefined;
  }
}

export async function fetchMessageSearchResults() {
  // Phase 2에서 구현
  return undefined;
}

export async function toggleReaction() {
  // Phase 2에서 구현
  return undefined;
}

export async function loadAvailableReactions() {
  // Phase 2에서 구현
  return undefined;
}

export async function loadMessageReactions() {
  // Phase 2에서 구현
  return undefined;
}

export async function loadReactors() {
  // Phase 2에서 구현
  return undefined;
}

export async function loadMessageReactionsList() {
  // Phase 2에서 구현
  return undefined;
}

export async function sendDefaultReaction() {
  // Phase 2에서 구현
  return undefined;
}

export async function setDefaultReaction() {
  // Phase 2에서 구현
  return undefined;
}

export async function setChatEnabledReactions() {
  // Phase 2에서 구현
  return undefined;
}

export async function clearCustomEmojiRecents() {
  // Phase 2에서 구현
  return undefined;
}

export async function markMessagesRead({
  chat, messageIds,
}: {
  chat: ApiChat; messageIds: number[];
}) {
  // v0.20: dead-code path (라우팅: api/gramjs/tdlib/methods.ts 가 실제 활성). 회귀 가드.
  const { getTdLibClient } = await import('../../gramjs/tdlib/socketClient');
  await getTdLibClient().markAsRead({ chatId: Number(chat.id), messageIds });
  return undefined;
}

export async function markMessageListRead({
  chat, threadId, maxId,
}: {
  chat: ApiChat; threadId?: ThreadId; maxId?: number;
}) {
  // v0.20: dead-code path (라우팅: api/gramjs/tdlib/methods.ts 가 실제 활성). 회귀 가드.
  if (!maxId) return undefined;
  const { getTdLibClient } = await import('../../gramjs/tdlib/socketClient');
  await getTdLibClient().markAsRead({ chatId: Number(chat.id), messageIds: [Number(maxId)] });
  return undefined;
}

export async function requestThreadInfoUpdate() {
  // Phase 2에서 구현
  return undefined;
}

export async function searchMessagesByDate() {
  // Phase 2에서 구현
  return undefined;
}

export async function fetchPinnedMessages() {
  // Phase 2에서 구현
  return undefined;
}

export async function fetchCommentsByIds() {
  // Phase 2에서 구현
  return undefined;
}

export async function updateCommentReaction() {
  // Phase 2에서 구현
  return undefined;
}

export async function fetchChannelStatistics() {
  // Phase 2에서 구현
  return undefined;
}

export async function fetchStatistics() {
  // Phase 2에서 구현
  return undefined;
}

export async function fetchMessageStatistics() {
  // Phase 2에서 구현
  return undefined;
}

export async function fetchStoryStatistics() {
  // Phase 2에서 구현
  return undefined;
}

export async function fetchStatisticsAsyncGraph() {
  // Phase 2에서 구현
  return undefined;
}

export async function fetchMessagePublicForwards() {
  // Phase 2에서 구현
  return undefined;
}

export async function fetchStoryPublicForwards() {
  // Phase 2에서 구현
  return undefined;
}

export async function fetchOutboxReadDate() {
  // Phase 2에서 구현
  return undefined;
}

export async function fetchQuickReplies() {
  // Phase 2에서 구현
  return undefined;
}

export async function fetchQuickReplyMessages() {
  // Phase 2에서 구현
  return undefined;
}

export async function sendQuickReply() {
  // Phase 2에서 구현
  return undefined;
}

export async function editQuickReply() {
  // Phase 2에서 구현
  return undefined;
}

export async function deleteQuickReply() {
  // Phase 2에서 구현
  return undefined;
}

export async function editQuickReplyMessage() {
  // Phase 2에서 구현
  return undefined;
}

export async function deleteQuickReplyMessages() {
  // Phase 2에서 구현
  return undefined;
}
