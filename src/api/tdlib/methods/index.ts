/**
 * TDLib API Methods Export
 */
export * from './chats';
export * from './messages';
export * from './users';
export * from './media';

// Stub exports for compatibility (Phase 2+)
export async function destroy() {
  return undefined;
}

export async function disconnect() {
  return undefined;
}

export async function repairFileReference() {
  return undefined;
}

export async function abortChatRequests() {
  return undefined;
}

export async function abortRequestGroup() {
  return undefined;
}

export async function setForceHttpTransport() {
  return undefined;
}

export async function setShouldDebugExportedSenders() {
  return undefined;
}

export async function setAllowHttpTransport() {
  return undefined;
}

export async function requestChannelDifference() {
  return undefined;
}

export async function provideAuthPhoneNumber() {
  return undefined;
}

export async function provideAuthCode() {
  return undefined;
}

export async function provideAuthPassword() {
  return undefined;
}

export async function provideAuthRegistration() {
  return undefined;
}

export async function restartAuth() {
  return undefined;
}

export async function restartAuthWithQr() {
  return undefined;
}

export async function restartAuthWithPasskey() {
  return undefined;
}

export async function broadcastLocalDbUpdateFull() {
  return undefined;
}
