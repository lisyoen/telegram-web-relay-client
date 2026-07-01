/**
 * TDLib 원시 객체 → telegram-tt ApiChat/ApiMessage/ApiUser 타입 변환
 */
import type { ApiBotCommand } from '../types/bots';
import type { ApiChat } from '../types/chats';
import type { ApiKeyboardButton, ApiKeyboardButtons, ApiMessage, ApiMessageEntity } from '../types/messages';
import type { ApiMessageAction } from '../types/messageActions';
import type { ApiUser } from '../types/users';

import { ApiMessageEntityTypes } from '../types';

import { flattenRichMessageToFormattedText } from './richMessageFlatten';

/**
 * TDLib chat type → ApiChatType
 */
function convertChatType(tdlibType: string, isSupergroup?: { is_channel: boolean }): ApiChat['type'] {
  switch (tdlibType) {
    case 'chatTypePrivate':
      return 'chatTypePrivate';
    case 'chatTypeBasicGroup':
      return 'chatTypeBasicGroup';
    case 'chatTypeSupergroup':
      return isSupergroup?.is_channel ? 'chatTypeChannel' : 'chatTypeSuperGroup';
    case 'chatTypeSecret':
      return 'chatTypeSecret';
    default:
      return 'chatTypePrivate';
  }
}

/**
 * TDLib chat → ApiChat
 */
export function buildApiChat(tdlibChat: any): ApiChat {
  const chatType = tdlibChat.type?._ || tdlibChat.type;
  const supergroupInfo = tdlibChat.type?.is_channel !== undefined
    ? { is_channel: tdlibChat.type.is_channel }
    : undefined;

  const chat: ApiChat = {
    id: String(tdlibChat.id),
    type: convertChatType(chatType, supergroupInfo),
    title: tdlibChat.title || '',
    lastReadInboxMessageId: tdlibChat.last_read_inbox_message_id,
    lastReadOutboxMessageId: tdlibChat.last_read_outbox_message_id,
    unreadCount: tdlibChat.unread_count,
    ...(tdlibChat.isMuted !== undefined ? { isMuted: !!tdlibChat.isMuted } : {}),
  };
  if (tdlibChat.photo?.small?.remote?.id) {
    chat.avatarPhotoId = tdlibChat.photo.small.remote.id;
  }

  return chat;
}

/**
 * TDLib message → ApiMessage
 */
export function buildApiMessage(tdlibMessage: any): ApiMessage {
  const senderId = tdlibMessage.sender_id?.user_id
    ? String(tdlibMessage.sender_id.user_id)
    : tdlibMessage.sender_id?.chat_id
      ? String(tdlibMessage.sender_id.chat_id)
      : tdlibMessage.senderId
        ? String(tdlibMessage.senderId)
        : undefined;

  // TDLib `can_be_forwarded` 가 명시적으로 false 인 경우만 금지로 취급한다.
  // (필드 누락/일반 메시지는 기본 허용 — telegram-tt 컨텍스트 메뉴 Forward 노출 조건)
  const canBeForwarded = tdlibMessage.can_be_forwarded !== false;

  // v0.53: 텍스트(messageText.text) 와 캡션(messagePhoto/Video/... .caption) 통합 매핑.
  // 텍스트 메시지: content.text.text 사용. 미디어 메시지: content.caption(formattedText) 사용.
  // 둘 다 비면 undefined → 미디어 매핑(아래)이 content 를 채워 unsupported 회피.
  // v0.57: messageRichMessage 를 converter 단에서 직접 평탄화 → 서버 주입 비의존, 모든 경로(실시간/히스토리/편집/재조회) 커버.
  if (tdlibMessage.content?._ === 'messageRichMessage' && tdlibMessage.content.message
      && !(tdlibMessage.content.text && tdlibMessage.content.text.text)) {
    try {
      (tdlibMessage.content as any).text = flattenRichMessageToFormattedText(tdlibMessage.content.message);
    } catch (e) { /* 폴백: 아래 else-if 플레이스홀더에 위임 */ }
  }

  const rawText = tdlibMessage.content?.text?.text
    ? tdlibMessage.content.text
    : tdlibMessage.content?.caption?.text
      ? tdlibMessage.content.caption
      : undefined;

  const message: ApiMessage = {
    id: tdlibMessage.id,
    chatId: String(tdlibMessage.chat_id || tdlibMessage.chatId),
    date: tdlibMessage.date,
    isOutgoing: tdlibMessage.is_outgoing || tdlibMessage.isOutgoing || false,
    senderId,
    isForwardingAllowed: canBeForwarded,
    isProtected: !canBeForwarded,
    content: {
      text: rawText
        ? {
          text: rawText.text,
          ...(rawText.entities?.length
            ? { entities: buildApiMessageEntities(rawText.entities) }
            : {}),
        }
        : undefined,
    },
  };

  // v0.53: 미디어 content 매핑 — content 필드가 truthy 면 hasMessageText 가 false 가 되어
  // MessageUnsupported 폴백을 회피한다(global/helpers/messages.ts hasMessageText).
  const mediaContent = buildMediaContent(tdlibMessage.content);
  if (mediaContent) {
    Object.assign(message.content, mediaContent);
  } else {
    // v0.5x: 서버가 content.action = { type: 'message*' } 로 전달한 서비스 메시지 → ApiMessageAction 매핑.
    // 텍스트 폴백보다 우선: action 설정 시 '[지원되지 않는 메시지 형식]' 미적용.
    const actionContent = buildMessageAction(tdlibMessage.content);
    if (actionContent) {
      message.content.action = actionContent;
    } else if (!message.content.text && tdlibMessage.content?._ && tdlibMessage.content._ !== 'messageText') {
      // 알 수 없는 미디어 타입 + 캡션 없음 → 한국어 안내(영문 MessageUnsupported 노출 회피).
      message.content.text = { text: '[지원되지 않는 메시지 형식]' };
    }
  }

  // Stage B-2: 서버가 주입한 messageRichMessage 마크다운 원문(content.rich_markdown) 을
  // ApiMessage.content.richMarkdown 으로 전달 → MessageText 가 markdown-it 로 렌더.
  // text/엔티티 매핑은 무변경(폴백 보존). richMarkdown 없으면 기존 엔티티 렌더 경로.
  if (typeof (tdlibMessage.content as any)?.rich_markdown === 'string'
      && (tdlibMessage.content as any).rich_markdown.length > 0) {
    (message.content as any).richMarkdown = (tdlibMessage.content as any).rich_markdown;
  }

  // TDLib reply_to 객체 → telegram-tt replyInfo 변환
  // TDLib: { _: 'messageReplyToMessage', chat_id, message_id }
  // telegram-tt: { type: 'message', replyToMsgId, replyToPeerId? }
  if (tdlibMessage.reply_to?.message_id) {
    const replyToPeerId = tdlibMessage.reply_to.chat_id
      && String(tdlibMessage.reply_to.chat_id) !== String(tdlibMessage.chat_id || tdlibMessage.chatId)
      ? String(tdlibMessage.reply_to.chat_id)
      : undefined;
    (message as any).replyInfo = {
      type: 'message' as const,
      replyToMsgId: tdlibMessage.reply_to.message_id,
      ...(replyToPeerId && { replyToPeerId }),
    };
  } else if (tdlibMessage.reply_to_message_id) {
    // 호환: 이전 형식
    (message as any).replyInfo = {
      type: 'message' as const,
      replyToMsgId: tdlibMessage.reply_to_message_id,
    };
  }

  // v0.28 Phase1: TDLib reply_markup → telegram-tt inlineButtons / keyboardButtons
  // 변환 실패 시 throw 하지 않고 해당 메시지는 버튼 없이 통과(기존 동작 보존).
  if (tdlibMessage.reply_markup) {
    const built = buildApiReplyMarkup(tdlibMessage.reply_markup);
    if (built) {
      if (built.inlineButtons) message.inlineButtons = built.inlineButtons;
      if (built.keyboardButtons) message.keyboardButtons = built.keyboardButtons;
      if (built.keyboardPlaceholder !== undefined) message.keyboardPlaceholder = built.keyboardPlaceholder;
      if (built.isKeyboardSingleUse !== undefined) message.isKeyboardSingleUse = built.isKeyboardSingleUse;
      if (built.isKeyboardSelective !== undefined) message.isKeyboardSelective = built.isKeyboardSelective;
    }
  }

  // v0.37: TDLib forward_info → telegram-tt forwardInfo 매핑.
  // 서버(server.js)가 raw 메시지에 forward_info(원본) + _forwardFrom(해석된 발신자명,
  // user/chat/hiddenUser 모두 처리)을 함께 emit 한다. 커스텀 서버 구조상 원본 peer 가
  // 클라 global state 에 없을 수 있으므로, selectForwardedSender 의 hidden 경로
  // (forwardInfo.hiddenUserName → Message.tsx 가 그대로 senderTitle 로 표시)를 사용해
  // 전달 헤더의 발신자명을 결정론적으로 보장한다.
  if (tdlibMessage.forward_info) {
    const fi = tdlibMessage.forward_info;
    const origin = fi.origin || {};
    const resolvedName =
      tdlibMessage._forwardFrom
      || origin.sender_name
      || '알 수 없음';
    (message as any).forwardInfo = {
      date: fi.date || tdlibMessage.date || Math.floor(Date.now() / 1000),
      isChannelPost: false,
      hiddenUserName: resolvedName,
    };
  }

  return message;
}

/**
 * TDLib reply_markup → { inlineButtons | keyboardButtons, ... }
 *
 * 매핑 대상 TDLib 타입:
 *   - replyMarkupInlineKeyboard { rows: inlineKeyboardButton[][] } → inlineButtons
 *   - replyMarkupShowKeyboard   { rows: keyboardButton[][], input_field_placeholder, one_time, is_personal } → keyboardButtons
 *
 * inlineKeyboardButton.type._ 매핑:
 *   - inlineKeyboardButtonTypeCallback / CallbackWithPassword → { type:'callback', data }
 *   - inlineKeyboardButtonTypeUrl                              → { type:'url', url }
 *   - inlineKeyboardButtonTypeLoginUrl                         → { type:'urlAuth', url, buttonId }
 *   - inlineKeyboardButtonTypeSwitchInline                     → { type:'switchBotInline', query, isSamePeer }
 *   - inlineKeyboardButtonTypeWebApp                           → { type:'webView', url }
 *   - inlineKeyboardButtonTypeBuy                              → { type:'buy' }
 *   - inlineKeyboardButtonTypeUser                             → { type:'userProfile', userId }
 *   - inlineKeyboardButtonTypeCopyText                         → { type:'copy', copyText }
 *   - 그 외/CallbackGame 등 미지원                              → { type:'unsupported' }
 */
function buildApiReplyMarkup(rm: any): {
  inlineButtons?: ApiKeyboardButtons;
  keyboardButtons?: ApiKeyboardButtons;
  keyboardPlaceholder?: string;
  isKeyboardSingleUse?: boolean;
  isKeyboardSelective?: boolean;
} | undefined {
  try {
    const kind = rm?._;
    if (kind === 'replyMarkupInlineKeyboard') {
      const rows: any[][] = rm.rows || [];
      const inlineButtons: ApiKeyboardButtons = rows
        .map((row) => row.map(buildInlineKeyboardButton).filter(Boolean) as ApiKeyboardButton[])
        .filter((row) => row.length > 0);
      if (!inlineButtons.length) return undefined;
      return { inlineButtons };
    }

    if (kind === 'replyMarkupShowKeyboard') {
      const rows: any[][] = rm.rows || [];
      const keyboardButtons: ApiKeyboardButtons = rows
        .map((row) => row.map(buildShowKeyboardButton).filter(Boolean) as ApiKeyboardButton[])
        .filter((row) => row.length > 0);
      if (!keyboardButtons.length) return undefined;
      return {
        keyboardButtons,
        keyboardPlaceholder: rm.input_field_placeholder || undefined,
        isKeyboardSingleUse: rm.one_time || undefined,
        isKeyboardSelective: rm.is_personal || undefined,
      };
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function buildInlineKeyboardButton(btn: any): ApiKeyboardButton | undefined {
  if (!btn || typeof btn.text !== 'string') return undefined;
  const text = btn.text;
  const t = btn.type?._;
  switch (t) {
    case 'inlineKeyboardButtonTypeCallback':
    case 'inlineKeyboardButtonTypeCallbackWithPassword':
      return { type: 'callback', text, data: String(btn.type.data ?? '') };
    case 'inlineKeyboardButtonTypeUrl':
      return { type: 'url', text, url: String(btn.type.url ?? '') };
    case 'inlineKeyboardButtonTypeLoginUrl':
      return {
        type: 'urlAuth',
        text,
        url: String(btn.type.url ?? ''),
        buttonId: Number(btn.type.id ?? 0),
      };
    case 'inlineKeyboardButtonTypeSwitchInline': {
      const targetKind = btn.type.target_chat?._;
      const isSamePeer = targetKind === 'targetChatCurrent' || !!btn.type.same_peer;
      return {
        type: 'switchBotInline',
        text,
        query: String(btn.type.query ?? ''),
        isSamePeer,
      };
    }
    case 'inlineKeyboardButtonTypeWebApp':
      return { type: 'webView', text, url: String(btn.type.url ?? '') };
    case 'inlineKeyboardButtonTypeBuy':
      return { type: 'buy', text };
    case 'inlineKeyboardButtonTypeUser':
      return { type: 'userProfile', text, userId: String(btn.type.user_id ?? '') };
    case 'inlineKeyboardButtonTypeCopyText':
      return { type: 'copy', text, copyText: String(btn.type.text ?? '') };
    default:
      return { type: 'unsupported', text };
  }
}

function buildShowKeyboardButton(btn: any): ApiKeyboardButton | undefined {
  if (!btn || typeof btn.text !== 'string') return undefined;
  const text = btn.text;
  const t = btn.type?._;
  switch (t) {
    case 'keyboardButtonTypeText':
      return { type: 'command', text };
    case 'keyboardButtonTypeRequestPhoneNumber':
      return { type: 'requestPhone', text };
    case 'keyboardButtonTypeRequestPoll':
      return { type: 'requestPoll', text, isQuiz: !!btn.type.force_quiz };
    case 'keyboardButtonTypeWebApp':
      return { type: 'simpleWebView', text, url: String(btn.type.url ?? '') };
    default:
      return { type: 'unsupported', text };
  }
}

/**
 * TDLib 서비스 content type → telegram-tt ApiMessageAction 매핑.
 * 서버(server.js)는 서비스 메시지를 content.action = { type: m.content._ } 로 전달한다.
 * input 우선순위: tdlibContent.action.type(서버 경로) > tdlibContent._(raw 경로).
 */
export function buildMessageAction(tdlibContent: any): ApiMessageAction | undefined {
  if (!tdlibContent) return undefined;
  const rawType: string | undefined = tdlibContent.action?.type ?? tdlibContent._;
  if (!rawType) return undefined;

  switch (rawType) {
    case 'messageContactRegistered':
      return { mediaType: 'action', type: 'contactSignUp' };
    case 'messageBasicGroupChatCreate':
      return {
        mediaType: 'action',
        type: 'chatCreate',
        title: tdlibContent.title || tdlibContent.action?.title || '',
        userIds: (tdlibContent.member_user_ids || tdlibContent.action?.member_user_ids || []).map(String),
      };
    case 'messageSupergroupChatCreate':
      return {
        mediaType: 'action',
        type: 'channelCreate',
        title: tdlibContent.title || tdlibContent.action?.title || '',
      };
    case 'messageChatChangeTitle':
      return {
        mediaType: 'action',
        type: 'chatEditTitle',
        title: tdlibContent.title || tdlibContent.action?.title || '',
      };
    case 'messageChatChangePhoto':
      return { mediaType: 'action', type: 'chatEditPhoto' };
    case 'messageChatDeletePhoto':
      return { mediaType: 'action', type: 'chatDeletePhoto' };
    case 'messageChatAddMembers':
      return {
        mediaType: 'action',
        type: 'chatAddUser',
        userIds: (tdlibContent.member_user_ids || tdlibContent.action?.member_user_ids || []).map(String),
      };
    case 'messageChatDeleteMember': {
      const uid = tdlibContent.user_id ?? tdlibContent.action?.user_id;
      return {
        mediaType: 'action',
        type: 'chatDeleteUser',
        userId: uid ? String(uid) : '',
      };
    }
    case 'messageChatJoinByLink':
      return { mediaType: 'action', type: 'chatJoinedByLink', inviterId: '' };
    case 'messageChatJoinByRequest':
      return { mediaType: 'action', type: 'chatJoinedByRequest' };
    case 'messagePinMessage':
      return { mediaType: 'action', type: 'pinMessage' };
    case 'messageChatUpgradeTo': {
      const sgId = tdlibContent.supergroup_id ?? tdlibContent.action?.supergroup_id;
      return {
        mediaType: 'action',
        type: 'chatMigrateTo',
        channelId: sgId ? String(sgId) : '',
      };
    }
    case 'messageChatUpgradeFrom': {
      const bgId = tdlibContent.basic_group_id ?? tdlibContent.action?.basic_group_id;
      return {
        mediaType: 'action',
        type: 'channelMigrateFrom',
        title: tdlibContent.title || tdlibContent.action?.title || '',
        chatId: bgId ? String(bgId) : '',
      };
    }
    default:
      // 서버가 action 으로 표시한 미매핑 서비스 타입 → unsupported(ActionUnsupported 한국어 키).
      // content.action 이 설정됐다는 것 자체가 서버가 이를 서비스 메시지로 인식했음을 의미.
      if (tdlibContent.action?.type) {
        return { mediaType: 'action', type: 'unsupported' };
      }
      return undefined;
  }
}

/**
 * v0.53: TDLib content (messagePhoto/Video/Document/...) → MediaContent 일부.
 *
 * 매핑 우선순위:
 * 1) MessageUnsupported 회피 — content 에 truthy 미디어 필드를 채워 hasMessageText 가
 *    false 가 되도록 한다(global/helpers/messages.ts).
 * 2) 가능한 경우 server.js 의 photoFileId 패턴(/api/file/{fileId}) 으로 blobUrl 부착.
 *    파일 스트리밍 평탄화가 photo 외엔 없어, 다른 미디어는 raw remote.id 를 폴백으로 사용.
 *
 * 알 수 없는 타입: undefined 반환(텍스트 매핑이 처리). 텍스트도 없으면 명시적 한국어 fallback.
 */
function buildMediaContent(tdlibContent: any): Partial<import('../types/messages').MediaContent> | undefined {
  if (!tdlibContent) return undefined;
  const kind = tdlibContent._;
  const out: any = {};

  // 파일 ID 추출 헬퍼 — TDLib file 객체에서 가능한 한 ID 를 뽑는다.
  // server.js 는 photo 만 photoFileId 로 평탄화하므로, 다른 미디어는 remote.id 폴백.
  const pickFileId = (f: any): string | undefined => {
    if (!f) return undefined;
    return f.remote?.id || (f.id !== undefined ? String(f.id) : undefined);
  };

  switch (kind) {
    case 'messagePhoto':
      if (tdlibContent.photo) out.photo = buildApiPhoto(tdlibContent.photo);
      return Object.keys(out).length ? out : undefined;

    case 'messageVideo': {
      const v = tdlibContent.video;
      if (!v) return undefined;
      const fileId = pickFileId(v.video);
      out.video = {
        mediaType: 'video',
        id: String(v.video?.id || Date.now()),
        mimeType: v.mime_type || 'video/mp4',
        duration: v.duration || 0,
        fileName: v.file_name || '',
        width: v.width,
        height: v.height,
        supportsStreaming: !!v.supports_streaming,
        size: v.video?.size || v.video?.expected_size || 0,
        ...(fileId ? { blobUrl: `/api/file/${fileId}` } : {}),
      };
      return out;
    }

    case 'messageAnimation': {
      const a = tdlibContent.animation;
      if (!a) return undefined;
      const fileId = pickFileId(a.animation);
      out.video = {
        mediaType: 'video',
        id: String(a.animation?.id || Date.now()),
        mimeType: a.mime_type || 'video/mp4',
        duration: a.duration || 0,
        fileName: a.file_name || '',
        width: a.width,
        height: a.height,
        isGif: true,
        size: a.animation?.size || 0,
        ...(fileId ? { blobUrl: `/api/file/${fileId}` } : {}),
      };
      return out;
    }

    case 'messageVideoNote': {
      const vn = tdlibContent.video_note;
      if (!vn) return undefined;
      const fileId = pickFileId(vn.video);
      out.video = {
        mediaType: 'video',
        id: String(vn.video?.id || Date.now()),
        mimeType: 'video/mp4',
        duration: vn.duration || 0,
        fileName: '',
        width: vn.length,
        height: vn.length,
        isRound: true,
        size: vn.video?.size || 0,
        ...(fileId ? { blobUrl: `/api/file/${fileId}` } : {}),
      };
      return out;
    }

    case 'messageDocument': {
      const d = tdlibContent.document;
      if (!d) return undefined;
      out.document = {
        mediaType: 'document',
        id: String(d.document?.id || Date.now()),
        fileName: d.file_name || '',
        size: d.document?.size || 0,
        mimeType: d.mime_type || 'application/octet-stream',
      };
      return out;
    }

    case 'messageVoiceNote': {
      const vn = tdlibContent.voice_note;
      if (!vn) return undefined;
      out.voice = {
        mediaType: 'voice',
        id: String(vn.voice?.id || Date.now()),
        duration: vn.duration || 0,
        size: vn.voice?.size || 0,
        ...(Array.isArray(vn.waveform) ? { waveform: vn.waveform } : {}),
      };
      return out;
    }

    case 'messageAudio': {
      const a = tdlibContent.audio;
      if (!a) return undefined;
      out.audio = {
        mediaType: 'audio',
        id: String(a.audio?.id || Date.now()),
        size: a.audio?.size || 0,
        mimeType: a.mime_type || 'audio/mpeg',
        fileName: a.file_name || '',
        duration: a.duration || 0,
        ...(a.title ? { title: a.title } : {}),
        ...(a.performer ? { performer: a.performer } : {}),
      };
      return out;
    }

    case 'messageSticker': {
      const s = tdlibContent.sticker;
      if (!s) return undefined;
      // 풀 렌더는 stickerSet 메타가 필요해 어렵다. unsupported 회피 우선.
      out.sticker = {
        mediaType: 'sticker',
        id: String(s.sticker?.id || Date.now()),
        stickerSetInfo: { id: String(s.set_id || '0'), accessHash: '' },
        emoji: s.emoji,
        isLottie: s.format?._ === 'stickerFormatTgs',
        isVideo: s.format?._ === 'stickerFormatWebm',
        width: s.width,
        height: s.height,
      };
      return out;
    }

    case 'messageLocation': {
      const loc = tdlibContent.location;
      if (!loc) return undefined;
      out.location = {
        mediaType: 'geo',
        geo: {
          long: loc.longitude || 0,
          lat: loc.latitude || 0,
          accessHash: '0',
          ...(loc.horizontal_accuracy ? { accuracyRadius: loc.horizontal_accuracy } : {}),
        },
      };
      return out;
    }

    case 'messageVenue': {
      const v = tdlibContent.venue;
      if (!v) return undefined;
      out.location = {
        mediaType: 'venue',
        geo: {
          long: v.location?.longitude || 0,
          lat: v.location?.latitude || 0,
          accessHash: '0',
        },
        title: v.title || '',
        address: v.address || '',
        provider: v.provider || '',
        venueId: v.id || '',
        venueType: v.type || '',
      };
      return out;
    }

    case 'messageContact': {
      const c = tdlibContent.contact;
      if (!c) return undefined;
      out.contact = {
        mediaType: 'contact',
        firstName: c.first_name || '',
        lastName: c.last_name || '',
        phoneNumber: c.phone_number || '',
        userId: String(c.user_id || 0),
      };
      return out;
    }

    case 'messagePoll': {
      const p = tdlibContent.poll;
      if (!p) return undefined;
      // ApiPoll 자체는 global.messages.statefulMediaByChatId 에 적재되어야 한다.
      // 여기서는 pollId 만 박아 unsupported 회피.
      out.pollId = String(p.id || tdlibContent.id || Date.now());
      return out;
    }

    default:
      return undefined;
  }
}

/**
 * TDLib photo → ApiPhoto (기본 구현)
 */
function buildApiPhoto(tdlibPhoto: any): any {
  const sizes = tdlibPhoto.sizes || [];

  // v0.17.3: bestSize 를 면적(width*height) 기준 max 로 선정 — sizes 순서 무관
  // photoFileId 가 없는 size 는 건너뛰기 (selectable size 만 고려)
  const selectableSizes = sizes.filter((s: any) => s.photoFileId);
  const bestSize = selectableSizes.reduce((max: any, s: any) => {
    const area = (s.width || 0) * (s.height || 0);
    const maxArea = (max?.width || 0) * (max?.height || 0);
    return area > maxArea ? s : max;
  }, null);

  // thumbSize: 'm' 또는 's' 우선, 없으면 가장 작은 selectable size
  const thumbSize = sizes.find((s: any) => s.type === 's' || s.type === 'm')
    || selectableSizes.reduce((min: any, s: any) => {
      const area = (s.width || 0) * (s.height || 0);
      const minArea = (min?.width || 0) * (min?.height || 0);
      return !min || area < minArea ? s : min;
    }, null);

  const photo: any = {
    mediaType: 'photo',
    id: String(tdlibPhoto.id || Date.now()),
    date: tdlibPhoto.date || Date.now(),
    sizes: sizes.map((size: any) => ({
      type: size.type || 'm',
      width: size.width || 0,
      height: size.height || 0,
    })),
  };

  // thumbnail (작은 사이즈)
  if (thumbSize?.photoFileId) {
    photo.thumbnail = {
      width: thumbSize.width || 100,
      height: thumbSize.height || 100,
      dataUri: `/api/file/${thumbSize.photoFileId}`,
    };
  }

  // blobUrl (가장 큰 사이즈, 면적 max) — Photo 컴포넌트 / MediaViewer 가 이걸 사용
  if (bestSize?.photoFileId) {
    photo.blobUrl = `/api/file/${bestSize.photoFileId}`;
  }

  // v0.17.3 진단: blobUrl 박지 못한 경우
  if (!photo.blobUrl) {
    // eslint-disable-next-line no-console
    console.warn('[buildApiPhoto] blobUrl 박지 못함 — tdlibPhoto.id:', tdlibPhoto.id, 'sizes count:', sizes.length, 'selectable count:', selectableSizes.length, 'sample size:', sizes[0]);
  }

  return photo;
}

/**
 * TDLib user → ApiUser
 */
export function buildApiUser(tdlibUser: any): ApiUser {
  const user: ApiUser = {
    id: String(tdlibUser.id),
    isMin: tdlibUser.is_min || false,
    type: tdlibUser.type?._ === 'userTypeBot' ? 'userTypeBot' : 'userTypeRegular',
    firstName: tdlibUser.first_name || '',
    lastName: tdlibUser.last_name,
    phoneNumber: tdlibUser.phone_number || '',
  };

  // TDLib 1.8.65: username 은 usernames.active_usernames(배열). 레거시 단수 username 폴백.
  const activeUsernames = tdlibUser.usernames?.active_usernames?.length
    ? tdlibUser.usernames.active_usernames
    : (tdlibUser.username ? [tdlibUser.username] : []);
  if (activeUsernames.length) {
    user.usernames = activeUsernames.map((u: string) => ({
      username: u,
      isActive: true,
      isEditable: false,
    }));
    user.hasUsername = true;
  }

  if (tdlibUser.profile_photo?.small?.remote?.id) {
    user.avatarPhotoId = tdlibUser.profile_photo.small.remote.id;
  }

  return user;
}

/**
 * TDLib chats 배치 변환
 */
export function buildApiChats(tdlibChats: any[]): {
  chats: ApiChat[];
  orderedPinnedIds?: string[];
} {
  const chats = tdlibChats.map(buildApiChat);

  const pinnedChats = tdlibChats.filter((c) => c.positions?.some((p: any) => p.is_pinned));
  const orderedPinnedIds = pinnedChats.length > 0
    ? pinnedChats.map((c) => String(c.id))
    : undefined;

  return { chats, orderedPinnedIds };
}

/**
 * v0.33: TDLib formattedText.entities → ApiMessageEntity[]
 *
 * 입력 shape (server.js 가 TDLib 원시 그대로 전달):
 *   { _: 'textEntity', offset, length, type: { _: 'textEntityType...', ...추가필드 } }
 * 활성 매핑(나머지는 Unknown 로 박제 후 통과):
 *   BotCommand, Mention, MentionName(+userId), Hashtag, Cashtag, Url,
 *   Email, Phone, Bold, Italic, Underline, Strike, Code, Pre/PreCode(+language),
 *   TextUrl(+url), Blockquote, Spoiler, CustomEmoji(+documentId)
 */
export function buildApiMessageEntities(tdlibEntities: any[]): ApiMessageEntity[] {
  if (!Array.isArray(tdlibEntities)) return [];
  const out: ApiMessageEntity[] = [];
  for (const ent of tdlibEntities) {
    if (!ent || typeof ent.offset !== 'number' || typeof ent.length !== 'number') continue;
    const t = ent.type?._ || ent.type?.['@type'];
    const base = { offset: ent.offset, length: ent.length };
    switch (t) {
      case 'textEntityTypeBotCommand':
        out.push({ ...base, type: ApiMessageEntityTypes.BotCommand }); break;
      case 'textEntityTypeMention':
        out.push({ ...base, type: ApiMessageEntityTypes.Mention }); break;
      case 'textEntityTypeMentionName':
        out.push({ ...base, type: ApiMessageEntityTypes.MentionName, userId: String(ent.type.user_id ?? 0) }); break;
      case 'textEntityTypeHashtag':
        out.push({ ...base, type: ApiMessageEntityTypes.Hashtag }); break;
      case 'textEntityTypeCashtag':
        out.push({ ...base, type: ApiMessageEntityTypes.Cashtag }); break;
      case 'textEntityTypeUrl':
        out.push({ ...base, type: ApiMessageEntityTypes.Url }); break;
      case 'textEntityTypeEmailAddress':
        out.push({ ...base, type: ApiMessageEntityTypes.Email }); break;
      case 'textEntityTypePhoneNumber':
        out.push({ ...base, type: ApiMessageEntityTypes.Phone }); break;
      case 'textEntityTypeBold':
        out.push({ ...base, type: ApiMessageEntityTypes.Bold }); break;
      case 'textEntityTypeItalic':
        out.push({ ...base, type: ApiMessageEntityTypes.Italic }); break;
      case 'textEntityTypeUnderline':
        out.push({ ...base, type: ApiMessageEntityTypes.Underline }); break;
      case 'textEntityTypeStrikethrough':
        out.push({ ...base, type: ApiMessageEntityTypes.Strike }); break;
      case 'textEntityTypeCode':
        out.push({ ...base, type: ApiMessageEntityTypes.Code }); break;
      case 'textEntityTypePre':
        out.push({ ...base, type: ApiMessageEntityTypes.Pre }); break;
      case 'textEntityTypePreCode':
        out.push({ ...base, type: ApiMessageEntityTypes.Pre, language: String(ent.type.language ?? '') }); break;
      case 'textEntityTypeTextUrl':
        out.push({ ...base, type: ApiMessageEntityTypes.TextUrl, url: String(ent.type.url ?? '') }); break;
      case 'textEntityTypeBlockQuote':
        out.push({ ...base, type: ApiMessageEntityTypes.Blockquote }); break;
      case 'textEntityTypeSpoiler':
        out.push({ ...base, type: ApiMessageEntityTypes.Spoiler }); break;
      case 'textEntityTypeCustomEmoji':
        out.push({
          ...base,
          type: ApiMessageEntityTypes.CustomEmoji,
          documentId: String(ent.type.custom_emoji_id ?? ''),
        });
        break;
      default:
        // eslint-disable-next-line no-console
        console.warn('[buildApiMessageEntities] 미지원 entity type:', t);
        break;
    }
  }
  return out;
}

/**
 * v0.23: TDLib bot_info.commands → ApiBotCommand[]
 * server.js getBotCommands 응답({commands:[{command, description}]}) 을 botId 부착 형태로 변환.
 */
export function buildApiBotCommands(
  botId: string,
  rawCommands?: Array<{ command: string; description?: string }>,
): ApiBotCommand[] {
  if (!rawCommands || !rawCommands.length) return [];
  return rawCommands
    .filter((c) => c && typeof c.command === 'string')
    .map((c) => ({
      botId,
      command: c.command,
      description: c.description || '',
    }));
}
