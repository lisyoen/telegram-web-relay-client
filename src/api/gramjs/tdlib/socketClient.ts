import { io, Socket } from 'socket.io-client';

import type { TdLibChat, TdLibMessage } from './types';

import { DEBUG } from '../../../config';

const TDLIB_SERVER_URL = 'http://localhost:9087';

type SocketEventCallback = (data: any) => void;

class TdLibSocketClient {
  private socket: Socket | undefined;
  private isConnected = false;
  private messageHandlers = new Map<string, SocketEventCallback>();
  private updateCallback: ((update: any) => void) | undefined;

  async connect() {
    if (this.socket && this.isConnected) {
      return;
    }

    return new Promise<void>((resolve, reject) => {
      this.socket = io(TDLIB_SERVER_URL, {
        // 서버(server.js)는 transports:['polling'] 전용(Cloudflare Tunnel WSS 미지원).
        // socket.io-client 4.8+ 는 tryAllTransports 기본 false 라 websocket 우선 시 폴백 안 됨 → polling 고정.
        transports: ['polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
      });

      this.socket.on('connect', () => {
        // eslint-disable-next-line no-console
        console.log('[TDLib] connected transport=', this.socket?.io?.engine?.transport?.name);
        this.isConnected = true;
        resolve();
      });

      this.socket.on('disconnect', () => {
        if (DEBUG) {
          // eslint-disable-next-line no-console
          console.log('[TDLib] Disconnected from server');
        }
        this.isConnected = false;
      });

      this.socket.on('connect_error', (error) => {
        // eslint-disable-next-line no-console
        console.error('[TDLib] connect_error:', (error as { message?: string })?.message || error);
        reject(error);
      });

      // Real-time update handlers
      this.socket.on('newMessage', (message: TdLibMessage) => {
        if (DEBUG) {
          // eslint-disable-next-line no-console
          console.log('[TDLib] New message:', message);
        }
        this.updateCallback?.({
          '@type': 'updateNewMessage',
          message,
        });
      });

      this.socket.on('chatAction', (data: { chatId: number; action: string; userName: string }) => {
        if (DEBUG) {
          // eslint-disable-next-line no-console
          console.log('[TDLib] Chat action:', data);
        }
        this.updateCallback?.({
          '@type': 'updateChatAction',
          chatId: data.chatId,
          action: data.action,
          userName: data.userName,
        });
      });

      this.socket.on('chatDraft', (data: {
        chatId: string;
        draftMessage: { text: string; entities: any[]; date: number; replyToMessageId?: number } | null;
        account?: string;
      }) => {
        const draft = data.draftMessage ? {
          text: { text: data.draftMessage.text, entities: data.draftMessage.entities || [] },
          date: data.draftMessage.date || Math.floor(Date.now() / 1000),
          ...(data.draftMessage.replyToMessageId
            ? { replyInfo: { type: 'message', replyToMsgId: data.draftMessage.replyToMessageId } }
            : {}),
        } : undefined;
        this.updateCallback?.({
          '@type': 'draftMessage',
          chatId: String(data.chatId),
          threadId: undefined,
          draft,
        });
      });

      this.socket.on('chatNotifySettings', (data: {
        chatId: string;
        isMuted: boolean;
        account?: string;
      }) => {
        const applyId = String(data.chatId);
        const applyMuted = !!data.isMuted;
        this.updateCallback?.({
          '@type': 'updateChatIsMuted',
          chatId: applyId,
          isMuted: applyMuted,
        });
      });

      // Timeout fallback
      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
      this.isConnected = false;
    }
  }

  setUpdateCallback(callback: (update: any) => void) {
    this.updateCallback = callback;
  }

  private emit<T>(event: string, data?: any): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error(`Request timeout: ${event}`));
      }, 30000);

      this.socket.emit(event, data, (response: T) => {
        clearTimeout(timeout);
        if (DEBUG) {
          // eslint-disable-next-line no-console
          console.log(`[TDLib] Response for ${event}:`, response);
        }
        resolve(response);
      });
    });
  }

  async getChats(params?: { limit?: number; offsetOrder?: string; offsetChatId?: number }): Promise<TdLibChat[]> {
    try {
      const chats = await this.emit<TdLibChat[]>('getChats', params);
      return chats || [];
    } catch (error) {
      if (DEBUG) {
        // eslint-disable-next-line no-console
        console.error('[TDLib] getChats error:', error);
      }
      return [];
    }
  }

  async getMessages(params: {
    chatId: number;
    limit?: number;
    fromMessageId?: number;
  }): Promise<TdLibMessage[]> {
    try {
      const messages = await this.emit<TdLibMessage[]>('getMessages', {
        chatId: params.chatId,
        limit: params.limit || 50,
        fromMessageId: params.fromMessageId,
      });
      return messages || [];
    } catch (error) {
      if (DEBUG) {
        // eslint-disable-next-line no-console
        console.error('[TDLib] getMessages error:', error);
      }
      return [];
    }
  }

  async sendMessage(params: {
    chatId: number;
    text: string;
    replyToMessageId?: number;
  }): Promise<TdLibMessage | undefined> {
    try {
      const message = await this.emit<TdLibMessage>('sendMessage', {
        chatId: params.chatId,
        text: params.text,
        replyToMessageId: params.replyToMessageId,
      });
      return message;
    } catch (error) {
      if (DEBUG) {
        // eslint-disable-next-line no-console
        console.error('[TDLib] sendMessage error:', error);
      }
      return undefined;
    }
  }

  async markAsRead(params: { chatId: number; messageIds: number[] }): Promise<void> {
    try {
      await this.emit('markRead', {
        chatId: params.chatId,
        messageIds: params.messageIds,
      });
    } catch (error) {
      if (DEBUG) {
        // eslint-disable-next-line no-console
        console.error('[TDLib] markAsRead error:', error);
      }
    }
  }

  async searchMessages(params: {
    query: string;
    chatId?: number;
    limit?: number;
  }): Promise<TdLibMessage[]> {
    try {
      // Use REST API for search
      const queryParams = new URLSearchParams({
        q: params.query,
        limit: String(params.limit || 20),
      });
      if (params.chatId) {
        queryParams.set('chat_id', String(params.chatId));
      }

      const response = await fetch(`${TDLIB_SERVER_URL}/api/search?${queryParams}`);
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      if (DEBUG) {
        // eslint-disable-next-line no-console
        console.error('[TDLib] searchMessages error:', error);
      }
      return [];
    }
  }

  async getChatHistory(params: { chatId: number; limit?: number }): Promise<TdLibMessage[]> {
    try {
      const response = await fetch(
        `${TDLIB_SERVER_URL}/api/history?chat_id=${params.chatId}&limit=${params.limit || 50}`,
      );
      if (!response.ok) {
        throw new Error(`Get history failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      if (DEBUG) {
        // eslint-disable-next-line no-console
        console.error('[TDLib] getChatHistory error:', error);
      }
      return [];
    }
  }

  private apiRequest<T = any>(method: string, params: any): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('Socket not connected'));
        return;
      }
      const id = `${method}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const timeout = setTimeout(() => {
        this.socket?.off(`api:response:${id}`, handler);
        reject(new Error(`${method} timeout`));
      }, 30000);
      const handler = ({ data, error }: { data: T; error?: any }) => {
        clearTimeout(timeout);
        if (error) reject(new Error((error as any)?.message || JSON.stringify(error)));
        else resolve(data);
      };
      this.socket.once(`api:response:${id}`, handler);
      this.socket.emit('api:request', { id, method, params });
    });
  }

  async saveDraft(params: {
    chatId: string;
    text: string;
    entities?: any[];
    replyToMessageId?: number;
  }): Promise<{ ok: boolean } | undefined> {
    try {
      return await this.apiRequest<{ ok: boolean }>('saveDraft', params);
    } catch (error) {
      if (DEBUG) {
        // eslint-disable-next-line no-console
        console.error('[TDLib] saveDraft error:', error);
      }
      return undefined;
    }
  }

  async setChatNotificationSettings(params: {
    chatId: string;
    mutedUntil: number;
  }): Promise<{ ok: boolean } | undefined> {
    try {
      return await this.apiRequest<{ ok: boolean }>('setChatNotificationSettings', params);
    } catch (error) {
      if (DEBUG) {
        // eslint-disable-next-line no-console
        console.error('[TDLib] setChatNotificationSettings error:', error);
      }
      return undefined;
    }
  }

  async searchMembers(params: {
    chatId: number;
    query?: string;
  }): Promise<Array<{ userId: string; name: string; username?: string }>> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        this.socket?.off('members', handler);
        reject(new Error('searchMembers timeout'));
      }, 30000);

      const handler = (data: {
        chatId: number;
        members: Array<{ userId: string; name: string; username?: string }>;
      }) => {
        if (data.chatId === params.chatId) {
          clearTimeout(timeout);
          this.socket?.off('members', handler);
          if (DEBUG) {
            // eslint-disable-next-line no-console
            console.log('[TDLib] Members received:', data.members);
          }
          resolve(data.members || []);
        }
      };

      this.socket.on('members', handler);

      this.socket.emit('searchMembers', {
        chatId: params.chatId,
        query: params.query || '',
      });

      if (DEBUG) {
        // eslint-disable-next-line no-console
        console.log('[TDLib] searchMembers emitted:', params);
      }
    });
  }
}

// Singleton instance
let tdlibClient: TdLibSocketClient | undefined;

export function getTdLibClient(): TdLibSocketClient {
  if (!tdlibClient) {
    tdlibClient = new TdLibSocketClient();
  }
  return tdlibClient;
}

export function resetTdLibClient() {
  if (tdlibClient) {
    tdlibClient.disconnect();
    tdlibClient = undefined;
  }
}
