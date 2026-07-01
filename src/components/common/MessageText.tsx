import type React from '../../lib/teact/teact';
import {
  memo, useCallback, useMemo, useRef,
} from '../../lib/teact/teact';
import { getActions } from '../../global';

import type { ApiFormattedText, ApiMessage, ApiStory } from '../../api/types';
import type { ObserveFn } from '../../hooks/useIntersectionObserver';
import type { ThreadId } from '../../types';
import { ApiMessageEntityTypes } from '../../api/types';

import { extractMessageText, stripCustomEmoji } from '../../global/helpers';
import { copyTextToClipboard } from '../../util/clipboard';
import trimText from '../../util/trimText';
import { renderRichMarkdownToSafeHtml } from './helpers/renderRichMarkdown';
import { insertTextEntity, renderTextWithEntities } from './helpers/renderTextWithEntities';

import useLang from '../../hooks/useLang';
import useLastCallback from '../../hooks/useLastCallback';
import useOldLang from '../../hooks/useOldLang';
import useSyncEffect from '../../hooks/useSyncEffect';
import useUniqueId from '../../hooks/useUniqueId';

import TypingWrapper from './TypingWrapper';

interface OwnProps {
  messageOrStory: ApiMessage | ApiStory;
  threadId?: ThreadId;
  forcedText?: ApiFormattedText;
  isForAnimation?: boolean;
  emojiSize?: number;
  highlight?: string;
  asPreview?: boolean;
  truncateLength?: number;
  isProtected?: boolean;
  observeIntersectionForLoading?: ObserveFn;
  observeIntersectionForPlaying?: ObserveFn;
  withTranslucentThumbs?: boolean;
  shouldRenderAsHtml?: boolean;
  inChatList?: boolean;
  forcePlayback?: boolean;
  focusedQuote?: string;
  focusedQuoteOffset?: number;
  isInSelectMode?: boolean;
  canBeEmpty?: boolean;
  maxTimestamp?: number;
  shouldAnimateTyping?: boolean;
}

const MIN_CUSTOM_EMOJIS_FOR_SHARED_CANVAS = 3;

function MessageText({
  messageOrStory,
  forcedText,
  isForAnimation,
  emojiSize,
  highlight,
  asPreview,
  truncateLength,
  isProtected,
  observeIntersectionForLoading,
  observeIntersectionForPlaying,
  withTranslucentThumbs,
  shouldRenderAsHtml,
  inChatList,
  forcePlayback,
  focusedQuote,
  focusedQuoteOffset,
  isInSelectMode,
  canBeEmpty,
  maxTimestamp,
  threadId,
  shouldAnimateTyping,
}: OwnProps) {
  const sharedCanvasRef = useRef<HTMLCanvasElement>();
  const sharedCanvasHqRef = useRef<HTMLCanvasElement>();

  const textCacheBusterRef = useRef(0);

  const lang = useLang();
  const oldLang = useOldLang();

  // Stage B-2.1: rich_markdown 코드블록 복사 버튼 클릭 위임(CodeOverlay 동등 UX).
  const handleRichClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const btn = target.closest('.rich-code-copy');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const code = btn.closest('pre.rich-code-block')?.querySelector('code');
    const text = code?.textContent ?? '';
    if (!text) return;
    copyTextToClipboard(text);
    getActions().showNotification({ message: oldLang('TextCopied') });
  }, [oldLang]);

  const formattedText = forcedText || extractMessageText(messageOrStory, inChatList);
  const adaptedFormattedText = isForAnimation && formattedText ? stripCustomEmoji(formattedText) : formattedText;
  const { text, entities } = adaptedFormattedText || {};

  // Stage B-2: 번역/요약(forcedText) 미적용 + content.richMarkdown 존재 시 markdown-it 렌더 우선.
  // (forcedText 가 있으면 번역/요약 결과를 렌더해야 하므로 분기 비활성.)
  const richMarkdown = !forcedText && !isForAnimation && !asPreview && !inChatList
    && 'content' in messageOrStory
    ? (messageOrStory.content as any).richMarkdown as (string | undefined)
    : undefined;

  const entitiesWithFocusedQuote = useMemo(() => {
    if (!text || !focusedQuote) return entities;

    const offsetIndex = text.indexOf(focusedQuote, focusedQuoteOffset);
    const index = offsetIndex >= 0 ? offsetIndex : text.indexOf(focusedQuote); // Fallback to first occurrence
    const lendth = focusedQuote.length;
    if (index >= 0) {
      return insertTextEntity(entities || [], {
        offset: index,
        length: lendth,
        type: ApiMessageEntityTypes.QuoteFocus,
      });
    }

    return entities;
  }, [text, entities, focusedQuote, focusedQuoteOffset]);

  const containerId = useUniqueId();

  useSyncEffect(() => {
    textCacheBusterRef.current += 1;
  }, [text, entitiesWithFocusedQuote]);

  const withSharedCanvas = useMemo(() => {
    const hasSpoilers = entitiesWithFocusedQuote?.some((e) => e.type === ApiMessageEntityTypes.Spoiler);
    if (hasSpoilers) {
      return false;
    }

    const customEmojisCount = entitiesWithFocusedQuote
      ?.filter((e) => e.type === ApiMessageEntityTypes.CustomEmoji).length || 0;
    return customEmojisCount >= MIN_CUSTOM_EMOJIS_FOR_SHARED_CANVAS;
  }, [entitiesWithFocusedQuote]) || 0;

  const renderText = useLastCallback((t: ApiFormattedText) => {
    return renderTextWithEntities({
      text: t.text,
      entities: t.entities,
      highlight,
      emojiSize,
      shouldRenderAsHtml,
      containerId,
      asPreview,
      isProtected,
      observeIntersectionForLoading,
      observeIntersectionForPlaying,
      withTranslucentThumbs,
      sharedCanvasRef,
      sharedCanvasHqRef,
      cacheBuster: textCacheBusterRef.current.toString(),
      forcePlayback,
      isInSelectMode,
      maxTimestamp,
      chatId: 'chatId' in messageOrStory ? messageOrStory.chatId : undefined,
      messageId: messageOrStory.id,
      threadId,
    });
  });

  // Stage B-2: richMarkdown 가 있으면 markdown-it 로 렌더 (text 가비어도 가드 건너뜀).
  // 평탄화 text 폴백은 richMarkdown 미주입 메시지에서만 적용.
  if (richMarkdown) {
    return (
      <div
        className="rich-markdown-content"
        onClick={handleRichClick}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: renderRichMarkdownToSafeHtml(richMarkdown) }}
      />
    );
  }

  if (!text && !canBeEmpty) {
    return <span className="content-unsupported">{lang('MessageUnsupported')}</span>;
  }

  const textToRender: ApiFormattedText = {
    text: trimText(text || '', truncateLength),
    entities: entitiesWithFocusedQuote,
  };

  return (
    <>
      {[
        withSharedCanvas && <canvas key="shared-canvas" ref={sharedCanvasRef} className="shared-canvas" />,
        withSharedCanvas && <canvas key="shared-canvas-hq" ref={sharedCanvasHqRef} className="shared-canvas" />,
        shouldAnimateTyping ? (
          <TypingWrapper key="typing-wrapper" text={textToRender}>{renderText}</TypingWrapper>
        ) : renderText(textToRender),
      ].flat().filter(Boolean)}
    </>
  );
}

export default memo(MessageText);
