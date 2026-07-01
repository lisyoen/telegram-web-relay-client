import { getMessageContentIds } from './messageMedia';

const photoMsg = (id: number) => ({ id, content: { photo: {} } } as any);

describe('getMessageContentIds ordering', () => {
  test('입력 id 순서를 보존(과거→최신 유지)', () => {
    const messages = { 10: photoMsg(10), 20: photoMsg(20), 30: photoMsg(30) };
    expect(getMessageContentIds(messages as any, [10, 20, 30], 'media')).toEqual([10, 20, 30]);
  });

  test('비미디어는 제외하되 순서 유지', () => {
    const messages = {
      10: photoMsg(10),
      20: { id: 20, content: { text: { text: 'x' } } },
      30: photoMsg(30),
    };
    expect(getMessageContentIds(messages as any, [10, 20, 30], 'media')).toEqual([10, 30]);
  });
});
