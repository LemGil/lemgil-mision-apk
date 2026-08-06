const DELETED_IDS_KEY = "lemgil_deleted_ids";
const DELETED_EXPIRY_MS = 24 * 60 * 60 * 1000;

export function getDeletedIds(): Record<string, { table: string; ts: number }> {
  try { return JSON.parse(localStorage.getItem(DELETED_IDS_KEY) || "{}"); } catch { return {}; }
}

export function saveDeletedIds(ids: Record<string, { table: string; ts: number }>) {
  const now = Date.now();
  for (const [key, entry] of Object.entries(ids)) {
    if (now - entry.ts > DELETED_EXPIRY_MS) delete ids[key];
  }
  localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(ids));
}

export function markDeleted(table: string, id: string) {
  const ids = getDeletedIds();
  ids[table + ":" + id] = { table, ts: Date.now() };
  saveDeletedIds(ids);
}

export function unmarkDeleted(table: string, id: string) {
  const ids = getDeletedIds();
  delete ids[table + ":" + id];
  saveDeletedIds(ids);
}
