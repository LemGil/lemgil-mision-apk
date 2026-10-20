import { supabase } from "../supabase";
import { db } from "../database";
import { emitStatus } from "./status";
import { getDeletedIds, unmarkDeleted } from "./queue";
import type { SyncTableName } from "./types";
import type { Table } from "dexie";

const PULL_TIMEOUT_MS = 15000;

function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout (${ms}ms)`)), ms);
    Promise.resolve(p).then(
      v => { clearTimeout(timer); resolve(v); },
      e => { clearTimeout(timer); reject(e); }
    );
  });
}

export const SYNC_TABLES = [
  "conversiones", "grupos", "evangelismos", "cursos", "lecciones",
  "estudiantes", "certificados", "dadores", "aportes", "beneficiarios",
  "campanas", "entregas", "metas", "negocios", "publicaciones",
  "reportes", "miembros",
  "ministerios", "miembrosMinisterios", "hitos", "zonas", "colaboradores",
  "tiposPlanes", "planesColaborador",
  "aportesComun", "miembrosComun",
] as const satisfies readonly SyncTableName[];

const DEXIE_TO_SUPABASE: Record<SyncTableName, string> = {
  aportesComun: "aportescomun",
  miembrosComun: "miembroscomun",
  miembrosMinisterios: "miembrosministerios",
  tiposPlanes: "tiposplanes",
  planesColaborador: "planescolaborador",
  conversiones: "conversiones",
  grupos: "grupos",
  evangelismos: "evangelismos",
  cursos: "cursos",
  lecciones: "lecciones",
  estudiantes: "estudiantes",
  certificados: "certificados",
  dadores: "dadores",
  aportes: "aportes",
  beneficiarios: "beneficiarios",
  campanas: "campanas",
  entregas: "entregas",
  metas: "metas",
  negocios: "negocios",
  publicaciones: "publicaciones",
  reportes: "reportes",
  miembros: "miembros",
  ministerios: "ministerios",
  hitos: "hitos",
  zonas: "zonas",
  colaboradores: "colaboradores",
};

function toSupabase(name: SyncTableName): string {
  return DEXIE_TO_SUPABASE[name] || name;
}

export function toLowerCaseKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(toLowerCaseKeys);
  if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    return Object.keys(obj as Record<string, unknown>).reduce((acc, key) => {
      (acc as Record<string, unknown>)[key.toLowerCase()] = toLowerCaseKeys((obj as Record<string, unknown>)[key]);
      return acc;
    }, {} as Record<string, unknown>);
  }
  return obj;
}

const SUPABASE_TO_DEXIE: Record<string, string> = {
  grupoid: "grupoId", diezmadorid: "diezmadorId", campanaid: "campanaId",
  beneficiarioid: "beneficiarioId", cursoid: "cursoId", leccionid: "leccionId",
  estid: "estId", estudianteid: "estudianteId", certificadoid: "certificadoId",
  ministerioid: "ministerioId", miembroministerioid: "miembroMinisterioId",
  hermanomayorid: "hermanoMayorId", conversionid: "conversionId", origenid: "origenId",
  mescorrespondiente: "mesCorrespondiente", planofrendasmensual: "planOfrendasMensual",
  planofrendatipo: "planOfrendaTipo", planofrendamonto: "planOfrendaMonto",
  planediezmo: "planDiezmo", tipoplanid: "tipoPlanId", colaboradorid: "colaboradorId",
  montomensual: "montoMensual", contactopreferido: "contactoPreferido",
  estadocivil: "estadoCivil", fechanacimiento: "fechaNacimiento", fechaingreso: "fechaIngreso",
  fechabautismo: "fechaBautismo", beneficiarionombre: "beneficiarioNombre",
  beneficiariotipo: "beneficiarioTipo", metatipo: "metaTipo", metafamilias: "metaFamilias",
  ingresosmensuales: "ingresosMensuales", generadopor: "generadoPor", generated: "generado",
};

export function toCamelCaseKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(toCamelCaseKeys);
  if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    return Object.keys(obj as Record<string, unknown>).reduce((acc, key) => {
      const camelKey = SUPABASE_TO_DEXIE[key] || key;
      (acc as Record<string, unknown>)[camelKey] = toCamelCaseKeys((obj as Record<string, unknown>)[key]);
      return acc;
    }, {} as Record<string, unknown>);
  }
  return obj;
}

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

async function bulkUpsertAll(force: boolean) {
  for (const [key, entry] of Object.entries(getDeletedIds())) {
    const recordId = key.split(":")[1];
    if (!recordId) continue;
    const { error } = await supabase.from(toSupabase(entry.table)).delete().eq("id", recordId);
    if (!error) unmarkDeleted(entry.table, recordId);
  }
  let total = 0;
  for (const table of SYNC_TABLES) {
    const supaTable = toSupabase(table);
    try {
      const tableInstance = tableMap[table];
      const localData = await tableInstance.toArray();
      if (localData.length === 0) continue;
      const cleaned = localData.map((r: Record<string, unknown>) => {
        const { _primKey: _p, updatedAt: _u, ...rest } = r;
        if (table === "dadores") delete rest.base;
        if (table === "colaboradores" && rest.planOfrendaMonto == null) rest.planOfrendaMonto = 0;
        delete rest.codigo;
        if (table === "aportesComun") delete rest.version;
        return rest;
      });
      if (force) {
        const lowerData = toLowerCaseKeys(cleaned);
        const { error } = await supabase.from(supaTable).upsert(lowerData as Record<string, unknown>[]);
        if (error) continue;
      } else {
        for (const record of cleaned) {
          const { version: _v, ...recordClean } = record;
          const lowerRecord = toLowerCaseKeys(recordClean);
          const { error } = await supabase
            .from(supaTable)
            .upsert(lowerRecord as Record<string, unknown>);
          if (error) continue;
        }
      }
      total += cleaned.length;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[Sync] ✗ Excepción en ${table}:`, errorMsg);
    }
  }
  console.log(`[Sync] ✓ Push ${force ? "forzado" : "normal"}: ${total} registros`);
}

export async function pushAllLocal() {
  return bulkUpsertAll(false);
}

export async function forcePushAllLocal() {
  return bulkUpsertAll(true);
}

export async function pullFromSupabase() {
  for (const table of SYNC_TABLES) {
    const supaTable = toSupabase(table);
    let fetched;
    try {
      fetched = await withTimeout(supabase.from(supaTable).select("*"), PULL_TIMEOUT_MS);
    } catch {
      console.warn(`[Sync] ⏱ Pull de ${supaTable} agotó el tiempo (${PULL_TIMEOUT_MS}ms); se omite`);
      continue;
    }
    const { data, error } = fetched;
    if (error || !data || data.length === 0) continue;

    const normalized = toCamelCaseKeys(data) as Array<Record<string, unknown>>;
    const tableInstance = tableMap[table];
    const existingRecords = await tableInstance.toArray();
    const existingIds = new Set(existingRecords.map((r: Record<string, unknown>) => r.id));
    const deletedIds = getDeletedIds();

    const toAdd = normalized.filter((r) => typeof r.id === "string" && !existingIds.has(r.id) && !deletedIds[table + ":" + r.id]);
    const toUpdate = normalized.filter((r) => typeof r.id === "string" && existingIds.has(r.id));

    if (toAdd.length > 0) await tableInstance.bulkAdd(toAdd);

    for (const record of toUpdate) {
      try {
        const recordId = record.id as string;
        const existing = await tableInstance.get(recordId);
        if (existing) {
          const localVersion = (existing.version as number) || 0;
          const remoteVersion = (record.version as number) || 0;
          if (remoteVersion <= localVersion) continue;
          await tableInstance.update(recordId, record);
        }
      } catch { }
    }
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from("conversiones").select("id", { count: "exact", head: true });
    if (error) {
      emitStatus({ connected: false, error: error.message });
      return false;
    }
    emitStatus({ connected: true, error: "" });
    return true;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    emitStatus({ connected: false, error: errorMsg });
    return false;
  }
}
