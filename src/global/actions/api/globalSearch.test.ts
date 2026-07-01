import { callApi } from '../../../api/gramjs';
import { callApiOptional, fetchGlobalChatSearchResults } from './globalSearch';

jest.mock('../../../api/gramjs', () => ({
  callApi: jest.fn(),
}));

const mockedCallApi = callApi as jest.MockedFunction<typeof callApi>;

describe('global search API guards', () => {
  beforeEach(() => {
    mockedCallApi.mockReset();
  });

  it('turns unported auxiliary API failures into undefined', async () => {
    mockedCallApi.mockRejectedValueOnce(new Error('METHOD_NOT_FOUND'));

    await expect(callApiOptional('fetchSponsoredPeer', { query: 'Telegram' })).resolves.toBeUndefined();
  });

  it('keeps searchChats result when sponsored peer lookup rejects', async () => {
    const searchResult = {
      accountResultIds: ['chat-1'],
      globalResultIds: ['chat-2'],
      chats: [{ id: 'chat-1', title: 'Telegram' }],
    };

    mockedCallApi
      .mockResolvedValueOnce(searchResult)
      .mockRejectedValueOnce(new Error('METHOD_NOT_FOUND'));

    await expect(fetchGlobalChatSearchResults('Telegram')).resolves.toEqual([searchResult, undefined]);
    expect(mockedCallApi).toHaveBeenNthCalledWith(1, 'searchChats', { query: 'Telegram' });
    expect(mockedCallApi).toHaveBeenNthCalledWith(2, 'fetchSponsoredPeer', { query: 'Telegram' });
  });
});
