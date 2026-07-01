/**
 * useLang (신규 현지화 시스템) 한국어 정적 폴백.
 *
 * 동작: src/util/localization/index.ts getString() 에서 langPack 조회 실패 시,
 * fallbackLangPack(영문 fallback.strings) 대신 본 사전을 우선 시도.
 * (현재 langCode 가 'ko' 이거나, 외부 langPack 자체가 미적재인 경우)
 *
 * 추가 목적: 일부 키(예: TextCopied)는 weba/ko 원격 팩에 누락되어 있어 영문이
 * 노출됨. 본 파일에 키를 등재해 한국어 노출 보장.
 */
import type { LangPack } from '../../api/types';

const KO_LANG_FALLBACK: LangPack['strings'] = {
  // 인라인 code entity 클릭 시 복사 토스트 (renderTextWithEntities handleCodeClick).
  // CodeOverlay(블록 코드 복사 버튼)에서도 동일 키 공용.
  'TextCopied': '클립보드에 복사되었습니다',

  // 접속상태 표시 (getUserStatus 신규 lang 전환, [029])
  'LastSeenJustNow': '방금 접속',
  'LastSeenOffline': '오프라인',
  'LastSeenMinutesAgo': { other: '{count}분 전에 접속' },
  'LastSeenHoursAgo': { other: '{count}시간 전에 접속' },
  'LastSeenTodayAt': '오늘 {time}에 접속',
  'LastSeenYesterdayAt': '어제 {time}에 접속',
  'LastSeenAtDate': '{date}에 접속',
  'ALongTimeAgo': '오래전에 접속',
  'WithinAWeek': '최근 일주일 이내 접속',
  'WithinAMonth': '최근 한 달 이내 접속',
  'Online': '온라인',
  'Lately': '최근 접속',

  // [038] 그룹/채널 헤더 부제 상태 (getGroupStatus + GroupChatInfo onlineStatus 조합).
  // 원격 weba/ko 팩이 Android '%1$d' 형식(OnlineCount/NMembers/Subscribers) 또는 영문
  // (ChatType*)으로 노출 → 한국어 '{count}' 형식으로 교정. getString 에서 KO_LANG_FALLBACK
  // 우선 적용으로 원격 팩의 깨진 문자열을 덮어쓴다.
  'ChatTypeGroup': '그룹',
  'ChatTypeChannel': '채널',
  'ChatTypePrivate': '개인 대화',
  'OnlineCount': { other: '온라인 {count}명' },
  'NMembers': { other: '멤버 {count}명' },
  'Subscribers': { other: '구독자 {count}명' },
  'GroupStatusWithOnline': '{status}, {onlineCount}',
};

export default KO_LANG_FALLBACK;
