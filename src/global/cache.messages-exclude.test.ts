import * as fs from 'fs';
import * as path from 'path';

// v0.61 (#044) regression guard — static source guard.
// reduceGlobal()이 deep dependency tree(teact/idb/BroadcastChannel/selectors/reducers)를
// import-time 부작용으로 끌어와 jsdom 단위 테스트로 직접 호출이 비현실적이므로,
// cache.ts 의 핵심 영속 정책 두 가지를 텍스트 단언으로 박제한다:
//   (1) reduceGlobal 의 messages 슬라이스는 INITIAL_GLOBAL_STATE.messages (빈 초기 구조) 사용 — 메시지 본문 영속 금지
//   (2) reduceSharedState 는 settings 전개 + languages 만 undefined — settings.language 등 보존

describe('v0.61 #044 — cache messages exclusion + sharedState preservation (static guard)', () => {
  const src = fs.readFileSync(path.resolve(__dirname, 'cache.ts'), 'utf8');

  it('reduceGlobal must persist messages as INITIAL_GLOBAL_STATE.messages (empty initial shape)', () => {
    expect(src).toMatch(/messages:\s*INITIAL_GLOBAL_STATE\.messages/);
  });

  it('reduceMessages helper must not be invoked from reduceGlobal anymore (v0.51 stale-restore source)', () => {
    expect(src).not.toMatch(/messages:\s*reduceMessages\s*\(/);
  });

  it('reduceSharedState exists and only omits languages (settings.language preserved)', () => {
    expect(src).toMatch(/export function reduceSharedState/);
    expect(src).toMatch(/languages:\s*undefined/);
    expect(src).not.toMatch(/language:\s*undefined/);
  });
});
