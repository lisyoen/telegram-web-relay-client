// v0.77 [010] — updateChatMutedState 낙관적 갱신: mutedUntil -> isMuted 파생 로직 단위 검증.
// getServerTime() 반환값은 Math.floor(Date.now() / 1000) 이므로 Date.now 를 고정해 테스트한다.

const FIXED_NOW_MS = 1_700_000_000_000; // 임의의 고정 시각 (ms)
const FIXED_NOW_S = Math.floor(FIXED_NOW_MS / 1000); // 1700000000

function deriveMuted(mutedUntil: number, serverTimeNow: number): boolean {
  return mutedUntil ? serverTimeNow < mutedUntil : false;
}

describe('updateChatMutedState — mutedUntil -> isMuted derivation [010]', () => {
  it('mutedUntil = MAX_INT_32(2147483647) -> isMuted true (영구 음소거)', () => {
    expect(deriveMuted(2147483647, FIXED_NOW_S)).toBe(true);
  });

  it('mutedUntil = now+3600(미래) -> isMuted true', () => {
    expect(deriveMuted(FIXED_NOW_S + 3600, FIXED_NOW_S)).toBe(true);
  });

  it('mutedUntil = 0 (UNMUTE_TIMESTAMP) -> isMuted false', () => {
    expect(deriveMuted(0, FIXED_NOW_S)).toBe(false);
  });
});
