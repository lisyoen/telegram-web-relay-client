/**
 * v0.60: postProcessApiResponse content.action 재매핑 테스트.
 * history/chat-list 응답 경로에서 service message action 이 telegram-tt 타입으로 변환되는지 단언.
 * ASCII-only fixture (surrogate 크래시 회피 #054).
 */
import { postProcessApiResponse } from './init';

describe('postProcessApiResponse — content.action remap (059 follow-up)', () => {
  it('messages[].content.action: messageContactRegistered → contactSignUp', () => {
    const data = {
      messages: [
        { id: 1, chatId: '8839016669', content: { action: { type: 'messageContactRegistered' } } },
      ],
    };
    const out = postProcessApiResponse(data);
    expect(out.messages[0].content.action).toEqual({ mediaType: 'action', type: 'contactSignUp' });
  });

  it('message(single).content.action: messageContactRegistered → contactSignUp', () => {
    const data = {
      message: { id: 2, chatId: '1', content: { action: { type: 'messageContactRegistered' } } },
    };
    const out = postProcessApiResponse(data);
    expect(out.message.content.action).toEqual({ mediaType: 'action', type: 'contactSignUp' });
  });

  it('chats[].last_message.content.action: messageContactRegistered → contactSignUp', () => {
    const data = {
      chatIds: ['8839016669'],
      chats: [
        { id: '8839016669', last_message: { id: 3, chatId: '8839016669', content: { action: { type: 'messageContactRegistered' } } } },
      ],
    };
    const out = postProcessApiResponse(data);
    expect(out.chats[0].last_message.content.action).toEqual({ mediaType: 'action', type: 'contactSignUp' });
  });

  it('chats[].lastMessage.content.action: messageContactRegistered → contactSignUp (camelCase key)', () => {
    const data = {
      chats: [
        { id: '1', lastMessage: { id: 4, chatId: '1', content: { action: { type: 'messageContactRegistered' } } } },
      ],
    };
    const out = postProcessApiResponse(data);
    expect(out.chats[0].lastMessage.content.action).toEqual({ mediaType: 'action', type: 'contactSignUp' });
  });

  it('idempotent: already-mapped action (contactSignUp) is not re-remapped', () => {
    const alreadyMapped = { mediaType: 'action', type: 'contactSignUp' };
    const data = {
      messages: [
        { id: 5, chatId: '1', content: { action: alreadyMapped } },
      ],
    };
    const out = postProcessApiResponse(data);
    expect(out.messages[0].content.action).toEqual(alreadyMapped);
  });

  it('messageChatChangeTitle → chatEditTitle (action with title)', () => {
    const data = {
      messages: [
        { id: 6, chatId: '1', content: { action: { type: 'messageChatChangeTitle', title: 'New Title' } } },
      ],
    };
    const out = postProcessApiResponse(data);
    expect(out.messages[0].content.action).toEqual({ mediaType: 'action', type: 'chatEditTitle', title: 'New Title' });
  });

  it('entity conversion regression: existing entities still converted', () => {
    const data = {
      messages: [
        {
          id: 7,
          chatId: '1',
          content: {
            text: {
              text: 'hello',
              entities: [
                { _: 'textEntity', offset: 0, length: 5, type: { _: 'textEntityTypeBold' } },
              ],
            },
          },
        },
      ],
    };
    const out = postProcessApiResponse(data);
    expect(out.messages[0].content.text.entities[0].type).toBe('MessageEntityBold');
  });

  it('no action field: no-op (no error)', () => {
    const data = {
      messages: [
        { id: 8, chatId: '1', content: { text: { text: 'plain text' } } },
      ],
    };
    expect(() => postProcessApiResponse(data)).not.toThrow();
    const out = postProcessApiResponse(data);
    expect(out.messages[0].content.text.text).toBe('plain text');
  });

  it('unknown raw service type with action: maps to unsupported', () => {
    const data = {
      messages: [
        { id: 9, chatId: '1', content: { action: { type: 'messageGameScore' } } },
      ],
    };
    const out = postProcessApiResponse(data);
    expect(out.messages[0].content.action).toEqual({ mediaType: 'action', type: 'unsupported' });
  });

  it('null/undefined input: safe pass-through', () => {
    expect(postProcessApiResponse(null)).toBeNull();
    expect(postProcessApiResponse(undefined)).toBeUndefined();
  });
});
