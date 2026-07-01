/**
 * fetchFullChat 그룹 분기 케이싱 회귀 잠금 테스트 (20260625-043)
 *
 * 수정 전(chatTypeSupergroup, 소문자 g)에는 케이스 1이 실패하고,
 * 수정 후(chatTypeSuperGroup, 대문자 G)에는 통과해야 한다.
 */
import { fetchFullChat } from './chats';

jest.mock('./init', () => ({
  callApi: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { callApi } = require('./init') as { callApi: jest.Mock };

beforeEach(() => {
  callApi.mockReset();
});

describe('fetchFullChat — 그룹 분기 chatType 케이싱', () => {
  it('[케이스1] chatTypeSuperGroup → getBotCommands({chatId}) 호출 + botCommands 적재', async () => {
    callApi.mockResolvedValue({
      commands: [{ command: 'start', description: 'x', botId: '8873326297' }],
      group: true,
    });

    const result = await fetchFullChat({ id: '-100111111111', type: 'chatTypeSuperGroup' } as any);

    expect(callApi).toHaveBeenCalledWith('getBotCommands', { chatId: '-100111111111' });
    expect(result?.fullInfo?.botCommands).toEqual([
      { botId: '8873326297', command: 'start', description: 'x' },
    ]);
  });

  it('[케이스2] chatTypeBasicGroup → getBotCommands({chatId}) 호출 (회귀)', async () => {
    callApi.mockResolvedValue({
      commands: [{ command: 'help', description: 'help me', botId: '111222333' }],
      group: true,
    });

    const result = await fetchFullChat({ id: '-100222222222', type: 'chatTypeBasicGroup' } as any);

    expect(callApi).toHaveBeenCalledWith('getBotCommands', { chatId: '-100222222222' });
    expect(result?.fullInfo?.botCommands).toEqual([
      { botId: '111222333', command: 'help', description: 'help me' },
    ]);
  });

  it('[케이스3] chatTypePrivate → getBotCommands({userId}) 호출 + botCommands 적재 (DM 회귀)', async () => {
    callApi.mockResolvedValue({
      commands: [{ command: 'start', description: 'Start the bot' }],
    });

    const result = await fetchFullChat({ id: '8873326297', type: 'chatTypePrivate' } as any);

    expect(callApi).toHaveBeenCalledWith('getBotCommands', { userId: '8873326297' });
    expect(result?.fullInfo?.botCommands).toBeDefined();
    expect(result?.fullInfo?.botCommands?.length).toBeGreaterThan(0);
  });

  it('[케이스4] 봇 없는 슈퍼그룹 (commands: []) → undefined 반환 (graceful)', async () => {
    callApi.mockResolvedValue({ commands: [], group: true });

    const result = await fetchFullChat({ id: '-100111111111', type: 'chatTypeSuperGroup' } as any);

    expect(result).toBeUndefined();
  });
});
