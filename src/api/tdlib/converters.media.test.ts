/**
 * v0.53: buildApiMessage 미디어/캡션 매핑 회귀 테스트.
 *
 * 핵심 가설: content.{photo|video|document|voice|audio|sticker|location|contact|pollId} 가
 * 매핑되지 않으면 global/helpers/messages.ts hasMessageText 가 true 를 반환해
 * MessageUnsupported 폴백이 노출된다(증상: "이 메시지는 텔레그램 웹 버전에서는 지원되지 않습니다").
 * 따라서 각 미디어 타입에 대해 해당 content 필드가 truthy 한지 + 캡션이 content.text 로 매핑되는지 검증한다.
 */
import { buildApiMessage } from './converters';

describe('buildApiMessage media + caption mapping (v0.53)', () => {
  it('messagePhoto + caption → content.photo truthy AND content.text.text === caption', () => {
    const msg = buildApiMessage({
      id: 609029718016,
      chat_id: -5284481630,
      date: 1780992005,
      is_outgoing: false,
      sender_id: { _: 'messageSenderUser', user_id: 1 },
      content: {
        _: 'messagePhoto',
        photo: {
          id: 'photo-1',
          sizes: [
            { type: 'm', width: 320, height: 240, photoFileId: 'fid-m' },
            { type: 'x', width: 1280, height: 960, photoFileId: 'fid-x' },
          ],
        },
        caption: {
          _: 'formattedText',
          text: '가츠엔 저녁 메뉴 (6/9 화)',
          entities: [],
        },
      },
    });

    expect(msg.content.photo).toBeDefined();
    expect(msg.content.photo!.blobUrl).toBe('/api/file/fid-x');
    expect(msg.content.text).toEqual({ text: '가츠엔 저녁 메뉴 (6/9 화)' });
  });

  it('messageVideo with caption → content.video.blobUrl + caption', () => {
    const msg = buildApiMessage({
      id: 2, chat_id: 1, date: 0, is_outgoing: false,
      content: {
        _: 'messageVideo',
        video: {
          duration: 12,
          width: 640, height: 480,
          mime_type: 'video/mp4',
          file_name: 'clip.mp4',
          supports_streaming: true,
          video: { id: 100, size: 12345, remote: { id: 'remote-vid-1' } },
        },
        caption: { _: 'formattedText', text: '비디오 캡션', entities: [] },
      },
    });

    expect(msg.content.video).toBeDefined();
    expect(msg.content.video!.mediaType).toBe('video');
    expect(msg.content.video!.duration).toBe(12);
    expect(msg.content.video!.blobUrl).toBe('/api/file/remote-vid-1');
    expect(msg.content.text).toEqual({ text: '비디오 캡션' });
  });

  it('messageAnimation → content.video.isGif === true', () => {
    const msg = buildApiMessage({
      id: 3, chat_id: 1, date: 0, is_outgoing: false,
      content: {
        _: 'messageAnimation',
        animation: {
          duration: 3, width: 200, height: 200, mime_type: 'video/mp4', file_name: 'g.mp4',
          animation: { id: 1, size: 999, remote: { id: 'remote-anim' } },
        },
      },
    });
    expect(msg.content.video).toBeDefined();
    expect(msg.content.video!.isGif).toBe(true);
    expect(msg.content.video!.blobUrl).toBe('/api/file/remote-anim');
  });

  it('messageVideoNote → content.video.isRound === true', () => {
    const msg = buildApiMessage({
      id: 4, chat_id: 1, date: 0, is_outgoing: false,
      content: {
        _: 'messageVideoNote',
        video_note: {
          duration: 5, length: 240,
          video: { id: 2, size: 5000, remote: { id: 'remote-vn' } },
        },
      },
    });
    expect(msg.content.video!.isRound).toBe(true);
    expect(msg.content.video!.width).toBe(240);
  });

  it('messageDocument → content.document truthy', () => {
    const msg = buildApiMessage({
      id: 5, chat_id: 1, date: 0, is_outgoing: false,
      content: {
        _: 'messageDocument',
        document: {
          file_name: 'spec.pdf', mime_type: 'application/pdf',
          document: { id: 7, size: 999, remote: { id: 'remote-doc' } },
        },
        caption: { _: 'formattedText', text: '문서 캡션', entities: [] },
      },
    });
    expect(msg.content.document).toBeDefined();
    expect(msg.content.document!.fileName).toBe('spec.pdf');
    expect(msg.content.document!.mimeType).toBe('application/pdf');
    expect(msg.content.text).toEqual({ text: '문서 캡션' });
  });

  it('messageVoiceNote → content.voice truthy with waveform', () => {
    const msg = buildApiMessage({
      id: 6, chat_id: 1, date: 0, is_outgoing: false,
      content: {
        _: 'messageVoiceNote',
        voice_note: {
          duration: 8,
          waveform: [1, 2, 3, 4, 5],
          voice: { id: 9, size: 4096 },
        },
      },
    });
    expect(msg.content.voice).toBeDefined();
    expect(msg.content.voice!.duration).toBe(8);
    expect(msg.content.voice!.waveform).toEqual([1, 2, 3, 4, 5]);
  });

  it('messageAudio → content.audio truthy with title/performer', () => {
    const msg = buildApiMessage({
      id: 7, chat_id: 1, date: 0, is_outgoing: false,
      content: {
        _: 'messageAudio',
        audio: {
          duration: 200,
          title: '봄날',
          performer: 'BTS',
          file_name: 'song.mp3', mime_type: 'audio/mpeg',
          audio: { id: 11, size: 100000 },
        },
      },
    });
    expect(msg.content.audio).toBeDefined();
    expect(msg.content.audio!.title).toBe('봄날');
    expect(msg.content.audio!.performer).toBe('BTS');
  });

  it('messageSticker → content.sticker truthy (unsupported 회피)', () => {
    const msg = buildApiMessage({
      id: 8, chat_id: 1, date: 0, is_outgoing: false,
      content: {
        _: 'messageSticker',
        sticker: {
          width: 512, height: 512, emoji: '👍',
          format: { _: 'stickerFormatWebp' },
          sticker: { id: 12, size: 2048 },
        },
      },
    });
    expect(msg.content.sticker).toBeDefined();
    expect(msg.content.sticker!.emoji).toBe('👍');
  });

  it('messageLocation → content.location.geo truthy', () => {
    const msg = buildApiMessage({
      id: 9, chat_id: 1, date: 0, is_outgoing: false,
      content: {
        _: 'messageLocation',
        location: { latitude: 37.5, longitude: 127.0 },
      },
    });
    expect(msg.content.location).toBeDefined();
    expect((msg.content.location as any).geo.lat).toBe(37.5);
    expect((msg.content.location as any).geo.long).toBe(127.0);
  });

  it('messageContact → content.contact truthy', () => {
    const msg = buildApiMessage({
      id: 10, chat_id: 1, date: 0, is_outgoing: false,
      content: {
        _: 'messageContact',
        contact: {
          first_name: '준', last_name: '이', phone_number: '+82101234',
          user_id: 99,
        },
      },
    });
    expect(msg.content.contact).toBeDefined();
    expect(msg.content.contact!.firstName).toBe('준');
    expect(msg.content.contact!.userId).toBe('99');
  });

  it('messagePoll → content.pollId truthy (unsupported 회피)', () => {
    const msg = buildApiMessage({
      id: 11, chat_id: 1, date: 0, is_outgoing: false,
      content: {
        _: 'messagePoll',
        poll: { id: 555, question: { text: 'Q?' } },
      },
    });
    expect(msg.content.pollId).toBe('555');
  });

  it('messageText 회귀: content.text.text 유지', () => {
    const msg = buildApiMessage({
      id: 12, chat_id: 1, date: 0, is_outgoing: false,
      content: { _: 'messageText', text: { _: 'formattedText', text: '안녕', entities: [] } },
    });
    expect(msg.content.text).toEqual({ text: '안녕' });
    expect(msg.content.photo).toBeUndefined();
  });

  it('알 수 없는 미디어 타입(messageDice 등): 한국어 fallback 으로 unsupported 회피', () => {
    const msg = buildApiMessage({
      id: 13, chat_id: 1, date: 0, is_outgoing: false,
      content: { _: 'messageDice', value: 5, emoji: '🎲' },
    });
    expect(msg.content.text).toEqual({ text: '[지원되지 않는 메시지 형식]' });
  });
});
