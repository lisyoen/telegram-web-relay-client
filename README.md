# telegram-web-relay-client

English | [한국어](./README.ko.md)

The browser front-end for **[telegram-web-relay](https://github.com/lisyoen/telegram-web-relay)**.

This is a fork of [Telegram-tt](https://github.com/Ajaxy/telegram-tt) (Telegram Web A) rewritten so that the UI talks to a self-hosted relay over [Socket.IO](https://socket.io/) instead of connecting to Telegram directly. Use it together with the relay to run a Telegram web client from networks where the public Telegram API endpoints are blocked.

## How it fits together

```
Browser (this client, GPL-3.0-or-later)
        |
        |  Socket.IO
        v
telegram-web-relay (server, MIT)  -->  TDLib  -->  Telegram (MTProto)
```

The client is built to static assets and served by the relay (the relay points `V2_DIST_PATH` at this project's `dist/` output). All Telegram traffic terminates on the relay host, so the browser only ever speaks to your own server. The client and the relay are **separate processes under separate licenses** and interoperate over the network at arm's length.

## Requirements

- Node.js `^22.6 || ^24` and npm `^10.8 || ^11` (see `package.json` `engines` and `.node-version`).
- A Telegram **API ID** and **API hash** from [my.telegram.org](https://my.telegram.org).

## Setup and build

1. Copy the environment file and install dependencies:
   ```sh
   cp .env.example .env
   npm install
   ```
2. Obtain an API ID / API hash from [my.telegram.org](https://my.telegram.org) and fill `TELEGRAM_API_ID` / `TELEGRAM_API_HASH` in `.env`.

   > The production build embeds these at build time via webpack's `EnvironmentPlugin`. If `TELEGRAM_API_ID` / `TELEGRAM_API_HASH` are not set (in `.env` or the environment) the build fails.
3. Build the static client:
   ```sh
   npm run build:production
   ```
   The output is written to `dist/`.
4. Serve `dist/` from the relay by setting `V2_DIST_PATH` to this project's `dist/` directory (for example `../telegram-web-relay-client/dist`). See the [telegram-web-relay](https://github.com/lisyoen/telegram-web-relay) setup guide.

For local UI development without the relay, `npm run dev` starts a webpack dev server.

## License

This project is licensed under [GPL-3.0-or-later](./LICENSE), inherited from its upstream, Telegram-tt.

The companion relay server, [telegram-web-relay](https://github.com/lisyoen/telegram-web-relay), is a **separate** project under the MIT license and runs as a separate process; the two communicate over the network only.

## Credits

This work is a derivative of **[Telegram-tt](https://github.com/Ajaxy/telegram-tt)** by Alexander Zinchuk and contributors, which won first prize at the [Telegram Lightweight Client Contest](https://contest.com/javascript-web-3) and is the official Telegram Web A client. All upstream copyright and license notices are retained in `LICENSE` and in the source.

Telegram-tt and this fork build on, among others:

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
* StackBlur by Mario Klingemann
* [fasttextweb](https://github.com/karmdesai/fastTextWeb)
* webp-wasm
