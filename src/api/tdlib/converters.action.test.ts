/**
 * buildApiMessage — TDLib 서비스 content → ApiMessageAction 매핑 테스트.
 * surrogate 크래시 회피(#054): 모든 픽스처는 ASCII-only 문자열만 사용.
 */
import { buildApiMessage } from './converters';

function makeMsg(content: Record<string, unknown>) {
  return buildApiMessage({
    id: 1,
    chat_id: 100,
    date: 0,
    is_outgoing: false,
    sender_id: { _: 'messageSenderUser', user_id: 42 },
    content,
  });
}

describe('buildMessageAction — TDLib service message → ApiMessageAction mapping', () => {
  describe('contactSignUp (messageContactRegistered)', () => {
    it('server path: content.action.type → contactSignUp', () => {
      const msg = makeMsg({ action: { type: 'messageContactRegistered' } });
      expect(msg.content.action).toEqual({ mediaType: 'action', type: 'contactSignUp' });
      expect(msg.content.text).toBeUndefined();
    });

    it('raw path: content._ → contactSignUp', () => {
      const msg = makeMsg({ _: 'messageContactRegistered' });
      expect(msg.content.action?.type).toBe('contactSignUp');
    });
  });

  describe('chatCreate (messageBasicGroupChatCreate)', () => {
    it('maps to chatCreate with title and empty userIds when fields absent', () => {
      const msg = makeMsg({ action: { type: 'messageBasicGroupChatCreate' } });
      expect(msg.content.action).toMatchObject({ mediaType: 'action', type: 'chatCreate', title: '', userIds: [] });
    });

    it('extracts title and member_user_ids from raw path', () => {
      const msg = makeMsg({ _: 'messageBasicGroupChatCreate', title: 'TestGroup', member_user_ids: [1, 2] });
      expect(msg.content.action).toMatchObject({ type: 'chatCreate', title: 'TestGroup', userIds: ['1', '2'] });
    });
  });

  describe('channelCreate (messageSupergroupChatCreate)', () => {
    it('maps to channelCreate', () => {
      const msg = makeMsg({ action: { type: 'messageSupergroupChatCreate' } });
      expect(msg.content.action).toMatchObject({ mediaType: 'action', type: 'channelCreate', title: '' });
    });
  });

  describe('chatEditTitle (messageChatChangeTitle)', () => {
    it('maps to chatEditTitle', () => {
      const msg = makeMsg({ action: { type: 'messageChatChangeTitle' } });
      expect(msg.content.action).toMatchObject({ mediaType: 'action', type: 'chatEditTitle', title: '' });
    });
  });

  describe('chatEditPhoto (messageChatChangePhoto)', () => {
    it('maps to chatEditPhoto', () => {
      const msg = makeMsg({ action: { type: 'messageChatChangePhoto' } });
      expect(msg.content.action).toMatchObject({ mediaType: 'action', type: 'chatEditPhoto' });
    });
  });

  describe('chatDeletePhoto (messageChatDeletePhoto)', () => {
    it('maps to chatDeletePhoto', () => {
      const msg = makeMsg({ action: { type: 'messageChatDeletePhoto' } });
      expect(msg.content.action).toMatchObject({ mediaType: 'action', type: 'chatDeletePhoto' });
    });
  });

  describe('chatAddUser (messageChatAddMembers)', () => {
    it('maps to chatAddUser with empty userIds when absent', () => {
      const msg = makeMsg({ action: { type: 'messageChatAddMembers' } });
      expect(msg.content.action).toMatchObject({ mediaType: 'action', type: 'chatAddUser', userIds: [] });
    });
  });

  describe('chatDeleteUser (messageChatDeleteMember)', () => {
    it('maps to chatDeleteUser with empty userId when absent', () => {
      const msg = makeMsg({ action: { type: 'messageChatDeleteMember' } });
      expect(msg.content.action).toMatchObject({ mediaType: 'action', type: 'chatDeleteUser', userId: '' });
    });

    it('extracts user_id from raw path', () => {
      const msg = makeMsg({ _: 'messageChatDeleteMember', user_id: 99 });
      expect(msg.content.action).toMatchObject({ type: 'chatDeleteUser', userId: '99' });
    });
  });

  describe('chatJoinedByLink (messageChatJoinByLink)', () => {
    it('maps to chatJoinedByLink', () => {
      const msg = makeMsg({ action: { type: 'messageChatJoinByLink' } });
      expect(msg.content.action).toMatchObject({ mediaType: 'action', type: 'chatJoinedByLink', inviterId: '' });
    });
  });

  describe('chatJoinedByRequest (messageChatJoinByRequest)', () => {
    it('maps to chatJoinedByRequest', () => {
      const msg = makeMsg({ action: { type: 'messageChatJoinByRequest' } });
      expect(msg.content.action).toMatchObject({ mediaType: 'action', type: 'chatJoinedByRequest' });
    });
  });

  describe('pinMessage (messagePinMessage)', () => {
    it('maps to pinMessage', () => {
      const msg = makeMsg({ action: { type: 'messagePinMessage' } });
      expect(msg.content.action).toMatchObject({ mediaType: 'action', type: 'pinMessage' });
    });
  });

  describe('chatMigrateTo (messageChatUpgradeTo)', () => {
    it('maps to chatMigrateTo', () => {
      const msg = makeMsg({ action: { type: 'messageChatUpgradeTo' } });
      expect(msg.content.action).toMatchObject({ mediaType: 'action', type: 'chatMigrateTo', channelId: '' });
    });
  });

  describe('channelMigrateFrom (messageChatUpgradeFrom)', () => {
    it('maps to channelMigrateFrom', () => {
      const msg = makeMsg({ action: { type: 'messageChatUpgradeFrom' } });
      expect(msg.content.action).toMatchObject({ mediaType: 'action', type: 'channelMigrateFrom', title: '', chatId: '' });
    });
  });

  describe('unsupported — unknown service type from server', () => {
    it('server action with unknown type → unsupported, text fallback not applied', () => {
      const msg = makeMsg({ action: { type: 'messageSomeUnknownServiceType' } });
      expect(msg.content.action).toMatchObject({ mediaType: 'action', type: 'unsupported' });
      // action 설정 시 '[지원되지 않는 메시지 형식]' 텍스트 폴백 미적용
      expect(msg.content.text).toBeUndefined();
    });

    it('raw unknown type without action wrapper → no action set (fallback to existing text path)', () => {
      const msg = makeMsg({ _: 'messageSomeUnknownMediaType' });
      // content._ set + not messageText → text fallback triggers
      expect(msg.content.action).toBeUndefined();
      expect(msg.content.text?.text).toBe('[지원되지 않는 메시지 형식]');
    });
  });

  describe('regression — normal message types unaffected', () => {
    it('messageText → content.text preserved, no action set', () => {
      const msg = makeMsg({ _: 'messageText', text: { text: 'hello world', entities: [] } });
      expect(msg.content.text?.text).toBe('hello world');
      expect(msg.content.action).toBeUndefined();
    });

    it('messagePhoto → content.photo set, no action set', () => {
      const msg = makeMsg({
        _: 'messagePhoto',
        photo: {
          id: 'photo-1',
          sizes: [{ type: 'x', width: 100, height: 100, photoFileId: 'fid-1' }],
        },
      });
      expect(msg.content.photo).toBeDefined();
      expect(msg.content.action).toBeUndefined();
    });

    it('no content → no action, no text', () => {
      const msg = buildApiMessage({
        id: 2,
        chat_id: 100,
        date: 0,
        is_outgoing: false,
      });
      expect(msg.content.action).toBeUndefined();
    });
  });
});
