/**
 * v0.54: callApi('fetchMessages') 응답 후처리 회귀 테스트.
 *
 * 진단 결과 박제(20260609-035):
 * - server.js `buildSharedApiMessage` 가 content.text.entities 를
 *   raw TDLib 형태({_:'textEntity', type:{_:'textEntityTypeCode'}}) 그대로 전달.
 * - 클라이언트의 setupUpdates.newMessage 는 buildApiMessage 를 거치지만,
 *   callApi('fetchMessages') 히스토리 응답은 변환 없이 addMessages 로 흘러가
 *   renderTextWithEntities 의 case ApiMessageEntityTypes.Code 분기가 매치되지 않음.
 *
 * 본 테스트는 emitApiRequest 응답 단계에 끼워 넣은 postProcessApiResponse 가
 * raw TDLib entities 를 in-place 로 ApiMessageEntity[] 형태로 변환함을 단언한다.
 */
import { ApiMessageEntityTypes } from '../../types';
import { postProcessApiResponse } from './init';

describe('postProcessApiResponse — fetchMessages 응답 entities 변환', () => {
  it('content.text.entities 가 raw TDLib 형태이면 ApiMessageEntity[] 로 변환', () => {
    const serverResponse = {
      messages: [
        {
          id: 609053835264,
          chatId: '1234567890',
          content: {
            text: {
              text: '응 사이트 접속 자체가 되면 claude.ai, www.claude.ai만 예외 신청',
              entities: [
                { _: 'textEntity', offset: 27, length: 9, type: { _: 'textEntityTypeCode' } },
                { _: 'textEntity', offset: 38, length: 13, type: { _: 'textEntityTypeCode' } },
              ],
            },
          },
        },
      ],
      users: [],
      chats: [],
      totalCount: 1,
    };

    const out = postProcessApiResponse(serverResponse);

    expect(out.messages[0].content.text.entities).toEqual([
      { offset: 27, length: 9, type: ApiMessageEntityTypes.Code },
      { offset: 38, length: 13, type: ApiMessageEntityTypes.Code },
    ]);
  });

  it('entities 가 없는 메시지: 통과(노옵)', () => {
    const serverResponse = {
      messages: [
        { id: 1, chatId: '1', content: { text: { text: '안녕' } } },
      ],
    };

    const out = postProcessApiResponse(serverResponse);
    expect(out.messages[0].content.text).toEqual({ text: '안녕' });
    expect((out.messages[0].content.text as any).entities).toBeUndefined();
  });

  it('이미 변환된 ApiMessageEntity[] 형태이면 재변환 안 함(노옵)', () => {
    const alreadyConverted = [
      { offset: 0, length: 5, type: ApiMessageEntityTypes.Code },
    ];
    const serverResponse = {
      messages: [
        {
          id: 1,
          chatId: '1',
          content: { text: { text: 'hello', entities: alreadyConverted } },
        },
      ],
    };

    const out = postProcessApiResponse(serverResponse);
    // 동일 참조여도 통과 — type 이 string 이면 isRawTdlibEntities 가 false.
    expect(out.messages[0].content.text.entities).toEqual(alreadyConverted);
  });

  it('messages 배열이 없는 응답(fetchChats 등): 변환 안 함', () => {
    const serverResponse = {
      chatIds: ['1'],
      chats: [{ id: '1' }],
      users: [],
    };

    expect(() => postProcessApiResponse(serverResponse)).not.toThrow();
  });

  it('단일 message 응답(fetchMessage 등)도 변환', () => {
    const serverResponse = {
      message: {
        id: 10,
        chatId: '5',
        content: {
          text: {
            text: 'claude.ai',
            entities: [
              { _: 'textEntity', offset: 0, length: 9, type: { _: 'textEntityTypeCode' } },
            ],
          },
        },
      },
    };

    const out = postProcessApiResponse(serverResponse);
    expect(out.message.content.text.entities).toEqual([
      { offset: 0, length: 9, type: ApiMessageEntityTypes.Code },
    ]);
  });

  it('Bold + Code 혼합 entities 도 정상 변환', () => {
    const serverResponse = {
      messages: [
        {
          id: 1,
          chatId: '1',
          content: {
            text: {
              text: 'Bold text 그리고 code',
              entities: [
                { _: 'textEntity', offset: 0, length: 9, type: { _: 'textEntityTypeBold' } },
                { _: 'textEntity', offset: 15, length: 4, type: { _: 'textEntityTypeCode' } },
              ],
            },
          },
        },
      ],
    };

    const out = postProcessApiResponse(serverResponse);
    expect(out.messages[0].content.text.entities).toEqual([
      { offset: 0, length: 9, type: ApiMessageEntityTypes.Bold },
      { offset: 15, length: 4, type: ApiMessageEntityTypes.Code },
    ]);
  });

  it('null / undefined 입력: 안전 통과', () => {
    expect(postProcessApiResponse(null)).toBeNull();
    expect(postProcessApiResponse(undefined)).toBeUndefined();
  });
});
