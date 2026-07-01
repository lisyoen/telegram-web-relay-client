import { flattenRichMessage } from './richMessageFlatten';

const para = (text: string) => ({ _: 'pageBlockParagraph', text: { _: 'richTextPlain', text } });
const item = (label: string, text: string) => ({ label, blocks: [para(text)] });

describe('flattenRichMessage — pageBlockList 불릿 인라인', () => {
  it('불릿 라벨과 항목 내용이 같은 줄에 렌더된다 (불릿 뒤 빈 줄 없음)', () => {
    const rm = {
      _: 'richMessage',
      blocks: [
        para('보냈어, 오빠.'),
        {
          _: 'pageBlockList',
          items: [
            item('•', '제목: [공유] 월드컵 3위 와일드카드 경쟁 현황'),
            item('•', '수신: recipient@example.com'),
            item('•', 'Bcc: user@example.com'),
            item('•', 'Gmail message id: 19f0221e71b61aba'),
          ],
        },
      ],
    };
    const { text } = flattenRichMessage(rm as any);
    expect(text).toContain('• 제목: [공유] 월드컵 3위 와일드카드 경쟁 현황');
    expect(text).not.toMatch(/•\s*\n/);
    expect(text).toBe(
      '보냈어, 오빠.\n\n'
      + '• 제목: [공유] 월드컵 3위 와일드카드 경쟁 현황\n'
      + '• 수신: recipient@example.com\n'
      + '• Bcc: user@example.com\n'
      + '• Gmail message id: 19f0221e71b61aba',
    );
  });

  it('체크박스 항목도 불릿/체크와 내용이 같은 줄', () => {
    const rm = {
      _: 'richMessage',
      blocks: [{
        _: 'pageBlockList',
        items: [{ label: '•', has_checkbox: true, is_checked: true, blocks: [para('완료 항목')] }],
      }],
    };
    const { text } = flattenRichMessage(rm as any);
    expect(text).toBe('• [x] 완료 항목');
  });
});
