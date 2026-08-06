import type { SyncStatus } from "./types";

let _statusListeners: ((s: SyncStatus) => void)[] = [];
let _currentStatus: SyncStatus = { connected: false, lastSync: "Nunca", error: "" };

export function onSyncStatus(fn: (s: SyncStatus) => void) {
  _statusListeners.push(fn);
  fn(_currentStatus);
  return () => { _statusListeners = _statusListeners.filter(l => l !== fn); };
}

export function emitStatus(update: Partial<SyncStatus>) {
  _currentStatus = { ..._currentStatus, ...update };
  _statusListeners.forEach(l => l(_currentStatus));
}

export function getCurrentStatus(): SyncStatus {
  return _currentStatus;
}
