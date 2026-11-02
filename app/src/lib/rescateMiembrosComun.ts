import type { Transaction } from 'dexie';
import { v4 as uuid } from 'uuid';
import { dedupeKey } from './csvImport';
import type { Colaborador } from './types';

/**
 * P7 — ARREGLO FINAL (ficha única), Parte C: rescate de la tabla fantasma
 * `miembrosComun` antes de retirarla. La colección no tenía ninguna
 * pantalla (la Red de Colaboradores siempre vivió en `colaboradores`),
 * pero podía guardar filas llegadas por sync o por importaciones CSV
 * viejas: ninguna fila rescatable se pierde — se pliegan en
 * `colaboradores`, que es donde la Red las lee.
 *
 * Función PURA (sin base de datos): la usa el upgrade de la Dexie v23 y
 * las pruebas. Criterio de duplicado: la MISMA clave de persona del CSV
 * (nombre+apellido+teléfono, normalizada con dígitos para el teléfono —
 * `dedupeKey('colaboradores', …)`). Si ya existe un colaborador con esa
 * clave, la fila fantasma NO se duplica (gana la de la Red, que es la
 * viva). Si no existe, se inserta CONSERVANDO su id; solo si ese id ya
 * está ocupado por otro colaborador se genera uno nuevo (`generarId`).
 * Las filas sin clave (sin nombre ni teléfono) no se pueden declarar
 * duplicadas: se insertan siempre.
 */
export interface ResultadoRescateMiembrosComun {
  /** Filas a insertar en `colaboradores` (con su id definitivo). */
  aInsertar: Colaborador[];
  /** Filas descartadas por duplicar a un colaborador (existente o ya rescatado). */
  duplicados: number;
}

export function plegarMiembrosComun(
  fantasma: Colaborador[],
  existentes: Colaborador[],
  generarId: () => string,
): ResultadoRescateMiembrosComun {
  const clavesVistas = new Set<string>();
  for (const c of existentes) {
    const k = dedupeKey('colaboradores', c as unknown as Record<string, unknown>);
    if (k) clavesVistas.add(k);
  }
  const idsUsados = new Set(existentes.map((c) => c.id));
  const aInsertar: Colaborador[] = [];
  let duplicados = 0;

  for (const fila of fantasma) {
    const clave = dedupeKey('colaboradores', fila as unknown as Record<string, unknown>);
    if (clave && clavesVistas.has(clave)) {
      duplicados++;
      continue;
    }
    let id = fila.id;
    if (!id || idsUsados.has(id)) id = generarId();
    idsUsados.add(id);
    if (clave) clavesVistas.add(clave);
    aInsertar.push({ ...fila, id });
  }
  return { aInsertar, duplicados };
}

/**
 * El rescate dentro del upgrade de la Dexie v23 (database.ts lo invoca
 * con import dinámico; las pruebas lo ejercitan sobre una base de
 * ensayo con la misma declaración de versiones). Lee la tabla que se
 * está eliminando — el upgrade de la versión que la retira aún puede
 * leerla —, pliega sus filas en `colaboradores` y encola las rescatadas
 * en la bandeja de salida para que suban a la nube como colaboradores.
 * Devuelve cuántas filas se rescataron.
 */
export async function rescatarMiembrosComunEnUpgrade(tx: Transaction): Promise<number> {
  const filas = (await tx.table('miembrosComun').toArray()) as Colaborador[];
  if (filas.length === 0) return 0;
  const existentes = (await tx.table('colaboradores').toArray()) as Colaborador[];
  const { aInsertar } = plegarMiembrosComun(filas, existentes, () => uuid());
  if (aInsertar.length === 0) return 0;
  await tx.table('colaboradores').bulkAdd(aInsertar);
  try {
    const cola = tx.table('syncQueue');
    const yaEncolados = new Set(
      (await cola.toArray()).filter((e: any) => e.table === 'colaboradores').map((e: any) => e.recordId),
    );
    const entradas = aInsertar
      .filter((c) => !yaEncolados.has(c.id))
      .map((c) => ({ table: 'colaboradores', recordId: c.id, ts: Date.now() }));
    if (entradas.length) await cola.bulkAdd(entradas);
  } catch {
    // La bandeja es de mejor esfuerzo: el rescate de los datos ya quedó
    // hecho, y el sync forzado cubre la subida si esta cola fallara.
  }
  return aInsertar.length;
}
