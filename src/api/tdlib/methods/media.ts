/**
 * v0.17 (v2): 아바타·미디어 photo 흐름
 *
 * mediaLoader 의 callApi('downloadMedia', { url, mediaFormat }) 호출은
 * init.ts 의 callApi() 가 socket.emit('api:request', { method: 'downloadMedia', ... }) 로
 * 라우팅하므로, server.js 의 case 'downloadMedia' 가 avatar/profile URL 패턴을
 * 직접 처리한다 (server.js A-3 의 avatar 분기). 본 파일의 downloadMedia 함수는
 * methods/index.ts 의 stub 자리를 차지하기 위한 형식적 export — 실제 호출 시에는
 * callApi 가 우회하므로 동작하지 않으나, 직접 호출(우회 경로)에서는 loadProfilePhoto
 * socket 채널을 사용해 base64 ack 를 Blob 으로 변환해 반환한다.
 */
import type { ApiMediaFormat } from '../../types';
import { getSocket } from '../socket';

type DownloadMediaArgs = {
  url: string;
  mediaFormat: ApiMediaFormat;
  isHtmlAllowed?: boolean;
};

type LoadProfilePhotoAck = {
  ok: boolean;
  base64?: string;
  mimeType?: string;
  error?: string;
};

function parseMediaUrl(url: string):
  | { entityType: 'avatar' | 'profile'; entityId: string; avatarPhotoId: string }
  | undefined {
  // `avatar{owner.id}?{avatarPhotoId}` / `profile{owner.id}?{avatarPhotoId}`
  const m = url.match(/^(avatar|profile)([^?]+)\?(.+)$/);
  if (!m) return undefined;
  return { entityType: m[1] as 'avatar' | 'profile', entityId: m[2], avatarPhotoId: m[3] };
}

export async function downloadMedia(
  { url }: DownloadMediaArgs,
): Promise<{ dataBlob: Blob; mimeType?: string } | undefined> {
  const parsed = parseMediaUrl(url);
  if (!parsed) return undefined;

  const socket = getSocket();
  return new Promise((resolve) => {
    socket.emit(
      'loadProfilePhoto',
      { avatarPhotoId: parsed.avatarPhotoId, sizeType: 'small' },
      (resp: LoadProfilePhotoAck) => {
        if (!resp?.ok || !resp.base64) {
          resolve(undefined);
          return;
        }
        const binary = Uint8Array.from(atob(resp.base64), (c) => c.charCodeAt(0));
        const blob = new Blob([binary], { type: resp.mimeType || 'image/jpeg' });
        resolve({ dataBlob: blob, mimeType: resp.mimeType });
      },
    );
  });
}
