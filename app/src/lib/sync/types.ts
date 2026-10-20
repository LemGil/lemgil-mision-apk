export type SyncStatus = {
  connected: boolean;
  lastSync: string;
  error: string;
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
