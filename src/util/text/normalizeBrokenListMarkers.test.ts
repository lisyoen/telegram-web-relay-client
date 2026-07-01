import { ApiMessageEntityTypes } from '../../api/types';
import { normalizeBrokenListMarkers } from './normalizeBrokenListMarkers';

describe('normalizeBrokenListMarkers', () => {
  describe('case1: 불릿 + code 엔티티 6개', () => {
    const RAW_TEXT = 'Done.\n\nAdded 4 entries to the notes doc, and logged them in the worklog at 13:03.\n\n• \n\nItem-Task1: -100111111111\n• \n\nItem-Task2: -100222222222\n• \n\nItem-Task3: -100333333333\n• \n\nItem-Task4: -100444444444';

    // Compute offsets by finding the substrings — self-consistent regardless of exact byte count
    const OFFSETS: [string, number][] = [
      ['notes doc', 9],
      ['worklog at 13:03', 16],
      ['Item-Task1:', 11],
      ['Item-Task2:', 11],
      ['Item-Task3:', 11],
      ['Item-Task4:', 11],
    ];

    const RAW_ENTITIES = OFFSETS.map(([substr, length]) => ({
      type: ApiMessageEntityTypes.Code,
      offset: RAW_TEXT.indexOf(substr),
      length,
    }));

    it('각 entity가 올바른 substring을 가리키는지 사전 검증', () => {
      for (const [substr, length] of OFFSETS) {
        const idx = RAW_TEXT.indexOf(substr);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(RAW_TEXT.substring(idx, idx + length)).toBe(substr);
      }
    });

    it('불릿이 내용과 한 줄로 합쳐진다', () => {
      const out = normalizeBrokenListMarkers(RAW_TEXT, RAW_ENTITIES);
      expect(out.text).not.toMatch(/[•‣◦▪·]\s*\n/);
      expect(out.text).toContain('• Item-Task1: -100111111111');
      expect(out.text).toContain('• Item-Task2: -100222222222');
      expect(out.text).toContain('• Item-Task3: -100333333333');
      expect(out.text).toContain('• Item-Task4: -100444444444');
    });

    it('엔티티 정렬 불변식: 변환 후에도 같은 토큰을 가리킨다', () => {
      const out = normalizeBrokenListMarkers(RAW_TEXT, RAW_ENTITIES);
      expect(out.entities).toHaveLength(RAW_ENTITIES.length);

      for (let i = 0; i < RAW_ENTITIES.length; i++) {
        const origEntity = RAW_ENTITIES[i];
        const newEntity = out.entities![i];
        const origToken = RAW_TEXT.substring(origEntity.offset, origEntity.offset + origEntity.length);
        const newToken = out.text.substring(newEntity.offset, newEntity.offset + newEntity.length);
        expect(newToken).toBe(origToken);
      }
    });

    it('헤더 영역(불릿 앞) entity는 offset/length 불변', () => {
      const out = normalizeBrokenListMarkers(RAW_TEXT, RAW_ENTITIES);
      // notes doc 와 worklog... 는 불릿 앞 → 변환 무관
      expect(out.entities![0].offset).toBe(RAW_ENTITIES[0].offset);
      expect(out.entities![0].length).toBe(RAW_ENTITIES[0].length);
      expect(out.entities![1].offset).toBe(RAW_ENTITIES[1].offset);
      expect(out.entities![1].length).toBe(RAW_ENTITIES[1].length);
    });
  });

  describe('case2: 숫자 리스트 정규화', () => {
    it('번호 뒤 빈 줄이 제거되어 내용이 붙는다', () => {
      const input = '이렇게 잡을께:\n\n1. \n\ntask-a 정상화 확인\n2. \n\ntask-b 작업 결과 수신 여부 확인';
      const expected = '이렇게 잡을께:\n\n1. task-a 정상화 확인\n2. task-b 작업 결과 수신 여부 확인';
      const out = normalizeBrokenListMarkers(input);
      expect(out.text).toBe(expected);
    });
  });

  describe('case3: 네거티브 — 입력 무변경', () => {
    it('이미 인라인인 불릿은 변경 없음', () => {
      const input = '• 항목A\n• 항목B';
      const out = normalizeBrokenListMarkers(input);
      expect(out.text).toBe(input);
    });

    it('일반 문단 (마커 없음)은 변경 없음', () => {
      const input = '문단1\n\n문단2';
      const out = normalizeBrokenListMarkers(input);
      expect(out.text).toBe(input);
    });

    it('수평선 "---" 단독 줄은 변경 없음 (단일 - 만 마커)', () => {
      const input = '---\n\n다음 줄';
      const out = normalizeBrokenListMarkers(input);
      expect(out.text).toBe(input);
    });

    it('엔티티 동반 일반 텍스트는 text/entities 동등', () => {
      const input = '안녕 세계\n두 번째 줄';
      const entities = [{ type: ApiMessageEntityTypes.Bold, offset: 3, length: 2 }];
      const out = normalizeBrokenListMarkers(input, entities);
      expect(out.text).toBe(input);
      expect(out.entities).toEqual(entities);
    });

    it('\\n 없는 텍스트는 즉시 반환 (핫패스)', () => {
      const input = '한 줄 텍스트';
      const entities = [{ type: ApiMessageEntityTypes.Code, offset: 0, length: 3 }];
      const out = normalizeBrokenListMarkers(input, entities);
      expect(out.text).toBe(input);
      expect(out.entities).toBe(entities); // 동일 참조 (복제 없음)
    });
  });
});
