import { isUserId } from '../../../util/entities/ids';

import type { MessageListType } from '../../../types';

export type ShouldRenderGreetingParams = {
  chatId: string;
  isChatWithSelf: boolean;
  isBot: boolean;
  isAnonymousForwards: boolean;
  type: MessageListType;
  hasMessageGroups: boolean;
  hasLastMessage: boolean;
  hasMessageIds: boolean;
  listItemCount: number;
};

/**
 * 사용자 요구: lone contactSignUp 을 가시 ActionMessage 로 표시
 * (telegram-tt ContactGreeting 기본 동작 의도적 오버라이드).
 * truly-empty 채팅 greeting 은 유지.
 *
 * 오버라이드 전 telegram-tt 원본 조건:
 *   contactSignUp 단독 메시지 || lastMessage.action.type === 'contactSignUp' → true(greeting)
 * 오버라이드 후:
 *   두 절 제거 — truly-empty(메시지 없음) 일 때만 greeting.
 */
export function computeShouldRenderGreeting({
  chatId,
  isChatWithSelf,
  isBot,
  isAnonymousForwards,
  type,
  hasMessageGroups,
  hasLastMessage,
  hasMessageIds,
  listItemCount,
}: ShouldRenderGreetingParams): boolean {
  if (!isUserId(chatId) || isChatWithSelf || isBot || isAnonymousForwards || type !== 'thread') {
    return false;
  }
  // truly-empty chat only: no messageGroups, no lastMessage
  return !hasMessageGroups && !hasLastMessage && hasMessageIds && listItemCount === 0;
}
