import { buildApiMessage } from './converters';

describe('buildApiMessage forward_info → forwardInfo (v0.37)', () => {
  it('forward_info 없는 일반 메시지 → forwardInfo 미설정', () => {
    const m = buildApiMessage({
      id: 1, chat_id: 1, date: 1717400000, is_outgoing: false,
      content: { text: { text: '안녕' } },
    });
    expect((m as any).forwardInfo).toBeUndefined();
  });

  it('_forwardFrom: "홍길동" + forward_info.origin 존재 → hiddenUserName=홍길동, isChannelPost=false, date 채워짐', () => {
    const m = buildApiMessage({
      id: 2, chat_id: 12345678, date: 1717400500, is_outgoing: true,
      sender_id: { _: 'messageSenderUser', user_id: 12345678 },
      content: { text: { text: '전달된 메시지' } },
      forward_info: {
        _: 'messageForwardInfo',
        date: 1717400000,
        origin: { _: 'messageOriginUser', sender_user_id: 12345 },
      },
      _forwardFrom: '홍길동',
    });
    const fi = (m as any).forwardInfo;
    expect(fi).toBeDefined();
    expect(fi.hiddenUserName).toBe('홍길동');
    expect(fi.isChannelPost).toBe(false);
    expect(fi.date).toBe(1717400000);
  });

  it('_forwardFrom 없고 origin.sender_name: "익명채널" → hiddenUserName=익명채널', () => {
    const m = buildApiMessage({
      id: 3, chat_id: 12345678, date: 1717400500, is_outgoing: false,
      content: { text: { text: '익명 전달' } },
      forward_info: {
        _: 'messageForwardInfo',
        date: 1717400100,
        origin: { _: 'messageOriginHiddenUser', sender_name: '익명채널' },
      },
    });
    const fi = (m as any).forwardInfo;
    expect(fi).toBeDefined();
    expect(fi.hiddenUserName).toBe('익명채널');
    expect(fi.isChannelPost).toBe(false);
    expect(fi.date).toBe(1717400100);
  });

  it('forward_info 있으나 _forwardFrom/origin.sender_name 둘 다 없음 → hiddenUserName="알 수 없음"', () => {
    const m = buildApiMessage({
      id: 4, chat_id: 12345678, date: 1717400500, is_outgoing: false,
      content: { text: { text: '출처 미상' } },
      forward_info: {
        _: 'messageForwardInfo',
        date: 1717400200,
        origin: { _: 'messageOriginChannel', chat_id: 9999 },
      },
    });
    const fi = (m as any).forwardInfo;
    expect(fi).toBeDefined();
    expect(fi.hiddenUserName).toBe('알 수 없음');
    expect(fi.isChannelPost).toBe(false);
    expect(fi.date).toBe(1717400200);
  });

  it('messageOriginChat: server.js 가 _forwardFrom="역삼파" 채운 경우 → hiddenUserName=역삼파(전달됨 아님)', () => {
    const m = buildApiMessage({
      id: 5, chat_id: 12345678, date: 1717401000, is_outgoing: false,
      content: { text: { text: '그룹 전달 메시지' } },
      forward_info: {
        _: 'messageForwardInfo',
        date: 1717400800,
        origin: { _: 'messageOriginChat', sender_chat_id: -12848580 },
      },
      _forwardFrom: '역삼파',
    });
    const fi = (m as any).forwardInfo;
    expect(fi).toBeDefined();
    expect(fi.hiddenUserName).toBe('역삼파');
    expect(fi.hiddenUserName).not.toBe('전달됨');
    expect(fi.isChannelPost).toBe(false);
    expect(fi.date).toBe(1717400800);
  });
});
