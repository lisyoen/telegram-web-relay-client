import { buildApiMessage, buildApiMessageEntities } from './converters';
import { ApiMessageEntityTypes } from '../types';

describe('buildApiMessageEntities — TDLib formattedText.entities → ApiMessageEntity[]', () => {
  it('textEntityTypeBotCommand → MessageEntityBotCommand (v0.33 핵심 — 클릭 가능 봇 커맨드)', () => {
    const out = buildApiMessageEntities([
      { _: 'textEntity', offset: 0, length: 5, type: { _: 'textEntityTypeBotCommand' } },
    ]);
    expect(out).toEqual([
      { offset: 0, length: 5, type: ApiMessageEntityTypes.BotCommand },
    ]);
  });

  it('textEntityTypeTextUrl(+url) — url 필드 부착', () => {
    const out = buildApiMessageEntities([
      {
        _: 'textEntity',
        offset: 10,
        length: 8,
        type: { _: 'textEntityTypeTextUrl', url: 'https://example.com' },
      },
    ]);
    expect(out).toEqual([
      {
        offset: 10, length: 8, type: ApiMessageEntityTypes.TextUrl, url: 'https://example.com',
      },
    ]);
  });

  it('textEntityTypeMentionName(+user_id → userId)', () => {
    const out = buildApiMessageEntities([
      {
        _: 'textEntity',
        offset: 0,
        length: 4,
        type: { _: 'textEntityTypeMentionName', user_id: 12345678 },
      },
    ]);
    expect(out).toEqual([
      {
        offset: 0, length: 4, type: ApiMessageEntityTypes.MentionName, userId: '12345678',
      },
    ]);
  });

  it('textEntityTypePreCode(+language) → Pre + language', () => {
    const out = buildApiMessageEntities([
      {
        _: 'textEntity',
        offset: 0,
        length: 12,
        type: { _: 'textEntityTypePreCode', language: 'ts' },
      },
    ]);
    expect(out).toEqual([
      {
        offset: 0, length: 12, type: ApiMessageEntityTypes.Pre, language: 'ts',
      },
    ]);
  });

  it('textEntityTypeCustomEmoji(+custom_emoji_id → documentId)', () => {
    const out = buildApiMessageEntities([
      {
        _: 'textEntity',
        offset: 0,
        length: 2,
        type: { _: 'textEntityTypeCustomEmoji', custom_emoji_id: '12345' },
      },
    ]);
    expect(out).toEqual([
      {
        offset: 0, length: 2, type: ApiMessageEntityTypes.CustomEmoji, documentId: '12345',
      },
    ]);
  });

  it('Bold / Italic / Code / Url 등 단순 매핑', () => {
    const out = buildApiMessageEntities([
      { _: 'textEntity', offset: 0, length: 4, type: { _: 'textEntityTypeBold' } },
      { _: 'textEntity', offset: 5, length: 3, type: { _: 'textEntityTypeItalic' } },
      { _: 'textEntity', offset: 9, length: 5, type: { _: 'textEntityTypeCode' } },
      { _: 'textEntity', offset: 15, length: 7, type: { _: 'textEntityTypeUrl' } },
    ]);
    expect(out).toEqual([
      { offset: 0, length: 4, type: ApiMessageEntityTypes.Bold },
      { offset: 5, length: 3, type: ApiMessageEntityTypes.Italic },
      { offset: 9, length: 5, type: ApiMessageEntityTypes.Code },
      { offset: 15, length: 7, type: ApiMessageEntityTypes.Url },
    ]);
  });

  it('미지원 타입은 드롭(warn) — Default 에 없는 미래 TDLib 타입 안전 통과', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const out = buildApiMessageEntities([
      { _: 'textEntity', offset: 0, length: 1, type: { _: 'textEntityTypeBankCardNumber' } },
      { _: 'textEntity', offset: 2, length: 4, type: { _: 'textEntityTypeBold' } },
    ]);
    expect(out).toEqual([
      { offset: 2, length: 4, type: ApiMessageEntityTypes.Bold },
    ]);
    expect(warn).toHaveBeenCalledWith(
      '[buildApiMessageEntities] 미지원 entity type:',
      'textEntityTypeBankCardNumber',
    );
    warn.mockRestore();
  });

  it('빈 입력 / 비배열 가드', () => {
    expect(buildApiMessageEntities([])).toEqual([]);
    // @ts-expect-error: 의도적 잘못된 입력
    expect(buildApiMessageEntities(undefined)).toEqual([]);
    // @ts-expect-error: 의도적 잘못된 입력
    expect(buildApiMessageEntities(null)).toEqual([]);
  });
});

describe('buildApiMessage — content.text.entities 부착 (근인 수정 검증)', () => {
  it('/help 메시지: BotCommand entity 가 ApiMessage.content.text.entities 에 박힘', () => {
    const tdlibMessage = {
      id: 5959,
      chat_id: 12345678,
      date: 1717400000,
      is_outgoing: false,
      sender_id: { _: 'messageSenderUser', user_id: 12345 },
      content: {
        _: 'messageText',
        text: {
          _: 'formattedText',
          text: '/help',
          entities: [
            { _: 'textEntity', offset: 0, length: 5, type: { _: 'textEntityTypeBotCommand' } },
          ],
        },
      },
    };
    const msg = buildApiMessage(tdlibMessage);
    expect(msg.content.text).toEqual({
      text: '/help',
      entities: [
        { offset: 0, length: 5, type: ApiMessageEntityTypes.BotCommand },
      ],
    });
  });

  it('entities 없는 일반 텍스트: entities 키 미부착 (v0.32 동작 보존)', () => {
    const msg = buildApiMessage({
      id: 1,
      chat_id: 1,
      date: 0,
      content: { _: 'messageText', text: { _: 'formattedText', text: '안녕' } },
    });
    expect(msg.content.text).toEqual({ text: '안녕' });
    expect((msg.content.text as any).entities).toBeUndefined();
  });
});
