/**
 * API Layer re-export
 * Now using TDLib instead of GramJS
 */
export {
  initApi,
  callApi,
  cancelApiProgress,
  cancelApiProgressMaster,
  callApiLocal,
  handleMethodCallback,
  handleMethodResponse,
  updateFullLocalDb,
  updateLocalDb,
  setShouldEnableDebugLog,
} from '../tdlib/methods/init';

export * from '../tdlib/methods';
