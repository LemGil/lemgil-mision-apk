import { supabase } from "../supabase";
import { db } from "../database";
import { emitStatus } from "./status";
import {
  getOutbox, clearOutbox, getTombstones, removeTombstone,
  enqueueAllRecords, setApplyingRemote,
} from "./queue";
import type { SyncTableName, SyncError } from "./types";
import { summarizeErrors } from "./types";
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
      // La columna en Postgres es updated_at (no «updatedat»).
      const outKey = key === "updatedAt" ? "updated_at" : key.toLowerCase();
      (acc as Record<string, unknown>)[outKey] = toLowerCaseKeys((obj as Record<string, unknown>)[key]);
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
  updated_at: "updatedAt",
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

export const tableMap: Record<SyncTableName, Table<any, string>> = {
  conversiones: db.conversiones as Table<any, string>,
  grupos: db.grupos as Table<any, string>,
  evangelismos: db.evangelismos as Table<any, string>,
  cursos: db.cursos as Table<any, string>,
  lecciones: db.lecciones as Table<any, string>,
  estudiantes: db.estudiantes as Table<any, string>,
  certificados: db.certificados as Table<any, string>,
  dadores: db.dadores as Table<any, string>,
  aportes: db.aportes as Table<any, string>,
  beneficiarios: db.beneficiarios as Table<any, string>,
  campanas: db.campanas as Table<any, string>,
  entregas: db.entregas as Table<any, string>,
  metas: db.metas as Table<any, string>,
  negocios: db.negocios as Table<any, string>,
  publicaciones: db.publicaciones as Table<any, string>,
  reportes: db.reportes as Table<any, string>,
  miembrosComun: db.miembrosComun as Table<any, string>,
  aportesComun: db.aportesComun as Table<any, string>,
  miembros: db.miembros as Table<any, string>,
  ministerios: db.ministerios as Table<any, string>,
  miembrosMinisterios: db.miembrosMinisterios as Table<any, string>,
  hitos: db.hitos as Table<any, string>,
  zonas: db.zonas as Table<any, string>,
  colaboradores: db.colaboradores as Table<any, string>,
  tiposPlanes: db.tiposPlanes as Table<any, string>,
  planesColaborador: db.planesColaborador as Table<any, string>,
};

/**
 * Prepara un registro local para subirlo a Supabase.
 * - Quita campos internos de Dexie.
 * - Conserva version y updatedAt (antes se quitaban: por eso los conflictos
 *   nunca se resolvían y la versión remota quedaba siempre en 1). OJO: los
 *   esquemas remotos no son parejos (hay tablas sin version y/o sin
 *   updated_at); esas columnas se conservan aquí y se descartan de forma
 *   adaptativa, por tabla, solo si el servidor las rechaza (ver
 *   parseMissingColumn y la escalera de reintento en upsertOne).
 * - aportesComun NO lleva version (la tabla remota rechaza esa columna; es el
 *   arreglo histórico de los commits «excluir campo version de aportesComun»).
 */
export function cleanForPush(table: SyncTableName, record: Record<string, unknown>): Record<string, unknown> {
  const { _primKey: _p, ...rest } = { ...record };
  if (table === "dadores") delete rest.base;
  if (table === "colaboradores" && rest.planOfrendaMonto == null) rest.planOfrendaMonto = 0;
  delete rest.codigo;
  if (table === "aportesComun") delete rest.version;
  return rest;
}

/** ¿Trae la fila remota cambios más nuevos que la copia local? (función pura, probada). */
export function isRemoteNewer(
  table: SyncTableName,
  local: Record<string, unknown>,
  remote: Record<string, unknown>,
): boolean {
  if (table === "aportesComun") {
    // Sin columna version utilizable: se compara por fecha de actualización.
    return String(remote.updatedAt || "") > String(local.updatedAt || "");
  }
  return ((remote.version as number) || 0) > ((local.version as number) || 0);
}

async function pushTombstones(): Promise<SyncError[]> {
  const errors: SyncError[] = [];
  const tombs = await getTombstones();
  for (const t of tombs) {
    const { error } = await supabase.from(toSupabase(t.table)).delete().eq("id", t.recordId);
    if (error) {
      errors.push({ table: t.table, message: `borrado de ${t.recordId}: ${error.message}` });
    } else {
      await removeTombstone(t.table, t.recordId);
    }
  }
  return errors;
}

/**
 * Extrae el nombre de la columna faltante de un error de PostgREST del tipo
 * «Could not find the 'version' column of 'cursos' in the schema cache».
 * Devuelve null si el mensaje no es de ese tipo. (Función pura, probada.)
 */
export function parseMissingColumn(message: string): string | null {
  const match = /could not find the '([^']+)' column/i.exec(message);
  return match ? match[1] : null;
}

/**
 * Columnas que el servidor ya rechazó por tabla (solo esta sesión): los
 * esquemas remotos no son parejos — hay tablas sin `version` y/o sin
 * `updated_at` — y una vez detectada la columna faltante, los registros
 * siguientes de esa tabla salen sin ella, sin repetir la escalera.
 */
const droppedColumns = new Map<SyncTableName, Set<string>>();

function noteDroppedColumn(table: SyncTableName, column: string): void {
  let set = droppedColumns.get(table);
  if (!set) {
    set = new Set<string>();
    droppedColumns.set(table, set);
  }
  set.add(column);
}

function applyDroppedColumns(table: SyncTableName, row: Record<string, unknown>): Record<string, unknown> {
  const dropped = droppedColumns.get(table);
  if (!dropped || dropped.size === 0) return row;
  const out = { ...row };
  for (const column of dropped) delete out[column];
  return out;
}

/** Intentos máximos de la escalera: uno por columna descartable, con margen. */
const MAX_UPSERT_ATTEMPTS = 5;

async function upsertOne(table: SyncTableName, record: Record<string, unknown>): Promise<string | null> {
  const base = toLowerCaseKeys(cleanForPush(table, record)) as Record<string, unknown>;
  let payload = applyDroppedColumns(table, base);
  let lastMessage: string | null = null;
  for (let attempt = 0; attempt < MAX_UPSERT_ATTEMPTS; attempt++) {
    const { error } = await supabase.from(toSupabase(table)).upsert(payload);
    if (!error) return null;
    lastMessage = error.message;
    // Escalera adaptativa: si el servidor rechaza una columna que va en el
    // payload, se registra el descarte para la tabla y se reintenta sin ella.
    // Cualquier otro error se devuelve tal cual (nada se traga en silencio).
    const missing = parseMissingColumn(error.message);
    if (!missing || !(missing in payload)) return error.message;
    noteDroppedColumn(table, missing);
    payload = { ...payload };
    delete payload[missing];
  }
  return lastMessage;
}

/**
 * Sube SOLO los registros que cambiaron desde el último sync (bandeja de salida).
 * Antes se subían las 26 tablas completas en cada ciclo. Los fallos se DEVUELVEN,
 * nunca se tragan: el llamador los muestra en el indicador.
 */
export async function pushOutbox(): Promise<SyncError[]> {
  const errors: SyncError[] = [...(await pushTombstones())];

  const entries = await getOutbox();
  const done: number[] = [];
  for (const entry of entries) {
    const table = entry.table as SyncTableName;
    try {
      const record = await tableMap[table].get(entry.recordId);
      if (!record) {
        // El registro ya no existe localmente (se borró): su tumba cubre la nube.
        if (entry.id != null) done.push(entry.id);
        continue;
      }
      // upsertOne aplica los descartes de columnas ya conocidos de la tabla.
      const errMsg = await upsertOne(table, record);
      if (errMsg) {
        errors.push({ table, message: `subida de ${entry.recordId}: ${errMsg}` });
      } else if (entry.id != null) {
        done.push(entry.id);
      }
    } catch (err: unknown) {
      errors.push({ table, message: err instanceof Error ? err.message : String(err) });
    }
  }
  await clearOutbox(done);
  return errors;
}

/** Nombre histórico: ahora hace la subida incremental de la bandeja. */
export async function pushAllLocal(): Promise<SyncError[]> {
  return pushOutbox();
}

/** Sube TODAS las tablas completas (lo que promete el botón «Forzar Sync Total»). */
export async function forceFullPush(): Promise<SyncError[]> {
  const errors: SyncError[] = [...(await pushTombstones())];
  for (const table of SYNC_TABLES) {
    try {
      const localData = await tableMap[table].toArray();
      if (localData.length === 0) continue;
      const cleaned = localData.map((r) => cleanForPush(table, r));
      const lowerData = toLowerCaseKeys(cleaned) as Record<string, unknown>[];
      // Se parte de los descartes ya conocidos de la tabla y se aplica la
      // misma escalera que en upsertOne, a nivel de lote: ante un error de
      // columna faltante se quita de todas las filas y se reintenta.
      let rows = lowerData.map((r) => applyDroppedColumns(table, r));
      let errorMsg: string | null = null;
      for (let attempt = 0; attempt < MAX_UPSERT_ATTEMPTS; attempt++) {
        const { error } = await supabase.from(toSupabase(table)).upsert(rows);
        if (!error) {
          errorMsg = null;
          break;
        }
        errorMsg = error.message;
        const missing = parseMissingColumn(error.message);
        if (!missing || !rows.some((r) => missing in r)) break;
        noteDroppedColumn(table, missing);
        rows = rows.map((r) => {
          const c = { ...r };
          delete c[missing];
          return c;
        });
      }
      if (errorMsg) errors.push({ table, message: errorMsg });
    } catch (err: unknown) {
      errors.push({ table, message: err instanceof Error ? err.message : String(err) });
    }
  }
  // Todo quedó subido: la bandeja ya no tiene nada que reclamar.
  if (errors.length === 0) {
    const entries = await getOutbox();
    await clearOutbox(entries.map((e) => e.id).filter((id): id is number => id != null));
  }
  return errors;
}

export async function pullFromSupabase(): Promise<SyncError[]> {
  const errors: SyncError[] = [];
  const tombs = new Set((await getTombstones()).map((t) => `${t.table}:${t.recordId}`));
  setApplyingRemote(true);
  try {
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
      if (error) {
        errors.push({ table, message: `descarga: ${error.message}` });
        continue;
      }
      if (!data || data.length === 0) continue;

      const normalized = toCamelCaseKeys(data) as Array<Record<string, unknown>>;
      const tableInstance = tableMap[table];
      const existingRecords = await tableInstance.toArray();
      const byId = new Map(existingRecords.map((r) => [r.id as string, r]));

      const toAdd: Record<string, unknown>[] = [];
      for (const record of normalized) {
        if (typeof record.id !== "string") continue;
        // Un registro borrado localmente con la tumba pendiente NO resucita.
        if (tombs.has(`${table}:${record.id}`)) continue;
        const local = byId.get(record.id);
        if (!local) {
          toAdd.push(record);
        } else if (isRemoteNewer(table, local, record)) {
          try {
            await tableInstance.update(record.id, record);
          } catch (err: unknown) {
            errors.push({ table, message: err instanceof Error ? err.message : String(err) });
          }
        }
      }
      if (toAdd.length > 0) {
        try {
          await tableInstance.bulkAdd(toAdd);
        } catch (err: unknown) {
          errors.push({ table, message: err instanceof Error ? err.message : String(err) });
        }
      }
    }
  } finally {
    setApplyingRemote(false);
  }
  return errors;
}

/** Encola todos los registros locales (primera vez tras la actualización incremental). */
export async function enqueueAllLocalRecords(): Promise<void> {
  await enqueueAllRecords(
    SYNC_TABLES.map((name) => ({
      name,
      ids: async () => (await tableMap[name].toArray()).map((r) => r.id as string),
    })),
  );
}

/**
 * Sincronización total forzada (botón «Forzar Sync Total»): sube todas las
 * tablas completas y luego baja lo que haya en la nube. Lanza un Error con el
 * resumen si algo falló — el éxito que anuncia la interfaz es real.
 */
export async function forcePushAllLocal(): Promise<void> {
  const errors = [...(await forceFullPush()), ...(await pullFromSupabase())];
  if (errors.length > 0) {
    throw new Error(summarizeErrors(errors));
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
