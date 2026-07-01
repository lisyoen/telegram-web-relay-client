import * as fs from 'fs';
import * as path from 'path';

// v0.62 (#045) regression guard — static source guard.
// loadCache()는 deep import tree(teact/idb/BroadcastChannel/selectors/reducers)를
// import-time 부작용으로 끌어와 jsdom 단위 테스트로 직접 호출이 비현실적이므로,
// cache.ts 의 핵심 로드 정책 두 가지를 텍스트 단언으로 박제한다:
//   (1) loadCache 의 newState 구성은 ...cached 뒤에 messages: initialState.messages 를
//       오버라이드 — 영속돼 있던 stale 메시지 본문이 절대 복원되지 않음
//   (2) sharedState 복원은 그대로 유지 — settings.language 등 영속 보존
// 동시에 #044 저장측 안전망(reduceGlobal 의 messages: INITIAL_GLOBAL_STATE.messages)도
// 되돌리지 않았음을 확인한다.

describe('v0.62 #045 — loadCache must discard cached messages unconditionally (static guard)', () => {
  const src = fs.readFileSync(path.resolve(__dirname, 'cache.ts'), 'utf8');

  it('loadCache newState must override messages with initialState.messages after ...cached', () => {
    // newState 블록 안에 messages: initialState.messages 오버라이드가 존재해야 한다.
    const newStateBlock = src.match(/const newState: GlobalState = \{[\s\S]*?\};/);
    expect(newStateBlock).not.toBeNull();
    expect(newStateBlock![0]).toMatch(/messages:\s*initialState\.messages/);
  });

  it('messages override must come after ...cached spread (so it actually overrides)', () => {
    const newStateBlock = src.match(/const newState: GlobalState = \{[\s\S]*?\};/)![0];
    const cachedIdx = newStateBlock.indexOf('...cached');
    const overrideIdx = newStateBlock.search(/messages:\s*initialState\.messages/);
    expect(cachedIdx).toBeGreaterThanOrEqual(0);
    expect(overrideIdx).toBeGreaterThan(cachedIdx);
  });

  it('sharedState restore from cached must remain (settings.language preserved)', () => {
    const newStateBlock = src.match(/const newState: GlobalState = \{[\s\S]*?\};/)![0];
    expect(newStateBlock).toMatch(/sharedState:\s*\{[\s\S]*?\.\.\.cached\?\.sharedState/);
  });

  it('#044 save-side safety net must remain (reduceGlobal uses INITIAL_GLOBAL_STATE.messages)', () => {
    expect(src).toMatch(/messages:\s*INITIAL_GLOBAL_STATE\.messages/);
  });
});
