import { getIsChatMuted } from './notifications';

// getServerTime 은 현재 Unix 초를 반환하는 순수 함수이므로 모듈 수준에서 mock 한다.
jest.mock('../../util/serverTime', () => ({
  getServerTime: () => 1000,
}));

// isChatChannel 은 음소거 판정에 영향 없으므로 기본값 반환으로 mock.
jest.mock('./chats', () => ({
  isChatChannel: () => false,
}));

function makeChat(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-chat',
    type: 'chatTypePrivate',
    title: 'Test',
    ...overrides,
  } as any;
}

describe('getIsChatMuted', () => {
  it('case1: notifyException.mutedUntil 이 미래 시각이면 true', () => {
    const chat = makeChat();
    const notifyException = { mutedUntil: 9999 } as any;
    expect(getIsChatMuted(chat, undefined, notifyException)).toBe(true);
  });

  it('case2: notify 설정 없음 + chat.isMuted=true -> true (폴백 핵심)', () => {
    const chat = makeChat({ isMuted: true });
    expect(getIsChatMuted(chat, undefined, undefined)).toBe(true);
  });

  it('case3: notify 설정 없음 + chat.isMuted=false -> false', () => {
    const chat = makeChat({ isMuted: false });
    expect(getIsChatMuted(chat, undefined, undefined)).toBe(false);
  });

  it('case4: notify 설정 없음 + chat.isMuted=undefined -> false', () => {
    const chat = makeChat();
    expect(getIsChatMuted(chat, undefined, undefined)).toBe(false);
  });
});
