# telegram-web-relay-client

[English](./README.md) | 한국어

**[telegram-web-relay](https://github.com/lisyoen/telegram-web-relay)**의 브라우저 프런트엔드입니다.

[Telegram-tt](https://github.com/Ajaxy/telegram-tt)(Telegram Web A)의 포크로, UI가 텔레그램에 직접 접속하는 대신 [Socket.IO](https://socket.io/)로 self-host 중계 서버와 통신하도록 재작성되었습니다. 중계 서버와 함께 사용하면 텔레그램 API 엔드포인트가 차단된 네트워크에서도 텔레그램 웹 클라이언트를 사용할 수 있습니다.

## 동작 구조

```
브라우저 (이 클라이언트, GPL-3.0-or-later)
        |
        |  Socket.IO
        v
telegram-web-relay (서버, MIT)  -->  TDLib  -->  텔레그램 (MTProto)
```

클라이언트는 정적 자원으로 빌드되어 중계 서버가 서빙합니다(중계 서버가 `V2_DIST_PATH`를 이 프로젝트의 `dist/` 출력 경로로 지정). 모든 텔레그램 트래픽은 중계 호스트에서 종단되므로 브라우저는 항상 사용자 자신의 서버와만 통신합니다. 클라이언트와 중계 서버는 **각각 별도 라이선스를 가진 별도 프로세스**이며 네트워크를 통해 느슨하게(arm's length) 상호 동작합니다.

## 요구 사항

- Node.js `^22.6 || ^24`, npm `^10.8 || ^11`(`package.json`의 `engines`와 `.node-version` 참조).
- [my.telegram.org](https://my.telegram.org)에서 발급한 텔레그램 **API ID**와 **API hash**.

## 설치 및 빌드

1. 환경 파일 복사 후 의존성 설치:
   ```sh
   cp .env.example .env
   npm install
   ```
2. [my.telegram.org](https://my.telegram.org)에서 API ID / API hash를 발급받아 `.env`의 `TELEGRAM_API_ID` / `TELEGRAM_API_HASH`에 기입.

   > 프로덕션 빌드는 webpack `EnvironmentPlugin`을 통해 이 값들을 빌드타임에 주입합니다. `TELEGRAM_API_ID` / `TELEGRAM_API_HASH`가 (`.env` 또는 환경에) 설정되어 있지 않으면 빌드가 실패합니다.
3. 정적 클라이언트 빌드:
   ```sh
   npm run build:production
   ```
   결과물은 `dist/`에 생성됩니다.
4. 중계 서버의 `V2_DIST_PATH`를 이 프로젝트의 `dist/` 경로로 지정하여(예: `../telegram-web-relay-client/dist`) 서빙합니다. [telegram-web-relay](https://github.com/lisyoen/telegram-web-relay) 설치 가이드를 참조하십시오.

중계 서버 없이 UI만 로컬에서 개발하려면 `npm run dev`로 webpack 개발 서버를 실행합니다.

## 라이선스

이 프로젝트는 upstream인 Telegram-tt로부터 상속된 [GPL-3.0-or-later](./LICENSE)로 배포됩니다.

함께 사용하는 중계 서버 [telegram-web-relay](https://github.com/lisyoen/telegram-web-relay)는 MIT 라이선스의 **별도** 프로젝트로 별도 프로세스로 동작하며, 두 구성요소는 네트워크로만 통신합니다.

## 크레딧

이 저작물은 Alexander Zinchuk 및 기여자들의 **[Telegram-tt](https://github.com/Ajaxy/telegram-tt)** 파생물입니다. Telegram-tt는 [Telegram Lightweight Client Contest](https://contest.com/javascript-web-3)에서 1위를 차지한 공식 Telegram Web A 클라이언트입니다. 모든 upstream 저작권 및 라이선스 고지는 `LICENSE`와 소스에 보존되어 있습니다.

Telegram-tt와 이 포크가 사용하는 주요 의존성:

* [GramJS](https://github.com/gram-js/gramjs) (MIT License)
* [pako](https://github.com/nodeca/pako) (MIT License)
* [cryptography](https://github.com/spalt08/cryptography) (Apache License 2.0)
* [emoji-data](https://github.com/iamcal/emoji-data) (MIT License)
* [twemoji-parser](https://github.com/twitter/twemoji-parser) (MIT License)
* [rlottie](https://github.com/Samsung/rlottie) (MIT License)
* [opus-recorder](https://github.com/chris-rudmin/opus-recorder) (Various Licenses)
* [qr-code-styling](https://github.com/kozakdenys/qr-code-styling) (MIT License)
* [mp4box](https://github.com/gpac/mp4box.js) (BSD-3-Clause License)
* [music-metadata-browser](https://github.com/Borewit/music-metadata-browser) (MIT License)
* [lowlight](https://github.com/wooorm/lowlight) (MIT License)
* [idb-keyval](https://github.com/jakearchibald/idb-keyval) (Apache License 2.0)
* StackBlur (Mario Klingemann 작)
* [fasttextweb](https://github.com/karmdesai/fastTextWeb)
* webp-wasm
