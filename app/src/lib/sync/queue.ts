import type { SyncTableName, SyncOp } from "./types";

const DELETED_IDS_KEY = "lemgil_deleted_ids";
const DELETED_EXPIRY_MS = 24 * 60 * 60 * 1000;

export function getDeletedIds(): Record<string, SyncOp> {
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, SyncOp>;
  } catch {
    return {};
  }
}

export function saveDeletedIds(ids: Record<string, SyncOp>): void {
  const now = Date.now();
  const mutableIds = { ...ids };
  for (const [key, entry] of Object.entries(mutableIds)) {
    if (now - entry.ts > DELETED_EXPIRY_MS) {
      delete mutableIds[key];
    }
  }
  localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(mutableIds));
}

export function markDeleted(table: SyncTableName, id: string): void {
  const ids = getDeletedIds();
  ids[table + ":" + id] = { table, id, ts: Date.now() };
  saveDeletedIds(ids);
}

export function unmarkDeleted(table: SyncTableName, id: string): void {
  const ids = getDeletedIds();
  delete ids[table + ":" + id];
  saveDeletedIds(ids);
}

export function getDeletedCount(): number {
  try {
    const ids = getDeletedIds();
    return Object.keys(ids).length;
  } catch {
    return 0;
  }
}
