export type SyncOp = {
  table: string;
  operation: 'create' | 'update' | 'delete';
  id: string;
  data?: Record<string, unknown>;
  changes?: Record<string, unknown>;
  timestamp: number;
};

export type SyncStatus = {
  connected: boolean;
  lastSync: string;
  pendingOps: number;
  error: string;
};
