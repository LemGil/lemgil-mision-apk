export type SyncStatus = {
  connected: boolean;
  lastSync: string;
  error: string;
  /** Cambios locales aún sin subir (bandeja de salida + borrados pendientes). */
  pending: number;
  /** Hay una sincronización en curso. */
  syncing: boolean;
};

export type SyncTableName =
  | "conversiones"
  | "grupos"
  | "evangelismos"
  | "cursos"
  | "lecciones"
  | "estudiantes"
  | "certificados"
  | "dadores"
  | "aportes"
  | "beneficiarios"
  | "campanas"
  | "entregas"
  | "metas"
  | "negocios"
  | "publicaciones"
  | "reportes"
  | "miembros"
  | "ministerios"
  | "miembrosMinisterios"
  | "hitos"
  | "zonas"
  | "colaboradores"
  | "tiposPlanes"
  | "planesColaborador"
  | "aportesComun"
  | "miembrosComun";

export interface SyncOp {
  table: SyncTableName;
  id: string;
  ts: number;
}

/** Un fallo de sincronización en una tabla concreta. Nunca se traga en silencio. */
export interface SyncError {
  table: SyncTableName;
  message: string;
}

export function summarizeErrors(errors: SyncError[]): string {
  if (errors.length === 0) return "";
  const shown = errors.slice(0, 3).map((e) => `${e.table}: ${e.message}`).join(" · ");
  return errors.length > 3 ? `${shown} · y ${errors.length - 3} más` : shown;
}
