# telegram-web-relay-client v0.1.0 Release Notes

한국어는 아래에 있습니다.

## English

`telegram-web-relay-client` is the browser UI for `telegram-web-relay`. It is based on Telegram-tt and connects to a self-hosted relay server over Socket.IO instead of talking to Telegram endpoints directly from the browser.

### Highlights

- Browser UI adapted for `telegram-web-relay`.
- Socket.IO relay integration through `SOCKET_SERVER_URL`.
- Production build flow documented with `TELEGRAM_API_ID` and `TELEGRAM_API_HASH`.
- English and Korean README files.
- Companion documentation that explains how this client fits with the relay server.

### Companion Server

Use this client with `telegram-web-relay`:

https://github.com/lisyoen/telegram-web-relay

### Upgrade Notes

This is the first public release. Treat it as an early self-hosted client release and use it with a relay server you control.

## 한국어

`telegram-web-relay-client`는 `telegram-web-relay`와 함께 사용하는 브라우저 UI입니다. Telegram-tt를 기반으로 하며, 브라우저가 Telegram 엔드포인트에 직접 붙는 대신 Socket.IO로 self-hosted relay 서버에 연결합니다.

### 주요 내용

- `telegram-web-relay`에 맞춘 브라우저 UI.
- `SOCKET_SERVER_URL`을 통한 Socket.IO relay 연동.
- `TELEGRAM_API_ID`, `TELEGRAM_API_HASH` 기반 production build 흐름 문서화.
- 영어/한국어 README 제공.
- relay server와 client의 관계를 설명하는 companion 문서.

### companion 서버

이 클라이언트는 `telegram-web-relay`와 함께 사용합니다.

https://github.com/lisyoen/telegram-web-relay

### 업그레이드 노트

첫 공개 릴리스입니다. 초기 self-hosted client 릴리스로 보고, 사용자가 직접 관리하는 relay 서버와 함께 사용하십시오.
