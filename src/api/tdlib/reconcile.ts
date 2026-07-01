export interface ReconcileInput {
  cachedIds: number[];
  serverIds: number[];
  lastMessageId: number;
  pendingIds: number[];
}

export interface ReconcileResult {
  toDelete: number[];
  tailRemoved: number;
  midRemoved: number;
}

export function computeReconcileDeletions(input: ReconcileInput): ReconcileResult {
  const { cachedIds, serverIds, lastMessageId, pendingIds } = input;

  if (cachedIds.length === 0 || serverIds.length === 0) {
    return { toDelete: [], tailRemoved: 0, midRemoved: 0 };
  }

  const serverIdSet = new Set(serverIds);
  const pendingIdSet = new Set(pendingIds);
  const minServerId = Math.min(...serverIds);

  let tailRemoved = 0;
  let midRemoved = 0;
  const toDelete: number[] = [];

  for (const id of cachedIds) {
    if (pendingIdSet.has(id)) continue;

    if (id > lastMessageId) {
      toDelete.push(id);
      tailRemoved++;
    } else if (id >= minServerId && !serverIdSet.has(id)) {
      toDelete.push(id);
      midRemoved++;
    }
    // id < minServerId: fetch가 확인하지 못한 구간 — 절대 제거하지 않음
  }

  return { toDelete, tailRemoved, midRemoved };
}
