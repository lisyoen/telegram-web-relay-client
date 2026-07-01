// Converters from TDLib types to telegram-tt API types

import type {
  ApiChat,
  ApiMessage,
  ApiUser,
  ApiFormattedText,
  ApiMessageEntity,
  ApiPhoto,
  ApiVideo,
  ApiDocument,
  ApiAudio,
  ApiVoice,
  ApiSticker,
  MediaContent,
} from '../../types';
import type {
  TdLibChat,
  TdLibMessage,
  TdLibUser,
  TdLibFormattedText,
  TdLibPhoto,
  TdLibVideo,
  TdLibDocument,
  TdLibAudio,
  TdLibVoiceNote,
  TdLibSticker,
} from './types';

import { ApiMessageEntityTypes } from '../../types';

const ARCHIVED_FOLDER_ID = 1;

export function buildApiChatFromTdLib(tdChat: TdLibChat): ApiChat {
  const chatType = tdChat.type['@type'];

  let type: ApiChat['type'];
  if (chatType === 'chatTypePrivate' || chatType === 'chatTypeSecret') {
    type = chatType === 'chatTypeSecret' ? 'chatTypeSecret' : 'chatTypePrivate';
  } else if (chatType === 'chatTypeBasicGroup') {
    type = 'chatTypeBasicGroup';
  } else if (chatType === 'chatTypeSupergroup') {
    type = 'chatTypeSuperGroup';
  } else {
    type = 'chatTypeChannel';
  }

  const chatId = String(tdChat.id);

  // Determine folder ID
  let folderId: number | undefined;
  const mainPosition = tdChat.positions?.find((p) => p.list['@type'] === 'chatListMain');
  const archivePosition = tdChat.positions?.find((p) => p.list['@type'] === 'chatListArchive');

  if (archivePosition) {
    folderId = ARCHIVED_FOLDER_ID;
  }

  const chat: ApiChat = {
    id: chatId,
    type,
    title: tdChat.title,
    folderId,
    lastReadInboxMessageId: tdChat.last_read_inbox_message_id,
    lastReadOutboxMessageId: tdChat.last_read_outbox_message_id,
    unreadCount: tdChat.unread_count || 0,
    unreadMentionsCount: tdChat.unread_mention_count || 0,
    isMuted: !!(tdChat.notification_settings && tdChat.notification_settings.mute_for > 0),
    isListed: true,
  };

  // Avatar
  if (tdChat.photo?.small?.remote?.id) {
    chat.avatarPhotoId = tdChat.photo.small.remote.id;
  }

  return chat;
}

export function buildApiMessageFromTdLib(tdMessage: TdLibMessage): ApiMessage {
  const chatId = String(tdMessage.chat_id);
  const messageId = tdMessage.id;

  let senderId: string | undefined;
  if (tdMessage.sender_id) {
    if (tdMessage.sender_id['@type'] === 'messageSenderUser' && tdMessage.sender_id.user_id) {
      senderId = String(tdMessage.sender_id.user_id);
    } else if (tdMessage.sender_id['@type'] === 'messageSenderChat' && tdMessage.sender_id.chat_id) {
      senderId = String(tdMessage.sender_id.chat_id);
    }
  }

  const content = buildMediaContentFromTdLib(tdMessage.content);

  const message: ApiMessage = {
    id: messageId,
    chatId,
    content,
    date: tdMessage.date,
    isOutgoing: tdMessage.is_outgoing,
    senderId,
  };

  // Sending state
  if (tdMessage.sending_state) {
    if (tdMessage.sending_state['@type'] === 'messageSendingStatePending') {
      message.sendingState = 'messageSendingStatePending';
    } else if (tdMessage.sending_state['@type'] === 'messageSendingStateFailed') {
      message.sendingState = 'messageSendingStateFailed';
    }
  }

  // Reply info
  if (tdMessage.reply_to_message_id) {
    message.replyInfo = {
      type: 'message',
      replyToMsgId: tdMessage.reply_to_message_id,
    };
  }

  // Forward info
  if (tdMessage.forward_info) {
    const fwdInfo = tdMessage.forward_info;
    message.forwardInfo = {
      date: fwdInfo.date,
      isChannelPost: fwdInfo.origin['@type'] === 'messageForwardOriginChannel',
    };

    if (fwdInfo.origin['@type'] === 'messageForwardOriginUser' && fwdInfo.origin.sender_user_id) {
      message.forwardInfo.fromId = String(fwdInfo.origin.sender_user_id);
    } else if (fwdInfo.origin['@type'] === 'messageForwardOriginChannel') {
      if (fwdInfo.origin.chat_id) {
        message.forwardInfo.fromChatId = String(fwdInfo.origin.chat_id);
      }
      if (fwdInfo.origin.message_id) {
        message.forwardInfo.channelPostId = fwdInfo.origin.message_id;
      }
    } else if (fwdInfo.origin['@type'] === 'messageForwardOriginHiddenUser' && fwdInfo.origin.sender_name) {
      message.forwardInfo.hiddenUserName = fwdInfo.origin.sender_name;
    }
  }

  // Edit date
  if (tdMessage.edit_date > 0) {
    message.isEdited = true;
    message.editDate = tdMessage.edit_date;
  }

  // Pinned
  if (tdMessage.is_pinned) {
    message.isPinned = true;
  }

  // Unread mention
  if (tdMessage.contains_unread_mention) {
    message.hasUnreadMention = true;
  }

  return message;
}

function buildMediaContentFromTdLib(content: TdLibMessage['content']): MediaContent {
  const mediaContent: MediaContent = {};

  switch (content['@type']) {
    case 'messageText':
      mediaContent.text = buildApiFormattedTextFromTdLib(content.text);
      break;

    case 'messagePhoto':
      if (content.photo) {
        mediaContent.photo = buildApiPhotoFromTdLib(content.photo);
      }
      if (content.caption?.text) {
        mediaContent.text = buildApiFormattedTextFromTdLib(content.caption);
      }
      break;

    case 'messageVideo':
      if (content.video) {
        mediaContent.video = buildApiVideoFromTdLib(content.video);
      }
      if (content.caption?.text) {
        mediaContent.text = buildApiFormattedTextFromTdLib(content.caption);
      }
      break;

    case 'messageDocument':
      if (content.document) {
        mediaContent.document = buildApiDocumentFromTdLib(content.document);
      }
      if (content.caption?.text) {
        mediaContent.text = buildApiFormattedTextFromTdLib(content.caption);
      }
      break;

    case 'messageSticker':
      if (content.sticker) {
        mediaContent.sticker = buildApiStickerFromTdLib(content.sticker);
      }
      break;

    case 'messageVoiceNote':
      if (content.voice_note) {
        mediaContent.voice = buildApiVoiceFromTdLib(content.voice_note);
      }
      if (content.caption?.text) {
        mediaContent.text = buildApiFormattedTextFromTdLib(content.caption);
      }
      break;

    case 'messageAudio':
      if (content.audio) {
        mediaContent.audio = buildApiAudioFromTdLib(content.audio);
      }
      if (content.caption?.text) {
        mediaContent.text = buildApiFormattedTextFromTdLib(content.caption);
      }
      break;

    case 'messageAnimation':
      // Treat animations as videos
      if (content.animation) {
        mediaContent.video = {
          mediaType: 'video',
          id: String(content.animation.animation.remote.id),
          mimeType: content.animation.mime_type,
          duration: content.animation.duration,
          fileName: content.animation.file_name,
          width: content.animation.width,
          height: content.animation.height,
          size: content.animation.animation.size,
          isGif: true,
        };
      }
      if (content.caption?.text) {
        mediaContent.text = buildApiFormattedTextFromTdLib(content.caption);
      }
      break;

    default:
      // Unknown message type - just show as text
      mediaContent.text = {
        text: '[Unsupported message type]',
      };
  }

  return mediaContent;
}

function buildApiFormattedTextFromTdLib(tdText: TdLibFormattedText): ApiFormattedText {
  const formattedText: ApiFormattedText = {
    text: tdText.text,
  };

  if (tdText.entities && tdText.entities.length > 0) {
    formattedText.entities = tdText.entities.map((entity) => {
      const baseEntity = {
        offset: entity.offset,
        length: entity.length,
      };

      switch (entity.type['@type']) {
        case 'textEntityTypeBold':
          return { ...baseEntity, type: ApiMessageEntityTypes.Bold };
        case 'textEntityTypeItalic':
          return { ...baseEntity, type: ApiMessageEntityTypes.Italic };
        case 'textEntityTypeCode':
          return { ...baseEntity, type: ApiMessageEntityTypes.Code };
        case 'textEntityTypePre':
          return { ...baseEntity, type: ApiMessageEntityTypes.Pre };
        case 'textEntityTypeStrikethrough':
          return { ...baseEntity, type: ApiMessageEntityTypes.Strike };
        case 'textEntityTypeUnderline':
          return { ...baseEntity, type: ApiMessageEntityTypes.Underline };
        case 'textEntityTypeUrl':
          return { ...baseEntity, type: ApiMessageEntityTypes.Url };
        case 'textEntityTypeTextUrl':
          return {
            ...baseEntity,
            type: ApiMessageEntityTypes.TextUrl,
            url: entity.type.url || '',
          };
        case 'textEntityTypeMention':
          return { ...baseEntity, type: ApiMessageEntityTypes.Mention };
        case 'textEntityTypeMentionName':
          return {
            ...baseEntity,
            type: ApiMessageEntityTypes.MentionName,
            userId: String(entity.type.user_id || 0),
          };
        case 'textEntityTypeHashtag':
          return { ...baseEntity, type: ApiMessageEntityTypes.Hashtag };
        case 'textEntityTypeCashtag':
          return { ...baseEntity, type: ApiMessageEntityTypes.Cashtag };
        case 'textEntityTypeBotCommand':
          return { ...baseEntity, type: ApiMessageEntityTypes.BotCommand };
        case 'textEntityTypeEmailAddress':
          return { ...baseEntity, type: ApiMessageEntityTypes.Email };
        case 'textEntityTypePhoneNumber':
          return { ...baseEntity, type: ApiMessageEntityTypes.Phone };
        default:
          return { ...baseEntity, type: ApiMessageEntityTypes.Unknown };
      }
    }) as ApiMessageEntity[];
  }

  return formattedText;
}

function buildApiPhotoFromTdLib(tdPhoto: TdLibPhoto): ApiPhoto {
  const photo: ApiPhoto = {
    mediaType: 'photo',
    id: tdPhoto.id,
    date: 0,
    sizes: [],
  };

  if (tdPhoto.sizes && tdPhoto.sizes.length > 0) {
    photo.sizes = tdPhoto.sizes.map((size) => ({
      type: (size.type as ApiPhoto['sizes'][number]['type']) || 'x',
      width: size.width,
      height: size.height,
    }));
  }

  if (tdPhoto.minithumbnail) {
    photo.thumbnail = {
      width: tdPhoto.minithumbnail.width,
      height: tdPhoto.minithumbnail.height,
      dataUri: `data:image/jpeg;base64,${tdPhoto.minithumbnail.data}`,
    };
  }

  return photo;
}

function buildApiVideoFromTdLib(tdVideo: TdLibVideo): ApiVideo {
  return {
    mediaType: 'video',
    id: String(tdVideo.video.remote.id),
    mimeType: tdVideo.mime_type,
    duration: tdVideo.duration,
    fileName: tdVideo.file_name,
    width: tdVideo.width,
    height: tdVideo.height,
    size: tdVideo.video.size,
    supportsStreaming: tdVideo.supports_streaming,
  };
}

function buildApiDocumentFromTdLib(tdDoc: TdLibDocument): ApiDocument {
  return {
    mediaType: 'document',
    id: String(tdDoc.document.remote.id),
    fileName: tdDoc.file_name,
    size: tdDoc.document.size,
    mimeType: tdDoc.mime_type,
  };
}

function buildApiAudioFromTdLib(tdAudio: TdLibAudio): ApiAudio {
  return {
    mediaType: 'audio',
    id: String(tdAudio.audio.remote.id),
    size: tdAudio.audio.size,
    mimeType: tdAudio.mime_type,
    fileName: tdAudio.file_name,
    duration: tdAudio.duration,
    performer: tdAudio.performer,
    title: tdAudio.title,
  };
}

function buildApiVoiceFromTdLib(tdVoice: TdLibVoiceNote): ApiVoice {
  const voice: ApiVoice = {
    mediaType: 'voice',
    id: String(tdVoice.voice.remote.id),
    duration: tdVoice.duration,
    size: tdVoice.voice.size,
  };

  // Decode waveform from base64 if present
  if (tdVoice.waveform) {
    try {
      const waveformData = atob(tdVoice.waveform);
      const waveform: number[] = [];
      for (let i = 0; i < waveformData.length; i++) {
        waveform.push(waveformData.charCodeAt(i));
      }
      voice.waveform = waveform;
    } catch (err) {
      // Invalid waveform data
    }
  }

  return voice;
}

function buildApiStickerFromTdLib(tdSticker: TdLibSticker): ApiSticker {
  return {
    mediaType: 'sticker',
    id: String(tdSticker.sticker.remote.id),
    stickerSetInfo: {
      id: tdSticker.set_id,
      accessHash: '',
    },
    emoji: tdSticker.emoji,
    isLottie: tdSticker.is_animated,
    isVideo: false,
    width: tdSticker.width,
    height: tdSticker.height,
  };
}

export function buildApiUserFromTdLib(tdUser: TdLibUser): ApiUser {
  const userId = String(tdUser.id);

  const user: ApiUser = {
    id: userId,
    type: 'userTypeRegular',
    isMin: false,
    firstName: tdUser.first_name,
    lastName: tdUser.last_name,
    phoneNumber: tdUser.phone_number,
  };

  // TDLib 1.8.65: username 은 usernames.active_usernames(배열). 레거시 단수 username 폴백.
  const activeUsernames = tdUser.usernames?.active_usernames?.length
    ? tdUser.usernames.active_usernames
    : (tdUser.username ? [tdUser.username] : []);
  if (activeUsernames.length) {
    user.usernames = activeUsernames.map((u) => ({
      username: u,
      isActive: true,
      isEditable: false,
    }));
    user.hasUsername = true;
  }

  if (tdUser.is_verified) {
    user.isVerified = true;
  }

  if (tdUser.is_support) {
    user.isSupport = true;
  }

  if (tdUser.is_scam) {
    user.fakeType = 'scam';
  } else if (tdUser.is_fake) {
    user.fakeType = 'fake';
  }

  // User status is not stored in ApiUser, it's stored separately in ApiUserStatus

  if (tdUser.profile_photo?.small?.remote?.id) {
    user.avatarPhotoId = tdUser.profile_photo.small.remote.id;
  }

  if (tdUser.type?.['@type'] === 'userTypeBot') {
    user.type = 'userTypeBot';
  }

  return user;
}
