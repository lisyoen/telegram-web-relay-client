/**
 * Socket API 진입점
 * 기존 gramjs API와 동일한 인터페이스 제공
 */

export {
  initSocket,
  getSocket,
  isSocketConnected,
  onConnectionChange,
  emitWithResponse,
  disconnectSocket,
} from './socketClient';

export {
  initApi,
  callApi,
  cancelApiProgress,
} from './connector';
