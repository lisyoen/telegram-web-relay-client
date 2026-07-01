import { formatCopyTimestamp, buildCopyLine } from './copyMessagesFormat';

describe('copyMessagesFormat', () => {
  test('formatCopyTimestamp: DD MM YYYY HH:MM', () => {
    expect(formatCopyTimestamp(1782631491)).toMatch(/^\d{2} \d{2} \d{4} \d{2}:\d{2}$/);
  });

  test('buildCopyLine: [ts] 발신자: 본문, 내부 개행 보존', () => {
    const line = buildCopyLine(1782631491, 'TestBot', '✅ 완료\n📁 프로젝트: telegram-web\n📝 작업: x');
    expect(line).toMatch(/^\[\d{2} \d{2} \d{4} \d{2}:\d{2}\] TestBot: /);
    expect(line).toContain('✅ 완료\n📁 프로젝트: telegram-web\n📝 작업: x');
  });

  test('buildCopyLine: 양끝 trim, 내부 개행 보존', () => {
    expect(buildCopyLine(1782631491, 'A', '\n  line1\nline2\n  ')).toMatch(/A: line1\nline2$/);
  });
});
