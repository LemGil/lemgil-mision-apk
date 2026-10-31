import type { SyncStatus } from "./types";

const LAST_SYNC_KEY = "lemgil_last_sync";

export function loadLastSync(): string {
  try {
    return localStorage.getItem(LAST_SYNC_KEY) || "Nunca";
  } catch {
    return "Nunca";
  }
}

export function saveLastSync(): string {
  const label = new Date().toLocaleString("es", { dateStyle: "medium", timeStyle: "short" });
  try {
    localStorage.setItem(LAST_SYNC_KEY, label);
  } catch { /* sin consecuencias */ }
  return label;
}

let _statusListeners: ((s: SyncStatus) => void)[] = [];
let _currentStatus: SyncStatus = {
  connected: false,
  lastSync: loadLastSync(),
  error: "",
  errors: [],
  pending: 0,
  syncing: false,
};

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
