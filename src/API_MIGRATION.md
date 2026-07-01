# Telegram-TT API 레이어 교체 전략

## 목표
GramJS(MTProto 직접 통신) → 우리 백엔드(server.js + Socket.io + TDLib)로 교체

---

## 1. 현재 아키텍처 분석

### 1.1 핵심 구조

```
UI Components (React/Teact)
    ↓
Global Actions (src/global/actions/)
    ↓
callApi() → connector.ts
    ↓
Web Worker (worker.ts)
    ↓
GramJS Methods (src/api/gramjs/methods/)
    ↓
MTProto (Telegram 서버와 직접 통신)
```

### 1.2 핵심 파일들

| 파일 | 역할 | 교체 필요도 |
|------|------|-----------|
| `connector.ts` | callApi() 함수, Worker 통신 관리 | ⭐⭐⭐⭐⭐ 필수 |
| `methods/index.ts` | 전체 메서드 목록 export | ⭐⭐⭐⭐ 필수 |
| `methods/types.ts` | 타입 정의 (Methods, MethodArgs, MethodResponse) | ⭐⭐⭐ 수정 필요 |
| `methods/chats.ts` | 채팅 관련 메서드 (fetchChats, fetchFullChat 등) | ⭐⭐⭐⭐⭐ 필수 |
| `methods/messages.ts` | 메시지 관련 메서드 (fetchMessages, sendMessage 등) | ⭐⭐⭐⭐⭐ 필수 |
| `methods/users.ts` | 유저 관련 메서드 | ⭐⭐⭐ 중요 |
| `apiBuilders/` 폴더 | GramJS 타입 → API 타입 변환 | ⭐⭐⭐⭐ 재사용 가능 |
| `gramjsBuilders/` 폴더 | API 타입 → GramJS 타입 변환 | ⭐ 삭제 예정 |

---

## 2. 교체 전략

### 2.1 교체할 파일

#### A. Worker 통신 계층 (최우선)
- `src/api/gramjs/worker/connector.ts` → **완전 재작성**
  - `callApi()` 함수: Worker 대신 Socket.io 통신
  - Promise 기반 요청/응답 처리
  - 멀티탭 지원 유지 (BroadcastChannel)

#### B. 메서드 구현 계층
- `src/api/gramjs/methods/chats.ts` → **재작성**
- `src/api/gramjs/methods/messages.ts` → **재작성**
- `src/api/gramjs/methods/users.ts` → **재작성**
- 기타 methods 폴더 내 파일들 → 점진적 재작성

### 2.2 새로 만들어야 할 파일

```
src/api/socket/
├── connector.ts          # Socket.io 기반 callApi() 구현
├── methods/
│   ├── index.ts         # 메서드 목록 (기존 구조 유지)
│   ├── types.ts         # 타입 정의
│   ├── chats.ts         # 채팅 메서드
│   ├── messages.ts      # 메시지 메서드
│   └── users.ts         # 유저 메서드
└── socketClient.ts      # Socket.io 클라이언트 래퍼
```

### 2.3 재사용할 파일

- `src/api/types/*.ts` → **100% 재사용** (내부 타입 정의)
- `src/api/gramjs/apiBuilders/*.ts` → **부분 재사용** (응답 변환 로직)
  - TDLib 응답 → ApiChat, ApiMessage 등으로 변환
  - buildApiChatFromDialog() 등은 TDLib 구조에 맞게 수정 필요

---

## 3. Phase 1: 기본 채팅 기능 (최소 메서드 목록)

### 3.1 인증 & 초기화
```typescript
// 기존: src/api/gramjs/methods/auth.ts
provideAuthPhoneNumber(phoneNumber: string)
provideAuthCode(code: string)
fetchCurrentUser()
```

### 3.2 채팅 목록
```typescript
// 기존: src/api/gramjs/methods/chats.ts
fetchChats({
  limit: number,
  offsetDate?: number,
  offsetPeer?: ApiPeer,
  offsetId?: number,
  archived?: boolean,
  withPinned?: boolean,
}) → Promise<ChatListData>

fetchFullChat(chat: ApiChat) → Promise<FullChatData>
```

**반환 타입:**
```typescript
type ChatListData = {
  chatIds: string[];           // 채팅 ID 목록
  chats: ApiChat[];            // 채팅 객체 배열
  users: ApiUser[];            // 관련 유저들
  userStatusesById: Record<string, ApiUserStatus>;
  draftsById: Record<string, ApiDraft>;
  orderedPinnedIds: string[];
  totalChatCount: number;
  messages: ApiMessage[];      // 마지막 메시지들
  lastMessageByChatId: Record<string, number>;
}
```

### 3.3 메시지 조회
```typescript
// 기존: src/api/gramjs/methods/messages.ts
fetchMessages({
  chat: ApiChat,
  threadId?: ThreadId,
  offsetId?: number,
  addOffset?: number,
  limit: number,
}) → Promise<{
  messages: ApiMessage[];
  users: ApiUser[];
  chats: ApiChat[];
  count?: number;
}>

fetchMessage({
  chat: ApiChat,
  messageId: number,
}) → Promise<{ message: ApiMessage }>
```

### 3.4 메시지 전송
```typescript
sendMessage({
  chat: ApiChat,
  text?: string,
  entities?: ApiMessageEntity[],
  replyInfo?: ApiInputReplyInfo,
  attachment?: ApiAttachment,
  // ... 기타 파라미터
}) → Promise<ApiMessage>

// 로컬 메시지 생성 (즉시 UI 업데이트용)
sendMessageLocal(params: SendMessageParams) → Promise<ApiMessage>

// 실제 서버 전송
sendApiMessage(params, localMessage, onProgress?) → Promise<void>
```

### 3.5 메시지 상태 관리
```typescript
markMessageListRead({
  chat: ApiChat,
  threadId: ThreadId,
  maxId?: number,
})

deleteMessages({
  chat: ApiChat,
  messageIds: number[],
  shouldDeleteForAll?: boolean,
})
```

### 3.6 타이핑 상태
```typescript
sendMessageAction({
  peer: ApiPeer,
  threadId?: ThreadId,
  action: ApiSendMessageAction,  // 'typing', 'upload_photo' 등
})
```

---

## 4. 구현 우선순위

### Phase 1 (Core - 1주차)
1. **Socket.io 연결 및 callApi() 구현**
   - `src/api/socket/connector.ts`
   - `src/api/socket/socketClient.ts`

2. **인증 메서드**
   - `fetchCurrentUser()`
   - 로그인 상태 확인

3. **채팅 목록**
   - `fetchChats()` - 기본 채팅 목록 불러오기
   - ApiChat 타입 매핑

### Phase 2 (Messages - 2주차)
4. **메시지 조회**
   - `fetchMessages()` - 메시지 히스토리 불러오기
   - `fetchMessage()` - 단일 메시지 조회

5. **메시지 전송**
   - `sendMessage()` - 텍스트 메시지 전송
   - `sendMessageLocal()` - 낙관적 UI 업데이트

6. **메시지 상태**
   - `markMessageListRead()` - 읽음 표시
   - `deleteMessages()` - 메시지 삭제

### Phase 3 (Advanced - 3주차)
7. **실시간 업데이트**
   - Socket.io 이벤트 리스너
   - `onUpdate` 콜백 처리

8. **미디어 첨부**
   - 사진/동영상 전송
   - 파일 업로드

9. **고급 기능**
   - 답장 (reply)
   - 전달 (forward)
   - 편집 (edit)

### Phase 4 (Polish - 4주차)
10. **에러 처리 및 재시도**
11. **멀티탭 동기화**
12. **오프라인 큐**

---

## 5. 핵심 변경 사항

### 5.1 connector.ts 변경

#### 기존 (GramJS + Worker)
```typescript
export function callApi<T extends keyof Methods>(
  fnName: T,
  ...args: MethodArgs<T>
): EnsurePromise<MethodResponse<T>> {
  // Worker로 메시지 전송
  const promise = makeRequest({
    type: 'callMethod',
    name: fnName,
    args,
  });
  return promise;
}
```

#### 신규 (Socket.io)
```typescript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

export function callApi<T extends keyof Methods>(
  fnName: T,
  ...args: MethodArgs<T>
): EnsurePromise<MethodResponse<T>> {
  return new Promise((resolve, reject) => {
    const requestId = generateUniqueId();

    // Socket.io로 요청
    socket.emit('api:request', {
      id: requestId,
      method: fnName,
      params: args[0], // 첫 번째 인자는 항상 params 객체
    });

    // 응답 대기
    const timeout = setTimeout(() => {
      socket.off(`api:response:${requestId}`);
      reject(new Error('Request timeout'));
    }, 30000);

    socket.once(`api:response:${requestId}`, (response) => {
      clearTimeout(timeout);
      if (response.error) {
        reject(response.error);
      } else {
        resolve(response.data);
      }
    });
  });
}
```

### 5.2 fetchChats() 변경

#### 기존 (GramJS)
```typescript
export async function fetchChats({ limit, offsetDate, ... }) {
  // GramJS API 호출
  const result = await invokeRequest(new GramJs.messages.GetDialogs({
    hash: DEFAULT_PRIMITIVES.BIGINT,
    offsetPeer: peer,
    offsetId: offsetId ?? DEFAULT_PRIMITIVES.INT,
    limit,
    // ...
  }));

  // GramJS 타입 → API 타입 변환
  const chats = dialogs.map((dialog) => {
    const peerEntity = peersByKey[getPeerKey(dialog.peer)];
    return buildApiChatFromDialog(dialog, peerEntity);
  });

  return { chatIds, chats, users, ... };
}
```

#### 신규 (Socket.io + TDLib)
```typescript
export async function fetchChats({ limit, offsetDate, ... }) {
  // Socket.io로 요청 (서버가 TDLib 호출)
  const result = await callSocketApi('getChats', {
    limit,
    offsetOrder: offsetDate,
    // TDLib 파라미터 형식
  });

  // TDLib 타입 → API 타입 변환
  const chats = result.chat_ids.map((chatId) => {
    const tdChat = result.chats[chatId];
    return buildApiChatFromTdLib(tdChat);  // 새 변환 함수
  });

  return { chatIds, chats, users, ... };
}
```

### 5.3 실시간 업데이트 처리

#### 기존 (Worker)
```typescript
worker?.addEventListener('message', ({ data }: WorkerMessageEvent) => {
  data?.payloads.forEach((payload) => {
    if (payload.type === 'updates') {
      payload.updates.forEach(onUpdate);
    }
  });
});
```

#### 신규 (Socket.io)
```typescript
socket.on('telegram:update', (update) => {
  // TDLib 업데이트 → API 업데이트 변환
  const apiUpdate = buildApiUpdateFromTdLib(update);

  // 기존 onUpdate 콜백 호출
  onUpdate(apiUpdate);
});
```

---

## 6. 데이터 타입 매핑

### 6.1 TDLib → API 타입 변환 예시

```typescript
// TDLib Chat → ApiChat
function buildApiChatFromTdLib(tdChat: TdApi.Chat): ApiChat {
  return {
    id: tdChat.id.toString(),
    type: mapChatType(tdChat.type),
    title: tdChat.title,
    lastReadOutboxMessageId: tdChat.last_read_outbox_message_id,
    lastReadInboxMessageId: tdChat.last_read_inbox_message_id,
    unreadCount: tdChat.unread_count,
    // ... 기타 필드 매핑
  };
}

// TDLib Message → ApiMessage
function buildApiMessageFromTdLib(tdMsg: TdApi.Message): ApiMessage {
  return {
    id: tdMsg.id,
    chatId: tdMsg.chat_id.toString(),
    date: tdMsg.date,
    senderId: tdMsg.sender_id.user_id?.toString(),
    content: buildMessageContent(tdMsg.content),
    // ... 기타 필드 매핑
  };
}
```

---

## 7. 마이그레이션 체크리스트

### 개발 준비
- [ ] server.js Socket.io 엔드포인트 정의
- [ ] TDLib 응답 형식 문서화
- [ ] Socket.io 클라이언트 래퍼 작성

### Phase 1
- [ ] `src/api/socket/connector.ts` 작성
- [ ] `callApi()` 기본 구조 구현
- [ ] `fetchCurrentUser()` 동작 확인
- [ ] `fetchChats()` 구현 및 테스트

### Phase 2
- [ ] `fetchMessages()` 구현
- [ ] `sendMessage()` 구현
- [ ] 낙관적 UI 업데이트 동작 확인
- [ ] `markMessageListRead()` 구현

### Phase 3
- [ ] Socket.io 이벤트 리스너 등록
- [ ] 실시간 메시지 수신 테스트
- [ ] 미디어 전송 구현

### Phase 4
- [ ] 에러 처리 및 재시도 로직
- [ ] 멀티탭 동기화
- [ ] 성능 최적화

---

## 8. 리스크 및 고려사항

### 8.1 호환성
- **API 타입 100% 유지**: 기존 UI 코드는 수정하지 않음
- **점진적 마이그레이션**: 메서드별로 하나씩 교체 가능

### 8.2 성능
- Worker 제거로 메인 스레드 부담 증가 가능
  → Socket.io 이벤트는 비동기 처리로 완화
- 네트워크 레이턴시 증가 (localhost 제외)
  → 낙관적 UI 업데이트로 체감 속도 유지

### 8.3 보안
- localhost:3000 통신: CORS 설정 필요
- 인증 토큰 관리: Socket.io handshake에 포함

### 8.4 디버깅
- Chrome DevTools에서 Socket.io 패킷 확인 가능
- Redux DevTools로 API 호출 추적

---

## 9. 예상 일정

| Phase | 기간 | 목표 |
|-------|------|------|
| Phase 1 | 1주 | 채팅 목록 표시 |
| Phase 2 | 1주 | 메시지 읽기/쓰기 |
| Phase 3 | 1주 | 실시간 업데이트 |
| Phase 4 | 1주 | 안정화 및 최적화 |
| **Total** | **4주** | **MVP 완성** |

---

## 10. 참고 자료

- 현재 GramJS API 호출 구조: `src/api/gramjs/worker/connector.ts:205-249`
- 채팅 목록 조회 예시: `src/api/gramjs/methods/chats.ts:114-255`
- 메시지 전송 예시: `src/api/gramjs/methods/messages.ts:543-549`
- API 타입 정의: `src/api/types/*.ts`
- API 업데이트 처리: `src/global/actions/apiUpdaters/*.ts`

---

## 마무리

이 전략은 **최소한의 변경으로 최대한의 호환성**을 유지하면서 GramJS를 우리 백엔드로 교체하는 것을 목표로 합니다.

**핵심 원칙:**
1. **기존 타입 유지**: `src/api/types/*.ts` 는 전혀 수정하지 않음
2. **점진적 교체**: 메서드 하나씩 교체하며 테스트
3. **낙관적 UI**: `sendMessageLocal()` 같은 패턴 유지
4. **실시간 동기화**: Socket.io 이벤트로 업데이트 처리

이 문서를 기반으로 `src/api/socket/` 폴더부터 시작하면 됩니다.
