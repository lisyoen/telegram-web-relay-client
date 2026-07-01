// TDLib server response types (from the relay server)

export interface TdLibChat {
  id: number;
  title: string;
  _user?: TdLibUser;
  type: {
    '@type': 'chatTypePrivate' | 'chatTypeBasicGroup' | 'chatTypeSupergroup' | 'chatTypeSecret' | 'chatTypeChannel';
    supergroup_id?: number;
    basic_group_id?: number;
    secret_chat_id?: number;
    user_id?: number;
  };
  photo?: {
    small: {
      local: { path: string };
      remote: { id: string };
    };
    big: {
      local: { path: string };
      remote: { id: string };
    };
  };
  positions: Array<{
    list: {
      '@type': 'chatListMain' | 'chatListArchive';
    };
    order: string;
    is_pinned: boolean;
  }>;
  last_message?: TdLibMessage;
  last_read_inbox_message_id: number;
  last_read_outbox_message_id: number;
  unread_count: number;
  unread_mention_count: number;
  notification_settings: {
    use_default_mute_for: boolean;
    mute_for: number;
  };
  permissions?: {
    can_send_messages: boolean;
    can_send_media_messages: boolean;
    can_send_polls: boolean;
    can_send_other_messages: boolean;
    can_add_web_page_previews: boolean;
    can_change_info: boolean;
    can_invite_users: boolean;
    can_pin_messages: boolean;
  };
}

export interface TdLibMessage {
  '@type': 'message';
  id: number;
  sender_id: {
    '@type': 'messageSenderUser' | 'messageSenderChat';
    user_id?: number;
    chat_id?: number;
  };
  chat_id: number;
  sending_state?: {
    '@type': 'messageSendingStatePending' | 'messageSendingStateFailed';
  };
  is_outgoing: boolean;
  is_pinned: boolean;
  can_be_edited: boolean;
  can_be_forwarded: boolean;
  can_be_deleted_only_for_self: boolean;
  can_be_deleted_for_all_users: boolean;
  can_get_statistics: boolean;
  can_get_message_thread: boolean;
  is_channel_post: boolean;
  contains_unread_mention: boolean;
  date: number;
  edit_date: number;
  forward_info?: {
    origin: {
      '@type': 'messageForwardOriginUser' | 'messageForwardOriginChannel' | 'messageForwardOriginHiddenUser';
      sender_user_id?: number;
      chat_id?: number;
      message_id?: number;
      sender_name?: string;
    };
    date: number;
  };
  reply_to_message_id?: number;
  message_thread_id?: number;
  ttl: number;
  ttl_expires_in: number;
  via_bot_user_id: number;
  author_signature: string;
  media_album_id: string;
  restriction_reason: string;
  content: TdLibMessageContent;
  reply_markup?: any;
}

export type TdLibMessageContent =
  | { '@type': 'messageText'; text: TdLibFormattedText }
  | { '@type': 'messagePhoto'; photo: TdLibPhoto; caption: TdLibFormattedText }
  | { '@type': 'messageVideo'; video: TdLibVideo; caption: TdLibFormattedText }
  | { '@type': 'messageDocument'; document: TdLibDocument; caption: TdLibFormattedText }
  | { '@type': 'messageSticker'; sticker: TdLibSticker }
  | { '@type': 'messageAnimation'; animation: TdLibAnimation; caption: TdLibFormattedText }
  | { '@type': 'messageVoiceNote'; voice_note: TdLibVoiceNote; caption: TdLibFormattedText }
  | { '@type': 'messageAudio'; audio: TdLibAudio; caption: TdLibFormattedText };

export interface TdLibFormattedText {
  text: string;
  entities?: Array<{
    offset: number;
    length: number;
    type: {
      '@type': string;
      url?: string;
      user_id?: number;
    };
  }>;
}

export interface TdLibPhoto {
  id: string;
  has_stickers: boolean;
  minithumbnail?: {
    width: number;
    height: number;
    data: string; // base64
  };
  sizes: Array<{
    type: string;
    photo: {
      id: number;
      size: number;
      expected_size: number;
      local: { path: string; can_be_downloaded: boolean; is_downloading_active: boolean };
      remote: { id: string; unique_id: string };
    };
    width: number;
    height: number;
    progressive_sizes: number[];
  }>;
}

export interface TdLibVideo {
  duration: number;
  width: number;
  height: number;
  file_name: string;
  mime_type: string;
  has_stickers: boolean;
  supports_streaming: boolean;
  minithumbnail?: {
    width: number;
    height: number;
    data: string;
  };
  thumbnail?: {
    format: { '@type': string };
    width: number;
    height: number;
    file: any;
  };
  video: {
    id: number;
    size: number;
    expected_size: number;
    local: { path: string };
    remote: { id: string; unique_id: string };
  };
}

export interface TdLibDocument {
  file_name: string;
  mime_type: string;
  minithumbnail?: {
    width: number;
    height: number;
    data: string;
  };
  thumbnail?: any;
  document: {
    id: number;
    size: number;
    expected_size: number;
    local: { path: string };
    remote: { id: string; unique_id: string };
  };
}

export interface TdLibSticker {
  width: number;
  height: number;
  emoji: string;
  set_id: string;
  is_animated: boolean;
  is_mask: boolean;
  mask_position?: any;
  outline: any[];
  thumbnail?: any;
  sticker: {
    id: number;
    size: number;
    expected_size: number;
    local: { path: string };
    remote: { id: string; unique_id: string };
  };
}

export interface TdLibAnimation {
  duration: number;
  width: number;
  height: number;
  file_name: string;
  mime_type: string;
  has_stickers: boolean;
  minithumbnail?: {
    width: number;
    height: number;
    data: string;
  };
  thumbnail?: any;
  animation: {
    id: number;
    size: number;
    expected_size: number;
    local: { path: string };
    remote: { id: string; unique_id: string };
  };
}

export interface TdLibVoiceNote {
  duration: number;
  waveform: string; // base64
  mime_type: string;
  voice: {
    id: number;
    size: number;
    expected_size: number;
    local: { path: string };
    remote: { id: string; unique_id: string };
  };
}

export interface TdLibAudio {
  duration: number;
  title: string;
  performer: string;
  file_name: string;
  mime_type: string;
  album_cover_minithumbnail?: {
    width: number;
    height: number;
    data: string;
  };
  album_cover_thumbnail?: any;
  audio: {
    id: number;
    size: number;
    expected_size: number;
    local: { path: string };
    remote: { id: string; unique_id: string };
  };
}

export interface TdLibUser {
  id: number;
  first_name: string;
  last_name: string;
  username?: string;
  usernames?: {
    active_usernames?: string[];
    disabled_usernames?: string[];
    editable_username?: string;
  };
  phone_number: string;
  status: {
    '@type': 'userStatusOnline' | 'userStatusOffline' | 'userStatusRecently' | 'userStatusLastWeek' | 'userStatusLastMonth' | 'userStatusEmpty';
    was_online?: number;
    expires?: number;
  };
  profile_photo?: {
    id: string;
    small: {
      local: { path: string };
      remote: { id: string };
    };
    big: {
      local: { path: string };
      remote: { id: string };
    };
    minithumbnail?: {
      width: number;
      height: number;
      data: string;
    };
  };
  is_contact: boolean;
  is_mutual_contact: boolean;
  is_verified: boolean;
  is_support: boolean;
  restriction_reason: string;
  is_scam: boolean;
  is_fake: boolean;
  have_access: boolean;
  type: {
    '@type': 'userTypeRegular' | 'userTypeBot' | 'userTypeDeleted' | 'userTypeUnknown';
  };
  language_code: string;
}
