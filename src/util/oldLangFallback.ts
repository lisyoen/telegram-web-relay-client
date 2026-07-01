/**
 * oldLang() 정적 fallback 사전.
 *
 * server.js `oldFetchLangPack` 은 구현되어 있으나 localization_target='android' 단일
 * 팩만 반환하므로, tdesktop(`lng_context_*`)·iOS·macOS(`Conversation.*`, `Stickers.*`)
 * 고유 키는 이 fallback(한국어)으로 보충한다. remote 적재 성공 시 remote 값으로
 * override 된다(oldSetLanguage 의 merge). 근본 해결은 server.js 4팩 fetch 후속 작업.
 */
import type { ApiOldLangPack } from '../api/types';

const OLD_LANG_FALLBACK: ApiOldLangPack = {
  // Common
  'Reply': '답장',
  'Edit': '편집',
  'Delete': '삭제',
  'Forward': '전달',
  'DialogPin': '고정',
  'DialogUnpin': '고정 해제',
  'Common.Select': '선택',
  'PremiumMore': '더보기',
  'AddToFavorites': '즐겨찾기에 추가',
  'Stickers.RemoveFromFavorites': '즐겨찾기에서 제거',
  'TranslateMessage': '번역',
  'ShowOriginalButton': '원문 보기',
  'SendAnotherGift': '다른 선물 보내기',

  // Scheduled
  'MessageScheduleSend': '지금 전송',
  'MessageScheduleEditTime': '일정 변경',

  // Quote / Reply
  'lng_context_quote_and_reply': '인용 답장',

  // Copy (tdesktop keys)
  'lng_context_copy_text': '텍스트 복사',
  'lng_context_copy_image': '이미지 복사',
  'lng_context_copy_selected': '선택한 텍스트 복사',
  'lng_context_copy_link': '링크 복사',
  'lng_context_copy_message_link': '메시지 링크 복사',
  'lng_profile_copy_phone': '전화번호 복사',

  // Media
  'lng_media_download': '다운로드',
  'lng_media_image_copied_to_clipboard': '이미지를 클립보드에 복사했습니다',
  'lng_context_cancel_download': '다운로드 취소',
  'lng_context_save_gif': 'GIF 저장',

  // Polls
  'lng_polls_retract': '투표 취소',
  'lng_polls_stop': '투표 중단',
  'lng_polls_stop_warning': '지금 투표를 중단하면 더 이상 참여할 수 없으며, 되돌릴 수 없습니다.',
  'lng_polls_stop_sure': '중단',

  // Report
  'lng_context_report_msg': '신고',

  // Language
  'lng_settings_change_lang': '언어 변경',

  // Conversation
  'Conversation.ContextMenuSeen': {
    otherValue: '%d명 읽음',
    oneValue: '%d명 읽음',
  },
  'Conversation.ContextMenuNoViews': '조회 없음',
  'Conversation.ContextMenuSendGiftTo': '%1$s 에게 선물 보내기',
  'Conversation.ContextViewReplies': {
    otherValue: '댓글 %d개 보기',
    oneValue: '댓글 %d개 보기',
  },

  // Reactions / Seen
  'Chat.ContextReactionCount': {
    otherValue: '반응 %d개',
    oneValue: '반응 %d개',
  },

  // Message selection (toolbar header — useOldLang)
  'VoiceOver.Chat.MessagesSelected': {
    oneValue: '메시지 %d개',
    otherValue: '메시지 %d개',
  },
  'Chat.OutgoingContextMixedReactionCount': '반응 %1$s · 조회 %2$s',

  // Emoji packs
  'MessageContainsEmojiPack': '이 메시지에 **%1$s** 팩의 이모지가 포함되어 있습니다.',
  'MessageContainsEmojiPacks': '이 메시지에 이모지 팩 %1$d개가 포함되어 있습니다.',

  // Notification
  'Share.Link.Copied': '링크가 클립보드에 복사되었습니다.',

  // Action messages (시스템/서비스 메시지 한국어 — Android 팩 누락 키 보충)
  'ActionFallbackUser': '사용자',
  'ActionFallbackChat': '채팅',
  'ActionFallbackChannel': '채널',
  'ActionUnsupported': '지원되지 않는 메시지',
  'ActionUserRegistered': '{from}님이 텔레그램에 가입했습니다',
  'ActionUserJoinedByLink': '{from}님이 초대 링크로 그룹에 참여했습니다',
  'ActionJoinedByRequest': '{from}님의 그룹 참여 요청이 수락되었습니다',
  'ActionJoinedByRequestYou': '그룹 참여 요청이 수락되었습니다',
  'ActionHistoryCleared': '채팅 기록이 삭제되었습니다',
  'ActionChangedTitle': '{from}님이 그룹 이름을 «{title}»으로 변경했습니다',
  'ActionChangedTitleYou': '그룹 이름을 «{title}»으로 변경했습니다',
  'ActionChangedTitleChannel': '채널 이름이 «{title}»으로 변경되었습니다',
  'ActionChangedPhoto': '{from}님이 그룹 사진을 변경했습니다',
  'ActionChangedPhotoYou': '그룹 사진을 변경했습니다',
  'ActionChangedPhotoChannel': '채널 사진이 변경되었습니다',
  'ActionRemovedPhoto': '{from}님이 그룹 사진을 삭제했습니다',
  'ActionRemovedPhotoYou': '그룹 사진을 삭제했습니다',
  'ActionRemovedPhotoChannel': '채널 사진이 삭제되었습니다',
  'ActionCreatedChat': '{from}님이 그룹 «{title}»을 만들었습니다',
  'ActionCreatedChatYou': '그룹 «{title}»을 만들었습니다',
  'ActionCreatedChannel': '채널이 만들어졌습니다',
  'ActionMigratedTo': '{chat}으로 마이그레이션되었습니다',
  'ActionMigratedFrom': '{chat}에서 마이그레이션되었습니다',
  'ActionUserJoined': '{from}님이 그룹에 참여했습니다',
  'ActionUserJoinedYou': '그룹에 참여했습니다',
  'ActionAddUser': '{from}님이 {user}님을 초대했습니다',
  'ActionAddUserYou': '{user}님을 초대했습니다',
  'ActionAddUsersMany': '{from}님이 {users}님을 초대했습니다',
  'ActionAddUsersManyYou': '{users}님을 초대했습니다',
  'ActionKickUser': '{from}님이 {user}님을 내보냈습니다',
  'ActionKickUserYou': '{user}님을 내보냈습니다',
  'ActionUserLeft': '{from}님이 그룹을 나갔습니다',
  'ActionUserLeftYou': '그룹을 나갔습니다',
  'ActionPinnedText': '{from}님이 "{text}"을 고정했습니다',
  'ActionPinnedTextYou': '"{text}"을 고정했습니다',
  'ActionPinnedNotFound': '{from}님이 메시지를 고정했습니다',
  'ActionPinnedNotFoundYou': '메시지를 고정했습니다',
  'ActionPinnedMedia': '{from}님이 {media}을 고정했습니다',
  'ActionPinnedMediaYou': '{media}을 고정했습니다',

  // Typing (tdesktop 키 — 한국어 팩 미적재, DotAnimation 이 ... 부착하므로 말줄임표 제외)
  'lng_user_typing': '입력하는 중',
  'lng_send_action_record_video': '동영상 녹화 중',
  'lng_send_action_upload_video': '동영상 전송 중',
  'lng_send_action_record_audio': '음성 녹음 중',
  'lng_send_action_upload_audio': '오디오 전송 중',
  'lng_send_action_upload_photo': '사진 전송 중',
  'lng_send_action_upload_file': '파일 전송 중',
  'lng_send_action_record_round': '영상 메시지 녹화 중',
  'lng_send_action_upload_round': '영상 메시지 전송 중',
  'lng_send_action_choose_sticker': '스티커 선택 중',
  'lng_playing_game': '게임하는 중',
  'lng_user_action_watching_animations': '{emoji} 보는 중',
};

export default OLD_LANG_FALLBACK;
