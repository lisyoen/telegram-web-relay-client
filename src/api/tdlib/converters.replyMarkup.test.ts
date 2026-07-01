import { buildApiMessage } from './converters';

describe('buildApiMessage reply_markup → inlineButtons (Phase1)', () => {
  it('replyMarkupInlineKeyboard 3x2 callback grid (BotFather /mybots 형태)', () => {
    const tdlibMessage = {
      id: 12345,
      chat_id: 93372553,
      date: 1717400000,
      is_outgoing: false,
      sender_id: { _: 'messageSenderUser', user_id: 93372553 },
      content: { _: 'messageText', text: { _: 'formattedText', text: '봇 선택' } },
      reply_markup: {
        _: 'replyMarkupInlineKeyboard',
        rows: [
          [
            { _: 'inlineKeyboardButton', text: '@bot1', type: { _: 'inlineKeyboardButtonTypeCallback', data: 'YmIxOg==' } },
            { _: 'inlineKeyboardButton', text: '@bot2', type: { _: 'inlineKeyboardButtonTypeCallback', data: 'YmIyOg==' } },
          ],
          [
            { _: 'inlineKeyboardButton', text: '@bot3', type: { _: 'inlineKeyboardButtonTypeCallback', data: 'YmIzOg==' } },
            { _: 'inlineKeyboardButton', text: '@bot4', type: { _: 'inlineKeyboardButtonTypeCallback', data: 'YmI0Og==' } },
          ],
          [
            { _: 'inlineKeyboardButton', text: '@bot5', type: { _: 'inlineKeyboardButtonTypeCallback', data: 'YmI1Og==' } },
            { _: 'inlineKeyboardButton', text: '취소', type: { _: 'inlineKeyboardButtonTypeCallback', data: 'Y2FuY2Vs' } },
          ],
        ],
      },
    };

    const msg = buildApiMessage(tdlibMessage);
    expect(msg.inlineButtons).toBeDefined();
    expect(msg.inlineButtons!.length).toBe(3);
    expect(msg.inlineButtons![0].length).toBe(2);
    expect(msg.inlineButtons![0][0]).toEqual({ type: 'callback', text: '@bot1', data: 'YmIxOg==' });
    expect(msg.inlineButtons![2][1]).toEqual({ type: 'callback', text: '취소', data: 'Y2FuY2Vs' });
  });

  it('inlineKeyboardButtonTypeUrl → url 매핑', () => {
    const m = buildApiMessage({
      id: 1, chat_id: 1, date: 0, is_outgoing: false,
      content: { text: { text: 'x' } },
      reply_markup: {
        _: 'replyMarkupInlineKeyboard',
        rows: [[{ text: 'Open', type: { _: 'inlineKeyboardButtonTypeUrl', url: 'https://t.me/x' } }]],
      },
    });
    expect(m.inlineButtons![0][0]).toEqual({ type: 'url', text: 'Open', url: 'https://t.me/x' });
  });

  it('inlineKeyboardButtonTypeSwitchInline targetChatCurrent → isSamePeer:true', () => {
    const m = buildApiMessage({
      id: 1, chat_id: 1, date: 0, is_outgoing: false,
      content: { text: { text: 'x' } },
      reply_markup: {
        _: 'replyMarkupInlineKeyboard',
        rows: [[{
          text: 'Try', type: { _: 'inlineKeyboardButtonTypeSwitchInline', query: 'q', target_chat: { _: 'targetChatCurrent' } },
        }]],
      },
    });
    expect(m.inlineButtons![0][0]).toEqual({ type: 'switchBotInline', text: 'Try', query: 'q', isSamePeer: true });
  });

  it('알 수 없는 inlineKeyboardButton 타입 → unsupported 폴백, throw 안 함', () => {
    const m = buildApiMessage({
      id: 1, chat_id: 1, date: 0, is_outgoing: false,
      content: { text: { text: 'x' } },
      reply_markup: {
        _: 'replyMarkupInlineKeyboard',
        rows: [[{ text: 'Mystery', type: { _: 'inlineKeyboardButtonTypeWhoKnows' } }]],
      },
    });
    expect(m.inlineButtons![0][0]).toEqual({ type: 'unsupported', text: 'Mystery' });
  });

  it('reply_markup 미존재 시 기존 동작 보존(inlineButtons 미설정)', () => {
    const m = buildApiMessage({
      id: 1, chat_id: 1, date: 0, is_outgoing: false,
      content: { text: { text: 'x' } },
    });
    expect(m.inlineButtons).toBeUndefined();
  });
});
