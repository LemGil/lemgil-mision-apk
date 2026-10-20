import { useEffect, useState } from "react";
import { onSyncStatus } from "../lib/sync/status";
import { type SyncStatus } from "../lib/sync/types";
import { getDeletedCount } from "../lib/sync/queue";

export function SyncIndicator() {
  const [status, setStatus] = useState<SyncStatus>({ connected: false, lastSync: "Nunca", error: "" });
  const [deletedCount, setDeletedCount] = useState<number>(0);

  useEffect(() => {
    const unsub = onSyncStatus(setStatus);
    const updateCount = () => setDeletedCount(getDeletedCount());
    updateCount();
    const interval = setInterval(updateCount, 5000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  if (status.error && !status.connected) {
    return (
      <div style={{ position: "fixed", bottom: 12, right: 12, background: "var(--red)", color: "white", padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, zIndex: 9999, cursor: "pointer", opacity: 0.9 }} title={status.error}>
        ✗ Sync Error {deletedCount > 0 && `(${deletedCount} pendientes)`}
      </div>
    );
  }

  if (status.connected) {
    return (
      <div style={{ position: "fixed", bottom: 12, right: 12, background: "var(--green)", color: "white", padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, zIndex: 9999, opacity: 0.7 }} title={`Último sync: ${status.lastSync}`}>
        ✓ Synced {deletedCount > 0 && `(${deletedCount} pendientes)`}
      </div>
    );
  }

  return null;
}
