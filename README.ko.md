# telegram-web-relay-client

[![Release](https://img.shields.io/github/v/release/lisyoen/telegram-web-relay-client?style=flat-square)](https://github.com/lisyoen/telegram-web-relay-client/releases)
[![License: GPL-3.0-or-later](https://img.shields.io/badge/license-GPL--3.0--or--later-blue.svg?style=flat-square)](./LICENSE)
[![React](https://img.shields.io/badge/react-client-61dafb?style=flat-square&logo=react&logoColor=111827)](https://react.dev/)

[English](./README.md) | 한국어

[telegram-web-relay](https://github.com/lisyoen/telegram-web-relay)의 브라우저 UI입니다. [Telegram-tt](https://github.com/Ajaxy/telegram-tt) / Telegram Web A 포크이며, 브라우저가 텔레그램에 직접 연결하는 대신 self-hosted relay와 Socket.IO로 통신하도록 수정되었습니다.

![telegram-web-relay 구조](./docs/architecture.svg)

## 동작 구조

```
브라우저 (이 클라이언트, GPL-3.0-or-later)
        |
        | HTTP + Socket.IO
        v
telegram-web-relay (서버, MIT)  --TDLib/MTProto-->  Telegram
```

프로덕션 빌드는 `dist/`에 정적 파일을 생성합니다. relay 서버는 `V2_DIST_PATH`로 이 디렉터리를 서빙합니다.

## 저장소 구성

| 저장소 | 역할 | 라이선스 |
| --- | --- | --- |
| [`telegram-web-relay`](https://github.com/lisyoen/telegram-web-relay) | Node.js TDLib relay 서버와 정적 파일 호스트 | MIT |
| `telegram-web-relay-client` | Telegram-tt 기반 브라우저 UI, Socket.IO relay transport 대응 | GPL-3.0-or-later |

두 프로젝트는 서로 다른 라이선스를 가진 별도 프로세스이며, 네트워크를 통해서만 통신합니다.

## 빠른 시작

### 1. 클라이언트 빌드

```sh
git clone https://github.com/lisyoen/telegram-web-relay-client.git
cd telegram-web-relay-client
cp .env.example .env
npm install
npm run build:production
```

relay가 `http://localhost:9087`이 아닌 주소에서 실행된다면 `.env`를 수정합니다.

```env
TELEGRAM_API_ID=123456
TELEGRAM_API_HASH=your_api_hash
SOCKET_SERVER_URL=http://localhost:9087
BASE_URL=https://web.telegram.org/a/
```

### 2. Relay에서 서빙

```sh
git clone https://github.com/lisyoen/telegram-web-relay.git
cd telegram-web-relay
cp .env.example .env
```

relay의 `V2_DIST_PATH`를 이 프로젝트의 `dist/` 디렉터리로 지정합니다.

```env
V2_DIST_PATH=../telegram-web-relay-client/dist
```

그 다음 relay를 실행합니다.

```sh
npm install
npm start
```

브라우저에서 relay URL을 열고 로그인합니다.

## 환경 변수

| 변수 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `TELEGRAM_API_ID` | 예 | 빈 값 | my.telegram.org에서 발급한 Telegram API ID. Telegram Web 호환성과 빌드타임 검증을 위해 유지합니다. |
| `TELEGRAM_API_HASH` | 예 | 빈 값 | my.telegram.org에서 발급한 Telegram API hash. Telegram Web 호환성과 빌드타임 검증을 위해 유지합니다. |
| `SOCKET_SERVER_URL` | 아니오 | `http://localhost:9087` | 브라우저 번들이 접속할 relay URL. |
| `BASE_URL` | 아니오 | `https://web.telegram.org/a/` | upstream Telegram Web 호환용 base URL 값. |

## 개발

```sh
npm install
npm run dev
```

mock UI 세션:

```sh
npm run dev:mocked
```

프로덕션 정적 파일 빌드:

```sh
npm run build:production
```

## 보안 주의사항

- 이 클라이언트 자체가 Telegram 세션을 보유하지 않습니다. 인증된 TDLib 세션은 relay 서버가 보유합니다.
- 빌드타임 환경 변수는 브라우저 번들에 포함됩니다. `.env`에 관련 없는 secret을 넣지 마십시오.
- 신뢰 네트워크 밖에서 사용하려면 relay를 HTTPS와 접근 제어 뒤에 배포하십시오.

## 라이선스

이 프로젝트는 upstream Telegram-tt로부터 상속된 [GPL-3.0-or-later](./LICENSE)로 배포됩니다.

함께 사용하는 relay 서버 [telegram-web-relay](https://github.com/lisyoen/telegram-web-relay)는 별도 MIT 프로젝트이며 별도 프로세스로 동작합니다.

## 크레딧

이 저작물은 Alexander Zinchuk 및 기여자들의 [Telegram-tt](https://github.com/Ajaxy/telegram-tt) 파생물입니다. Telegram-tt는 [Telegram Lightweight Client Contest](https://contest.com/javascript-web-3)에서 1위를 차지한 공식 Telegram Web A 클라이언트입니다. upstream 저작권 및 라이선스 고지는 `LICENSE`와 소스 트리에 보존되어 있습니다.
