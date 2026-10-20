import { db } from "../database";
import { SYNC_TABLES } from "./api";
import { markDeleted } from "./queue";
import type { SyncTableName } from "./types";
import type { Table } from "dexie";

export function setupHooks() {
  const tableMap: Record<SyncTableName, Table<any, string>> = {
    conversiones: db.conversiones,
    grupos: db.grupos,
    evangelismos: db.evangelismos,
    cursos: db.cursos,
    lecciones: db.lecciones,
    estudiantes: db.estudiantes,
    certificados: db.certificados,
    dadores: db.dadores,
    aportes: db.aportes,
    beneficiarios: db.beneficiarios,
    campanas: db.campanas,
    entregas: db.entregas,
    metas: db.metas,
    negocios: db.negocios,
    publicaciones: db.publicaciones,
    reportes: db.reportes,
    miembrosComun: db.miembrosComun as Table<any, string>,
    aportesComun: db.aportesComun,
    miembros: db.miembros,
    ministerios: db.ministerios,
    miembrosMinisterios: db.miembrosMinisterios,
    hitos: db.hitos,
    zonas: db.zonas,
    colaboradores: db.colaboradores,
    tiposPlanes: db.tiposPlanes,
    planesColaborador: db.planesColaborador,
  };

  for (const table of SYNC_TABLES) {
    const dbTable = tableMap[table];
    if (!dbTable) continue;
    dbTable.hook("deleting", (primKey: string) => {
      markDeleted(table, primKey);
    });
  }
}
