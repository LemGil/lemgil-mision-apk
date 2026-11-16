import { supabase } from "../supabase";
import { db } from "../database";
import { emitStatus, saveLastSync } from "./status";
import {
  getOutbox, clearOutbox, getPendingCount, getPersonasAbsorbidas, getTombstones, removeTombstone,
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
  "personas",
  "conversiones", "grupos", "evangelismos", "cursos", "lecciones",
  "estudiantes", "certificados", "dadores", "aportes", "beneficiarios",
  "campanas", "entregas", "metas", "negocios", "publicaciones",
  "reportes", "miembros",
  "ministerios", "miembrosMinisterios", "hitos", "zonas", "colaboradores",
  "tiposPlanes", "planesColaborador",
  "aportesComun", "pasosSeguimiento",
] as const satisfies readonly SyncTableName[];

const DEXIE_TO_SUPABASE: Record<SyncTableName, string> = {
  personas: "personas",
  aportesComun: "aportescomun",
  miembrosMinisterios: "miembrosministerios",
  tiposPlanes: "tiposplanes",
  planesColaborador: "planescolaborador",
  pasosSeguimiento: "pasosseguimiento",
  conversiones: "conversiones",
  grupos: "grupos",
  evangelismos: "evangelismos",
  // La tabla remota `cursos` es la de la ACADEMIA (id numérico
  // automático, otras columnas): los cursos de ESTA app viven en su
  // propia tabla `cursos_mision` (decisión de LemGil, 2026-11-16;
  // crearla con crear-cursos-mision.sql).
  cursos: "cursos_mision",
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

export function toSupabase(name: SyncTableName): string {
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
  personaid: "personaId", numeroidentidad: "numeroIdentidad",
  liderid: "liderId", participanteids: "participanteIds", evangelismoid: "evangelismoId",
  pasoid: "pasoId",
  participantesexternos: "participantesExternos", liderexterno: "liderExterno",
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
  personas: db.personas as Table<any, string>,
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
  aportesComun: db.aportesComun as Table<any, string>,
  miembros: db.miembros as Table<any, string>,
  ministerios: db.ministerios as Table<any, string>,
  miembrosMinisterios: db.miembrosMinisterios as Table<any, string>,
  hitos: db.hitos as Table<any, string>,
  zonas: db.zonas as Table<any, string>,
  colaboradores: db.colaboradores as Table<any, string>,
  tiposPlanes: db.tiposPlanes as Table<any, string>,
  planesColaborador: db.planesColaborador as Table<any, string>,
  pasosSeguimiento: db.pasosSeguimiento as Table<any, string>,
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
/** Columnas de texto que la tabla remota `conversiones` exige NOT NULL. */
const CAMPOS_TEXTO_CONVERSION = [
  "nombre", "apellido", "telefono", "edad", "direccion", "familia",
  "fecha", "zona", "lider", "grupoId", "email", "profesion",
  "fechaBautismo", "conyuge", "hijos", "estado", "notas", "creado",
] as const;

export function cleanForPush(table: SyncTableName, record: Record<string, unknown>): Record<string, unknown> {
  const { _primKey: _p, ...rest } = { ...record };
  if (table === "dadores") delete rest.base;
  if (table === "colaboradores" && rest.planOfrendaMonto == null) rest.planOfrendaMonto = 0;
  delete rest.codigo;
  if (table === "aportesComun") delete rest.version;
  // Rellenos que exige el servidor (mapa verificado por LemGil el
  // 2026-11-16 contra information_schema): hay tablas remotas con
  // columnas NOT NULL sin valor por defecto; un registro local con
  // ese campo vacío o ausente rebota entero — el error real fue
  // «null value in column "lider" of relation "conversiones"».
  // conversiones las exige TODAS.
  if (table === "conversiones") {
    for (const campo of CAMPOS_TEXTO_CONVERSION) {
      if (rest[campo] == null) rest[campo] = "";
    }
    if (rest.bautizado == null) rest.bautizado = false;
    if (rest.historial == null) rest.historial = [];
  }
  // `version` NOT NULL en el servidor (conversiones, estudiantes,
  // lecciones…): un registro sin versión — creado por una vía que no
  // la puso — sube con la primera versión. aportesComun queda fuera:
  // su version se borra arriba a propósito.
  if (table !== "aportesComun" && rest.version == null) rest.version = 1;
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
  // Las personas absorbidas por «Unir personas» se vuelven a borrar en
  // el servidor en CADA ciclo: si un equipo con la copia vieja la
  // resucitó al subir todo, este borrado la retira otra vez, y la
  // reconciliación de la bajada termina de quitarla de aquel equipo.
  for (const id of getPersonasAbsorbidas()) {
    if (tombs.some((t) => t.table === "personas" && t.recordId === id)) continue;
    const { error } = await supabase.from("personas").delete().eq("id", id);
    if (error) {
      errors.push({ table: "personas", message: `borrado de ${id}: ${error.message}` });
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
/**
 * Los descartes se PERSISTEN entre sesiones (2026-11-16): sin esto,
 * cada vez que la app abre, la primera subida de cada tabla desigual
 * vuelve a chocar con el 400 de la columna faltante antes de
 * descartarla — ruido en la consola y vueltas de red que en una
 * conexión lenta se notan. La llave lleva versión: si el esquema
 * remoto cambia (una columna que hoy falta aparece), un paquete
 * futuro sube la versión y la app vuelve a sondear.
 */
// v2 (2026-11-16): `cursos` cambió de tabla remota (cursos_mision) y
// los descartes se guardan por nombre LOCAL — los aprendidos contra la
// tabla de la Academia habrían mutilado los envíos a la tabla nueva.
// La escalera reaprende en una sesión y vuelve el silencio.
const DROPPED_COLUMNS_KEY = "lemgil_sync_dropped_columns_v2";

/** Serializa el mapa de descartes para guardarlo (pura, probada). */
export function serializarColumnasDescartadas(mapa: Map<SyncTableName, Set<string>>): string {
  const obj: Record<string, string[]> = {};
  for (const [tabla, columnas] of mapa) obj[tabla] = [...columnas];
  return JSON.stringify(obj);
}

/** Lee el mapa de descartes guardado; cualquier daño se lee como vacío (pura, probada). */
export function leerColumnasDescartadas(raw: string | null): Map<SyncTableName, Set<string>> {
  const mapa = new Map<SyncTableName, Set<string>>();
  if (!raw) return mapa;
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    for (const [tabla, columnas] of Object.entries(obj)) {
      if (Array.isArray(columnas)) {
        mapa.set(tabla as SyncTableName, new Set(columnas.filter((c): c is string => typeof c === "string")));
      }
    }
  } catch { /* guardado dañado: se empieza de cero y la escalera re-aprende */ }
  return mapa;
}

function cargarColumnasDescartadas(): Map<SyncTableName, Set<string>> {
  try {
    return leerColumnasDescartadas(localStorage.getItem(DROPPED_COLUMNS_KEY));
  } catch {
    return new Map();
  }
}

const droppedColumns = cargarColumnasDescartadas();

function noteDroppedColumn(table: SyncTableName, column: string): void {
  let set = droppedColumns.get(table);
  if (!set) {
    set = new Set<string>();
    droppedColumns.set(table, set);
  }
  if (set.has(column)) return;
  set.add(column);
  try {
    localStorage.setItem(DROPPED_COLUMNS_KEY, serializarColumnasDescartadas(droppedColumns));
  } catch { /* sin almacenamiento disponible: el descarte vive en memoria esta sesión */ }
}

export function applyDroppedColumns(table: SyncTableName, row: Record<string, unknown>): Record<string, unknown> {
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
/**
 * Deja un lote listo para UN solo upsert: Postgres rechaza la orden
 * entera («ON CONFLICT DO UPDATE command cannot affect row a second
 * time») si dos filas llevan la misma llave. La llave se compara como
 * texto — un id numérico 1 y uno de texto "1" (restos de bajadas
 * viejas de tablas compartidas) chocan igual. Gana la versión mayor;
 * en empate, la última. Las filas sin id pasan tal cual. (Pura.)
 */
export function dedupirPorId(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const porId = new Map<string, Record<string, unknown>>();
  const sinId: Record<string, unknown>[] = [];
  for (const row of rows) {
    if (row.id == null) { sinId.push(row); continue; }
    const clave = String(row.id);
    const previa = porId.get(clave);
    if (!previa || ((row.version as number) || 0) >= ((previa.version as number) || 0)) {
      porId.set(clave, row);
    }
  }
  return [...sinId, ...porId.values()];
}

export async function forceFullPush(): Promise<SyncError[]> {
  const errors: SyncError[] = [...(await pushTombstones())];
  for (const table of SYNC_TABLES) {
    try {
      const localData = await tableMap[table].toArray();
      if (localData.length === 0) continue;
      const cleaned = localData.map((r) => cleanForPush(table, r));
      const lowerData = dedupirPorId(toLowerCaseKeys(cleaned) as Record<string, unknown>[]);
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

/**
 * Foto de los ids que el servidor tenía por tabla en la última bajada
 * buena (localStorage). Es la base SEGURA de la reconciliación: solo
 * puede desaparecer de este equipo lo que la foto prueba que estuvo
 * en el servidor y ya no está — un registro creado aquí y nunca
 * subido jamás estuvo en la foto, así que nunca se reconcilia.
 */
const REMOTOS_KEY = "lemgil_sync_remotos_v1";

export function leerRemotos(raw: string | null): Partial<Record<SyncTableName, string[]>> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Partial<Record<SyncTableName, string[]>> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(v)) {
        out[k as SyncTableName] = v.filter((x): x is string => typeof x === "string");
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function serializarRemotos(mapa: Partial<Record<SyncTableName, readonly string[]>>): string {
  return JSON.stringify(mapa);
}

function cargarRemotos(): Partial<Record<SyncTableName, string[]>> {
  try {
    return leerRemotos(localStorage.getItem(REMOTOS_KEY));
  } catch {
    return {};
  }
}

function guardarRemotos(mapa: Partial<Record<SyncTableName, string[]>>): void {
  try {
    localStorage.setItem(REMOTOS_KEY, serializarRemotos(mapa));
  } catch { /* sin consecuencias: sin foto no se reconcilia nada */ }
}

/**
 * Ids locales que la reconciliación debe retirar: estaban en la foto
 * remota anterior, ya no están en la remota actual y no esperan para
 * subir. Todo lo demás se queda. (Función pura, probada.)
 */
export function idsAReconciliar(
  locales: readonly string[],
  remotosAntes: readonly string[],
  remotosAhora: ReadonlySet<string>,
  pendientes: ReadonlySet<string>,
): string[] {
  const antes = new Set(remotosAntes);
  return locales.filter((id) => antes.has(id) && !remotosAhora.has(id) && !pendientes.has(id));
}

export async function pullFromSupabase(): Promise<SyncError[]> {
  const errors: SyncError[] = [];
  const tombs = new Set((await getTombstones()).map((t) => `${t.table}:${t.recordId}`));
  const absorbidas = getPersonasAbsorbidas();
  const pendientesPorTabla = new Map<SyncTableName, Set<string>>();
  for (const e of await getOutbox()) {
    let s = pendientesPorTabla.get(e.table);
    if (!s) { s = new Set(); pendientesPorTabla.set(e.table, s); }
    s.add(e.recordId);
  }
  const remotos = cargarRemotos();
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
      // Sin filas no hay información: no se reconcilia ni se toca la
      // foto guardada (una tabla vacía por un fallo no puede vaciar
      // este equipo).
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
        // Una persona absorbida por «Unir personas» en este equipo no
        // vuelve a bajar, aunque otro equipo la haya resucitado.
        if (table === "personas" && absorbidas.has(record.id)) continue;
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

      // Reconciliación de borrados: lo que estaba en el servidor en la
      // bajada anterior, ya no está y no espera para subir, fue
      // borrado o unido en otro equipo — se retira también de este.
      // (La bajada corre bajo setApplyingRemote: retirar no encola
      // nada, porque en el servidor ya no existe.)
      const remotosAhora = new Set(
        normalized.map((r) => r.id).filter((id): id is string => typeof id === "string"),
      );
      const aBorrar = idsAReconciliar(
        existingRecords.map((r) => r.id as string),
        remotos[table] ?? [],
        remotosAhora,
        pendientesPorTabla.get(table) ?? new Set<string>(),
      );
      if (table === "personas") {
        for (const r of existingRecords) {
          const id = r.id as string;
          if (absorbidas.has(id) && !aBorrar.includes(id)) aBorrar.push(id);
        }
      }
      if (aBorrar.length > 0) {
        try {
          await tableInstance.bulkDelete(aBorrar);
        } catch (err: unknown) {
          errors.push({ table, message: err instanceof Error ? err.message : String(err) });
        }
      }
      remotos[table] = [...remotosAhora];
    }
    guardarRemotos(remotos);
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
 * Sincronización total forzada (botón «Forzar Sync Total»): baja primero
 * (retira lo que otro equipo ya borró o unió), sube todas las tablas
 * completas y baja de nuevo. Lanza un Error con el resumen si algo
 * falló — el éxito que anuncia la interfaz es real.
 */
export async function forcePushAllLocal(): Promise<void> {
  // La bajada va PRIMERO: sin ella, la subida total resucitaba en el
  // servidor las fichas que otro equipo ya había unido o borrado, y
  // volvían a bajar a todos («volvía a estar dividido», 2026-11-16).
  const errors = [
    ...(await pullFromSupabase()),
    ...(await forceFullPush()),
    ...(await pullFromSupabase()),
  ];
  if (errors.length > 0) {
    // El error también va al ESTADO del indicador (2026-11-16): antes
    // solo salía el toast y la pastilla se quedaba en verde «Synced»
    // aunque la subida hubiera fallado — LemGil lo reportó: «da el
    // error pero sigue en verde siempre». Ahora la pastilla se pone
    // roja y su panel muestra la lista, igual que en el ciclo normal.
    emitStatus({ error: summarizeErrors(errors), errors, pending: await getPendingCount() });
    throw new Error(summarizeErrors(errors));
  }
  emitStatus({ lastSync: saveLastSync(), error: "", errors: [], pending: 0 });
}

export async function testConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from("conversiones").select("id", { count: "exact", head: true });
    if (error) {
      emitStatus({ connected: false, error: error.message });
      return false;
    }
    // Al conectar NO se limpia `error`: ese campo es del RESULTADO
    // del ciclo, no de la conexión — limpiarlo aquí borraba la roja
    // del indicador al arrancar el ciclo siguiente, antes de que el
    // ciclo dijera su palabra (la otra mitad del «siempre verde»).
    emitStatus({ connected: true });
    return true;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    emitStatus({ connected: false, error: errorMsg });
    return false;
  }
}
