import { supabase } from "../supabase";
import { db } from "../database";
import { emitStatus } from "./status";
import { getDeletedIds, unmarkDeleted } from "./queue";

export const SYNC_TABLES = [
  "conversiones", "grupos", "evangelismos", "cursos", "lecciones",
  "estudiantes", "certificados", "dadores", "aportes", "beneficiarios",
  "campanas", "entregas", "metas", "negocios", "publicaciones",
  "reportes", "miembrosComun", "aportesComun", "miembros",
  "ministerios", "miembrosMinisterios", "hitos", "zonas", "colaboradores",
  "tiposPlanes", "planesColaborador",
] as const;

const DEXIE_TO_SUPABASE: Record<string, string> = {
  miembrosComun: "miembroscomun",
  aportesComun: "aportescomun",
  miembrosMinisterios: "miembrosministerios",
  tiposPlanes: "tiposplanes",
  planesColaborador: "planescolaborador",
};

function toSupabase(name: string): string {
  return DEXIE_TO_SUPABASE[name] || name;
}

export function toLowerCaseKeys(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toLowerCaseKeys);
  if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    return Object.keys(obj).reduce((acc, key) => {
      acc[key.toLowerCase()] = toLowerCaseKeys(obj[key]);
      return acc;
    }, {} as any);
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

function toCamelCaseKeys(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toCamelCaseKeys);
  if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = SUPABASE_TO_DEXIE[key] || key;
      acc[camelKey] = toCamelCaseKeys(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}

async function bulkUpsertAll(force: boolean) {
  for (const [key, entry] of Object.entries(getDeletedIds())) {
    const { error } = await supabase.from(toSupabase(entry.table)).delete().eq("id", key.split(":")[1]);
    if (!error) unmarkDeleted(entry.table, key.split(":")[1]);
  }
  let total = 0;
  for (const table of SYNC_TABLES) {
    const supaTable = toSupabase(table);
    try {
      const localData = await (db as any)[table].toArray();
      if (localData.length === 0) continue;
      const cleaned = localData.map((r: any) => {
        const { _primKey, updatedAt: _u, ...rest } = r;
        if (table === "dadores") delete (rest as any).base;
        if (table === "colaboradores" && rest.planOfrendaMonto == null) rest.planOfrendaMonto = 0;
        delete rest.codigo;
        return rest;
      });
      if (force) {
        const { error } = await supabase.from(supaTable).upsert(toLowerCaseKeys(cleaned));
        if (error) continue;
      } else {
        for (const record of cleaned) {
          const version = record.version || 1;
          const { error } = await supabase
            .from(supaTable)
            .upsert(toLowerCaseKeys({ ...record, version }))
            .eq("id", record.id)
            .eq("version", version);
          if (error) continue;
        }
      }
      total += cleaned.length;
    } catch (err: any) { console.warn(`[Sync] ✗ Excepción en ${table}:`, err.message); }
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
    const { data, error } = await supabase.from(supaTable).select("*");
    if (error || !data || data.length === 0) continue;

    const normalized = toCamelCaseKeys(data);
    const existingIds = new Set((await (db as any)[table].toArray()).map((r: any) => r.id));
    const deletedIds = getDeletedIds();

    const toAdd = normalized.filter((r: any) => r.id && !existingIds.has(r.id) && !deletedIds[table + ":" + r.id]);
    const toUpdate = normalized.filter((r: any) => r.id && existingIds.has(r.id));

    if (toAdd.length > 0) await (db as any)[table].bulkAdd(toAdd as any[]);

    for (const record of toUpdate) {
      try {
        const existing = await (db as any)[table].get(record.id);
        if (existing) {
          const localVersion = existing.version || 0;
          const remoteVersion = record.version || 0;
          if (remoteVersion <= localVersion) continue;
          await (db as any)[table].update(record.id, record);
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
  } catch (err: any) {
    emitStatus({ connected: false, error: err.message });
    return false;
  }
}
