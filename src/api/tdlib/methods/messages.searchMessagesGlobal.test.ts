import { searchMessagesGlobal } from './messages';

jest.mock('./init', () => ({
  callApi: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { callApi } = require('./init') as { callApi: jest.Mock };

beforeEach(() => {
  callApi.mockReset();
});

describe('searchMessagesGlobal — TDLib relay mapping', () => {
  it('returns the shape consumed by globalSearch.ts', async () => {
    callApi.mockResolvedValue({
      messages: [
        {
          id: 11,
          chatId: '-1001',
          date: 123,
          content: { text: { text: 'hello', entities: [] } },
        },
      ],
      chats: [{ id: '-1001', title: 'Room', type: 'chatTypeSuperGroup' }],
      users: [{ id: '42', firstName: 'Ada' }],
      userStatusesById: {},
      totalCount: 1,
    });

    const result = await searchMessagesGlobal({
      query: 'hello',
      type: 'text',
      limit: 20,
    });

    expect(callApi).toHaveBeenCalledWith('searchMessagesGlobal', {
      query: 'hello',
      offsetRate: undefined,
      offsetPeer: undefined,
      offsetId: undefined,
      limit: 20,
      type: 'text',
      context: undefined,
      minDate: undefined,
      maxDate: undefined,
    });
    expect(result).toEqual({
      messages: [
        {
          id: 11,
          chatId: '-1001',
          date: 123,
          content: { text: { text: 'hello', entities: [] } },
        },
      ],
      chats: [{ id: '-1001', title: 'Room', type: 'chatTypeSuperGroup' }],
      users: [{ id: '42', firstName: 'Ada' }],
      userStatusesById: {},
      totalCount: 1,
      nextOffsetRate: undefined,
      nextOffsetId: undefined,
      nextOffsetPeerId: undefined,
      searchFlood: undefined,
    });
  });
});
