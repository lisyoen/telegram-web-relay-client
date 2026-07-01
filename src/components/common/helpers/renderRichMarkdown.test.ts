import { renderRichMarkdownToSafeHtml } from './renderRichMarkdown';

describe('renderRichMarkdownToSafeHtml — Stage B-2.1 코드블록 복사 버튼', () => {
  test('펜스 코드블록(```js)에 .rich-code-block 과 .rich-code-copy 가 모두 포함된다 (DOMPurify 통과)', () => {
    const html = renderRichMarkdownToSafeHtml('```js\nconst a=1;\n```');
    expect(html).toContain('class="rich-code-block');
    expect(html).toContain('class="rich-code-copy"');
    expect(html).toContain('<pre');
    expect(html).toContain('<code');
    // 복사 span 의 접근성 속성이 sanitize 후에도 살아남아야 함
    expect(html).toContain('role="button"');
    expect(html).toContain('aria-label="복사"');
    // 아이콘 클래스
    expect(html).toContain('icon-copy');
  });

  test('들여쓰기 코드블록(code_block)도 동일하게 복사 버튼이 주입된다', () => {
    const html = renderRichMarkdownToSafeHtml('    const a = 1;\n    const b = 2;\n');
    expect(html).toContain('class="rich-code-block');
    expect(html).toContain('class="rich-code-copy"');
  });

  test('비-코드 마크다운(표/인용/목록)은 여전히 정상 렌더된다 (회귀 방지)', () => {
    const html = renderRichMarkdownToSafeHtml(
      '> 인용문\n\n- 항목1\n- 항목2\n\n| A | B |\n|---|---|\n| 1 | 2 |\n',
    );
    expect(html).toContain('<blockquote>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>');
    expect(html).toContain('<table>');
    expect(html).toContain('<th>');
    expect(html).toContain('<td>');
    // 비-코드 블록에는 복사 버튼이 붙지 않음
    expect(html).not.toContain('rich-code-copy');
  });

  test('XSS: 원시 <script> 는 sanitize 로 제거된다', () => {
    const html = renderRichMarkdownToSafeHtml('일반 텍스트<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
  });
});

describe('renderRichMarkdownToSafeHtml — [055] richMarkdown pre wrap (ASCII-only)', () => {
  const LONG_TOKEN = 'A'.repeat(200);

  test('펜스 코드블록에 <pre> 가 포함된다 (ASCII-only, 200자 토큰)', () => {
    const md = '```\n' + LONG_TOKEN + '\n```';
    const html = renderRichMarkdownToSafeHtml(md);
    expect(html).toContain('<pre');
  });

  test('들여쓰기 코드블록에도 <pre> 가 포함된다 (ASCII-only, 200자 토큰)', () => {
    const md = '    ' + LONG_TOKEN;
    const html = renderRichMarkdownToSafeHtml(md);
    expect(html).toContain('<pre');
  });
});
