import * as fs from 'fs';
import * as path from 'path';

// v0.65 (#050) regression guard — static source guard.
// switchMultitabRole 의 deep dep tree(teact/idb/BroadcastChannel/reducers/selectors)가
// import-time 부작용을 가져 jsdom 단위 테스트에서 액션 핸들러 직접 호출이 비현실적이므로,
// initial.ts 의 핵심 멱등 규칙을 텍스트 단언으로 박제한다:
//   (1) 모듈 상단 hasInitedApiThisTab 가드 존재 — 탭당 initApi() 1회 호출 강제
//   (2) ensureApiConnectedForThisTab 헬퍼 존재 + per-tab 로그
//   (3) 헬퍼가 same-role EARLY RETURN / 비마스터 강등 / 마스터 승격 세 분기에서 모두 호출
//   (4) 비마스터 강등 분기에서 destroyConnection / stopWebsync / clearCaching 호출 제거
//       (탭별 Socket.io 구조라 자기 소켓을 끊으면 안 되며, 캐싱·websync 는 idempotent)
//   (5) telegram-tt-ref 와의 의도적 발산 사유 주석 박제 — 회귀 시 재발견 비용 차단

describe('v0.65 #050 — per-tab Socket.io init guard (master-independent)', () => {
  const src = fs.readFileSync(path.resolve(__dirname, 'initial.ts'), 'utf8');

  it('declares module-level hasInitedApiThisTab guard (per-tab idempotent flag)', () => {
    expect(src).toMatch(/let\s+hasInitedApiThisTab\s*=\s*false\s*;/);
  });

  it('defines ensureApiConnectedForThisTab helper with the master-independent log marker', () => {
    expect(src).toMatch(/function\s+ensureApiConnectedForThisTab\s*\(/);
    expect(src).toMatch(/per-tab,\s*master-independent/);
  });

  it('helper sets hasInitedApiThisTab=true before calling actions.initApi() (1회 강제)', () => {
    // 가드 set 이 initApi 호출 앞에 있어야 재진입에서 중복 호출이 차단됨
    const helperBody = src.match(/function\s+ensureApiConnectedForThisTab[\s\S]+?\n}\n/)?.[0] || '';
    expect(helperBody).toMatch(/hasInitedApiThisTab\s*=\s*true/);
    expect(helperBody).toMatch(/actions\.initApi\(\)/);
    expect(helperBody.indexOf('hasInitedApiThisTab = true'))
      .toBeLessThan(helperBody.indexOf('actions.initApi()'));
  });

  it('helper short-circuits when hasInitedApiThisTab is already true', () => {
    const helperBody = src.match(/function\s+ensureApiConnectedForThisTab[\s\S]+?\n}\n/)?.[0] || '';
    expect(helperBody).toMatch(/if\s*\(\s*hasInitedApiThisTab\s*\)/);
  });

  it('helper skips initApi when passcode-locked (lock UI 표시 중엔 소켓 연결 금지)', () => {
    const helperBody = src.match(/function\s+ensureApiConnectedForThisTab[\s\S]+?\n}\n/)?.[0] || '';
    expect(helperBody).toMatch(/passcode\.hasPasscode/);
    expect(helperBody).toMatch(/passcode\.isScreenLocked/);
    expect(helperBody).toMatch(/SKIPPED - passcode locked/);
  });

  it('switchMultitabRole EARLY RETURN (same role) calls ensureApiConnectedForThisTab', () => {
    // EARLY RETURN 직전 ensureApiConnectedForThisTab 호출이 있어야
    // 비마스터 단독 통지 탭(establishMultitabRole 가 false 로 통지) 도 자기 소켓을 연결
    const earlyReturnBlock = src.match(/EARLY RETURN \(same role\)[\s\S]+?return;/)?.[0] || '';
    expect(earlyReturnBlock).toMatch(/ensureApiConnectedForThisTab\(actions\)/);
  });

  it('switchMultitabRole !isMasterTab 분기에서 actions.destroyConnection() 호출 제거', () => {
    // 탭별 Socket.io 구조에서 비마스터 강등 시 destroyConnection 호출은 자기 소켓을 끊어
    // sendMessage 등 callApi 가 영구 큐잉됨. ensureApiConnectedForThisTab 호출은 유지.
    const nonMasterBlock = src.match(/if\s*\(!isMasterTab\)\s*\{[\s\S]+?\}\s*else\s*\{/)?.[0] || '';
    // 라인 코멘트 제거 후 실제 호출 사이트만 검사 (코멘트의 함수명 언급은 정상)
    const codeOnly = nonMasterBlock.replace(/\/\/[^\n]*/g, '');
    expect(codeOnly).not.toMatch(/actions\.destroyConnection\(\)/);
    expect(codeOnly).not.toMatch(/stopWebsync\(\)/);
    expect(codeOnly).not.toMatch(/clearCaching\(\)/);
    expect(nonMasterBlock).toMatch(/ensureApiConnectedForThisTab\(actions\)/);
  });

  it('switchMultitabRole 마스터 승격 분기는 ensureApiConnectedForThisTab 를 사용 (inline initApi 중복 제거)', () => {
    const masterBlock = src.match(/\}\s*else\s*\{[\s\S]+?\n  \}\n\}\)/)?.[0] || '';
    expect(masterBlock).toMatch(/ensureApiConnectedForThisTab\(actions\)/);
    // 마스터 분기에서 inline `actions.initApi()` 호출은 헬퍼 경유로 정리됨
    expect(masterBlock).not.toMatch(/^\s*actions\.initApi\(\);\s*$/m);
  });

  it('telegram-tt-ref 와의 발산 사유 주석 박제 (회귀 시 재발견 비용 차단)', () => {
    expect(src).toMatch(/telegram-tt-ref/);
    expect(src).toMatch(/per-tab/);
  });
});
