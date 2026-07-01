/**
 * computeShouldRenderGreeting unit tests.
 * surrogate crash prevention (#054): ASCII-only fixtures only.
 *
 * Verifies intentional divergence from telegram-tt:
 *   lone contactSignUp must NOT trigger ContactGreeting (override).
 *   truly-empty chat must still trigger ContactGreeting (regression guard).
 */
import { computeShouldRenderGreeting } from './shouldRenderGreeting';

const BASE = {
  chatId: '8839016669',
  isChatWithSelf: false,
  isBot: false,
  isAnonymousForwards: false,
  type: 'thread' as const,
  hasMessageGroups: false,
  hasLastMessage: false,
  hasMessageIds: true,
  listItemCount: 0,
};

describe('computeShouldRenderGreeting', () => {
  describe('truly-empty 1:1 chat (regression guard)', () => {
    it('returns true when no messages, no lastMessage, no messageGroups', () => {
      expect(computeShouldRenderGreeting(BASE)).toBe(true);
    });

    it('returns true when listItemCount=0 (flicker guard passes)', () => {
      expect(computeShouldRenderGreeting({ ...BASE, listItemCount: 0 })).toBe(true);
    });

    it('returns false when listItemCount>0 (avoid flicker on greeting deletion)', () => {
      expect(computeShouldRenderGreeting({ ...BASE, listItemCount: 1 })).toBe(false);
    });
  });

  describe('lone contactSignUp -> greeting suppressed (intentional override)', () => {
    it('returns false when hasMessageGroups=true (contactSignUp is in messageGroups)', () => {
      expect(computeShouldRenderGreeting({ ...BASE, hasMessageGroups: true })).toBe(false);
    });

    it('returns false when hasLastMessage=true (lastMessage is contactSignUp)', () => {
      expect(computeShouldRenderGreeting({ ...BASE, hasLastMessage: true })).toBe(false);
    });

    it('returns false when hasMessageGroups=true AND hasLastMessage=true', () => {
      expect(computeShouldRenderGreeting({ ...BASE, hasMessageGroups: true, hasLastMessage: true })).toBe(false);
    });
  });

  describe('non-1:1 or special chat types', () => {
    it('returns false for group chatId', () => {
      expect(computeShouldRenderGreeting({ ...BASE, chatId: '-100123456789' })).toBe(false);
    });

    it('returns false when isChatWithSelf=true (saved messages)', () => {
      expect(computeShouldRenderGreeting({ ...BASE, isChatWithSelf: true })).toBe(false);
    });

    it('returns false when isBot=true', () => {
      expect(computeShouldRenderGreeting({ ...BASE, isBot: true })).toBe(false);
    });

    it('returns false when isAnonymousForwards=true', () => {
      expect(computeShouldRenderGreeting({ ...BASE, isAnonymousForwards: true })).toBe(false);
    });

    it('returns false when type is not thread', () => {
      expect(computeShouldRenderGreeting({ ...BASE, type: 'pinned' as const })).toBe(false);
      expect(computeShouldRenderGreeting({ ...BASE, type: 'scheduled' as const })).toBe(false);
    });
  });

  describe('hasMessageIds edge cases', () => {
    it('returns false when hasMessageIds=false (messageIds not yet loaded)', () => {
      expect(computeShouldRenderGreeting({ ...BASE, hasMessageIds: false })).toBe(false);
    });
  });
});
