import type { SyncOp } from './types';
import { emitStatus } from './status';

const SYNC_QUEUE_KEY = 'lemgil_sync_queue';
const DELETED_IDS_KEY = 'lemgil_deleted_ids';
const DELETED_EXPIRY_MS = 24 * 60 * 60 * 1000;

export function getDeletedIds(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(DELETED_IDS_KEY) || '{}'); } catch { return {}; }
}

export function saveDeletedIds(ids: Record<string, number>) {
  const now = Date.now();
  for (const [key, ts] of Object.entries(ids)) {
    if (now - ts > DELETED_EXPIRY_MS) delete ids[key];
  }
  localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(ids));
}

export function markDeleted(id: string) {
  const ids = getDeletedIds();
  ids[id] = Date.now();
  saveDeletedIds(ids);
}

export function unmarkDeleted(id: string) {
  const ids = getDeletedIds();
  delete ids[id];
  saveDeletedIds(ids);
}

export function getQueue(): SyncOp[] {
  try {
    return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveQueue(queue: SyncOp[]) {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

export function enqueue(op: SyncOp) {
  const queue = getQueue();
  queue.push(op);
  saveQueue(queue);
  emitStatus({ pendingOps: queue.length });
}
