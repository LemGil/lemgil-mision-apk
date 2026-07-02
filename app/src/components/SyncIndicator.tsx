import { useEffect, useState } from 'react';
import { onSyncStatus } from '../lib/sync/status';
import { type SyncStatus } from '../lib/sync/types';

export function SyncIndicator() {
  const [status, setStatus] = useState<SyncStatus>({ connected: false, lastSync: 'Nunca', pendingOps: 0, error: '' });

  useEffect(() => {
    return onSyncStatus(setStatus);
  }, []);

  if (status.error && !status.connected) {
    return (
      <div style={{ position: 'fixed', bottom: 12, right: 12, background: 'var(--red)', color: 'white', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, zIndex: 9999, cursor: 'pointer', opacity: 0.9 }} title={status.error}>
        ✗ Sync Error
      </div>
    );
  }

  if (status.pendingOps > 0) {
    return (
      <div style={{ position: 'fixed', bottom: 12, right: 12, background: 'var(--gold)', color: '#000', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, zIndex: 9999 }}>
        ⏳ {status.pendingOps} pendiente{status.pendingOps > 1 ? 's' : ''}
      </div>
    );
  }

  if (status.connected) {
    return (
      <div style={{ position: 'fixed', bottom: 12, right: 12, background: 'var(--green)', color: 'white', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, zIndex: 9999, opacity: 0.7 }} title={`Último sync: ${status.lastSync}`}>
        ✓ Synced
      </div>
    );
  }

  return null;
}
