// @ts-nocheck
/* eslint-disable */
// v0.57: messageRichMessage(PageBlock) 클라이언트 평탄화. telegram-web lib/richMessage.js 이식.
// converter 가 서버 주입(content.text)에 의존하지 않고 raw blocks 를 직접 평탄화하기 위함.

// v0.56: TDLib 1.8.65 messageRichMessage(PageBlock) -> formattedText 평탄화.
// Bot API 10.1 로부터 일부 봇이 본문을 richMessage 로 보내는 경우, 기존 파이프라인은
// content.text 가 비어 v2 가 미표시. 본 모듈은 PageBlock/RichText 트리를 순회해 누적 text 와
// 인라인 텍스트 엔티티(Bold/Italic/Underline/Strikethrough/Spoiler/Code/Pre/TextUrl 등) 를 만든다.
// UTF-16 코드유닛 기준 — JS string.length 가 곧 TDLib offset 규약과 일치.

function _appendEntity(out, type, offset, length) {
  if (!type || length <= 0) return;
  out.entities.push({ _: 'textEntity', offset, length, type });
}

function _renderRichText(rt, out) {
  if (!rt || typeof rt !== 'object') return;
  const t = rt._;
  if (t === 'richTextPlain') {
    if (rt.text) out.text += rt.text;
    return;
  }
  if (t === 'richTexts') {
    for (const child of (rt.texts || [])) _renderRichText(child, out);
    return;
  }
  if (t === 'richTextCustomEmoji') {
    if (rt.alternative_text) {
      const s = out.text.length;
      out.text += rt.alternative_text;
      if (rt.custom_emoji_id) {
        _appendEntity(out,
          { _: 'textEntityTypeCustomEmoji', custom_emoji_id: String(rt.custom_emoji_id) },
          s, out.text.length - s);
      }
    }
    return;
  }
  if (t === 'richTextIcon' || t === 'richTextAnchor') return;
  if (t === 'richTextMathematicalExpression') {
    if (rt.expression) {
      const s = out.text.length;
      out.text += rt.expression;
      _appendEntity(out, { _: 'textEntityTypeCode' }, s, out.text.length - s);
    }
    return;
  }
  const childStart = out.text.length;
  if (rt.text) _renderRichText(rt.text, out);
  const length = out.text.length - childStart;
  let type = null;
  switch (t) {
    case 'richTextBold': type = { _: 'textEntityTypeBold' }; break;
    case 'richTextItalic': type = { _: 'textEntityTypeItalic' }; break;
    case 'richTextUnderline': type = { _: 'textEntityTypeUnderline' }; break;
    case 'richTextStrikethrough': type = { _: 'textEntityTypeStrikethrough' }; break;
    case 'richTextSpoiler': type = { _: 'textEntityTypeSpoiler' }; break;
    case 'richTextFixed': type = { _: 'textEntityTypeCode' }; break;
    case 'richTextUrl':
      type = rt.url ? { _: 'textEntityTypeTextUrl', url: rt.url } : null; break;
    case 'richTextAnchorLink':
    case 'richTextReferenceLink':
      type = rt.url ? { _: 'textEntityTypeTextUrl', url: rt.url } : null; break;
    case 'richTextEmailAddress': type = { _: 'textEntityTypeEmailAddress' }; break;
    case 'richTextPhoneNumber': type = { _: 'textEntityTypePhoneNumber' }; break;
    case 'richTextMention': type = { _: 'textEntityTypeMention' }; break;
    case 'richTextMentionName':
      type = rt.user_id ? { _: 'textEntityTypeMentionName', user_id: rt.user_id } : null; break;
    case 'richTextHashtag': type = { _: 'textEntityTypeHashtag' }; break;
    case 'richTextCashtag': type = { _: 'textEntityTypeCashtag' }; break;
    case 'richTextBotCommand': type = { _: 'textEntityTypeBotCommand' }; break;
    case 'richTextBankCardNumber': type = { _: 'textEntityTypeBankCardNumber' }; break;
    default: type = null; break;
  }
  if (type && length > 0) _appendEntity(out, type, childStart, length);
}

function _ensureBlankLine(out) {
  if (out.text.length === 0) return;
  if (out.text.endsWith('\n\n')) return;
  if (out.text.endsWith('\n')) { out.text += '\n'; return; }
  out.text += '\n\n';
}

function _renderBlock(b, out) {
  if (!b || typeof b !== 'object') return;
  const t = b._;
  switch (t) {
    case 'pageBlockParagraph':
    case 'pageBlockThinking': {
      _ensureBlankLine(out);
      _renderRichText(b.text, out);
      break;
    }
    case 'pageBlockFooter': {
      _ensureBlankLine(out);
      _renderRichText(b.footer, out);
      break;
    }
    case 'pageBlockTitle': {
      _ensureBlankLine(out);
      const s = out.text.length;
      _renderRichText(b.title, out);
      const l = out.text.length - s;
      if (l > 0) _appendEntity(out, { _: 'textEntityTypeBold' }, s, l);
      break;
    }
    case 'pageBlockSubtitle': {
      _ensureBlankLine(out);
      const s = out.text.length;
      _renderRichText(b.subtitle, out);
      const l = out.text.length - s;
      if (l > 0) _appendEntity(out, { _: 'textEntityTypeBold' }, s, l);
      break;
    }
    case 'pageBlockHeader': {
      _ensureBlankLine(out);
      const s = out.text.length;
      _renderRichText(b.header, out);
      const l = out.text.length - s;
      if (l > 0) _appendEntity(out, { _: 'textEntityTypeBold' }, s, l);
      break;
    }
    case 'pageBlockSubheader': {
      _ensureBlankLine(out);
      const s = out.text.length;
      _renderRichText(b.subheader, out);
      const l = out.text.length - s;
      if (l > 0) _appendEntity(out, { _: 'textEntityTypeBold' }, s, l);
      break;
    }
    case 'pageBlockKicker': {
      _ensureBlankLine(out);
      const s = out.text.length;
      _renderRichText(b.kicker, out);
      const l = out.text.length - s;
      if (l > 0) _appendEntity(out, { _: 'textEntityTypeBold' }, s, l);
      break;
    }
    case 'pageBlockSectionHeading': {
      _ensureBlankLine(out);
      const s = out.text.length;
      _renderRichText(b.text, out);
      const l = out.text.length - s;
      if (l > 0) _appendEntity(out, { _: 'textEntityTypeBold' }, s, l);
      break;
    }
    case 'pageBlockPreformatted': {
      _ensureBlankLine(out);
      const s = out.text.length;
      _renderRichText(b.text, out);
      const l = out.text.length - s;
      if (l > 0) {
        const lang = b.language || '';
        const type = lang
          ? { _: 'textEntityTypePreCode', language: lang }
          : { _: 'textEntityTypePre' };
        _appendEntity(out, type, s, l);
      }
      break;
    }
    case 'pageBlockBlockQuote': {
      _ensureBlankLine(out);
      const s = out.text.length;
      for (const child of (b.blocks || [])) _renderBlock(child, out);
      if (b.text) _renderRichText(b.text, out);
      const l = out.text.length - s;
      if (l > 0) _appendEntity(out, { _: 'textEntityTypeBlockQuote' }, s, l);
      if (b.credit) {
        _ensureBlankLine(out);
        const cs = out.text.length;
        out.text += '— ';
        _renderRichText(b.credit, out);
        const cl = out.text.length - cs;
        if (cl > 0) _appendEntity(out, { _: 'textEntityTypeItalic' }, cs, cl);
      }
      break;
    }
    case 'pageBlockPullQuote': {
      _ensureBlankLine(out);
      const s = out.text.length;
      _renderRichText(b.text, out);
      const l = out.text.length - s;
      if (l > 0) _appendEntity(out, { _: 'textEntityTypeBlockQuote' }, s, l);
      if (b.credit) {
        _ensureBlankLine(out);
        const cs = out.text.length;
        out.text += '— ';
        _renderRichText(b.credit, out);
        const cl = out.text.length - cs;
        if (cl > 0) _appendEntity(out, { _: 'textEntityTypeItalic' }, cs, cl);
      }
      break;
    }
    case 'pageBlockList': {
      _ensureBlankLine(out);
      const items = b.items || [];
      items.forEach((item, idx) => {
        if (idx > 0 && !out.text.endsWith('\n')) out.text += '\n';
        const label = item.label || '•';
        const check = item.has_checkbox ? (item.is_checked ? '[x] ' : '[ ] ') : '';
        out.text += label + (label ? ' ' : '') + check;
        // 항목 내용은 라벨(•)과 같은 줄에서 시작해야 함 (텔레그램 데스크톱 동일).
        // 첫 블록이 문단이면 _ensureBlankLine 을 우회해 인라인 렌더(불릿-내용 분리 방지),
        // 이후 블록(다중 문단/중첩 리스트 등)은 표준 _renderBlock 처리.
        const itemBlocks = item.blocks || [];
        itemBlocks.forEach((child, ci) => {
          const ct = child && child._;
          if (ci === 0 && (ct === 'pageBlockParagraph' || ct === 'pageBlockThinking')) {
            _renderRichText(child.text, out);
          } else {
            _renderBlock(child, out);
          }
        });
      });
      break;
    }
    case 'pageBlockDetails': {
      _ensureBlankLine(out);
      const hs = out.text.length;
      _renderRichText(b.header, out);
      const hl = out.text.length - hs;
      if (hl > 0) _appendEntity(out, { _: 'textEntityTypeBold' }, hs, hl);
      for (const child of (b.blocks || [])) _renderBlock(child, out);
      break;
    }
    case 'pageBlockTable': {
      _ensureBlankLine(out);
      if (b.caption) {
        const cs = out.text.length;
        _renderRichText(b.caption, out);
        const cl = out.text.length - cs;
        if (cl > 0) _appendEntity(out, { _: 'textEntityTypeBold' }, cs, cl);
      }
      const rows = b.cells || [];
      rows.forEach((row, ri) => {
        if (out.text.length > 0 && !out.text.endsWith('\n')) out.text += '\n';
        (row || []).forEach((cell, ci) => {
          if (ci > 0) out.text += ' | ';
          if (cell && cell.text) _renderRichText(cell.text, out);
        });
      });
      break;
    }
    case 'pageBlockDivider': {
      _ensureBlankLine(out);
      out.text += '———';
      break;
    }
    case 'pageBlockMathematicalExpression': {
      if (b.expression) {
        _ensureBlankLine(out);
        const s = out.text.length;
        out.text += b.expression;
        const l = out.text.length - s;
        if (l > 0) _appendEntity(out, { _: 'textEntityTypeCode' }, s, l);
      }
      break;
    }
    case 'pageBlockAuthorDate': {
      _ensureBlankLine(out);
      const s = out.text.length;
      _renderRichText(b.author, out);
      const l = out.text.length - s;
      if (l > 0) _appendEntity(out, { _: 'textEntityTypeItalic' }, s, l);
      break;
    }
    case 'pageBlockCover': {
      if (b.cover) _renderBlock(b.cover, out);
      break;
    }
    case 'pageBlockCollage':
    case 'pageBlockSlideshow':
    case 'pageBlockEmbeddedPost': {
      for (const child of (b.blocks || [])) _renderBlock(child, out);
      if (b.caption && b.caption.text) {
        _ensureBlankLine(out);
        _renderRichText(b.caption.text, out);
      }
      break;
    }
    case 'pageBlockAnimation':
    case 'pageBlockAudio':
    case 'pageBlockPhoto':
    case 'pageBlockVideo':
    case 'pageBlockVoiceNote':
    case 'pageBlockMap':
    case 'pageBlockEmbedded': {
      if (b.caption && b.caption.text) {
        _ensureBlankLine(out);
        _renderRichText(b.caption.text, out);
      }
      break;
    }
    case 'pageBlockAnchor':
    case 'pageBlockChatLink':
    case 'pageBlockRelatedArticles':
      break;
    default: {
      if (b.text) { _ensureBlankLine(out); _renderRichText(b.text, out); }
      else if (b.caption && b.caption.text) { _ensureBlankLine(out); _renderRichText(b.caption.text, out); }
      else if (Array.isArray(b.blocks)) { for (const c of b.blocks) _renderBlock(c, out); }
      break;
    }
  }
}

function flattenRichMessage(rm) {
  if (!rm || rm._ !== 'richMessage') return { text: '', entities: [] };
  const out = { text: '', entities: [] };
  for (const b of (rm.blocks || [])) _renderBlock(b, out);
  const leadMatch = out.text.match(/^\s*/);
  const lead = leadMatch ? leadMatch[0].length : 0;
  const trimmed = out.text.replace(/^\s+|\s+$/g, '');
  if (!trimmed) return { text: '[빈 리치 메시지]', entities: [] };
  const entities = out.entities
    .map(e => ({ _: 'textEntity', offset: e.offset - lead, length: e.length, type: e.type }))
    .filter(e => e.offset >= 0 && e.length > 0 && e.offset < trimmed.length)
    .map(e => (e.offset + e.length > trimmed.length)
      ? { _: 'textEntity', offset: e.offset, length: trimmed.length - e.offset, type: e.type }
      : e)
    .filter(e => e.length > 0);
  return { text: trimmed, entities };
}

export { flattenRichMessage };
export function flattenRichMessageToFormattedText(rm) {
  const { text, entities } = flattenRichMessage(rm);
  return { _: 'formattedText', text, entities };
}
