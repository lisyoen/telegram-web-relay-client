import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';

// Stage B-2: messageRichMessage 마크다운 원문(서버 content.rich_markdown) → 안전 HTML.
// html:false → 봇 메시지 내 원시 HTML 비활성(XSS 차단). 표/코드/인용/목록은 markdown-it 자체 출력.
const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false,
  breaks: false,
});

// 외부 링크 안전: target=_blank rel=noopener noreferrer
const defaultLinkOpenRender = md.renderer.rules.link_open
  || ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const targetIndex = tokens[idx].attrIndex('target');
  if (targetIndex < 0) {
    tokens[idx].attrPush(['target', '_blank']);
  } else {
    tokens[idx].attrSet('target', '_blank');
  }
  tokens[idx].attrSet('rel', 'noopener noreferrer');
  return defaultLinkOpenRender(tokens, idx, options, env, self);
};

// Stage B-2.1: 코드블록 복사 버튼 복구 (telegram-tt CodeOverlay 동등).
// fence(```lang)·code_block(들여쓰기) 기본 렌더 결과를 가로채 <pre> 에 class 추가 + 복사 컨트롤 주입.
// 이스케이프는 markdown-it 기본 렌더 결과를 그대로 사용(직접 손대지 않음).
const COPY_BUTTON_HTML
  = '<span class="rich-code-copy" role="button" tabindex="0" title="복사" aria-label="복사">'
  + '<span class="icon icon-copy" aria-hidden="true"></span>'
  + '</span>';

function injectCopyControl(rawPreHtml: string): string {
  // markdown-it fence/code_block 기본 출력은 항상 `<pre><code …>…</code></pre>` 형태.
  // 여는 <pre> 또는 <pre …> 에 class="rich-code-block" 을 추가하고 그 직후 복사 컨트롤 삽입.
  // 이미 class 가 있으면 병합.
  const withClass = rawPreHtml.replace(/^<pre(\s[^>]*)?>/, (_m, attrs) => {
    const a = attrs || '';
    if (/\bclass\s*=/.test(a)) {
      return `<pre${a.replace(/class\s*=\s*"([^"]*)"/, 'class="$1 rich-code-block"')
        .replace(/class\s*=\s*'([^']*)'/, "class='$1 rich-code-block'")}>`;
    }
    return `<pre class="rich-code-block"${a}>`;
  });
  return withClass.replace(/^<pre([^>]*)>/, (m) => `${m}${COPY_BUTTON_HTML}`);
}

const defaultFenceRender = md.renderer.rules.fence
  || ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const rawPre = defaultFenceRender(tokens, idx, options, env, self);
  return injectCopyControl(rawPre);
};

const defaultCodeBlockRender = md.renderer.rules.code_block
  || ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.code_block = (tokens, idx, options, env, self) => {
  const rawPre = defaultCodeBlockRender(tokens, idx, options, env, self);
  return injectCopyControl(rawPre);
};

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'del', 's', 'code', 'pre', 'blockquote',
  'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'span',
];
// role/tabindex/title/aria-label: 복사 span 접근성. DOMPurify sanitize 후에도 살아남아야 함.
const ALLOWED_ATTR = ['href', 'target', 'rel', 'class', 'role', 'tabindex', 'title', 'aria-label', 'aria-hidden'];

export function renderRichMarkdownToSafeHtml(markdown: string): string {
  const rawHtml = md.render(markdown);
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  }) as string;
}
