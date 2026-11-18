import type { Dexie } from 'dexie';

/**
 * El respaldo COMPLETO de la base local en un solo JSON: la materia prima de
 * la migración única a la app nueva. Incluye todas las tablas de datos con
 * sus ids y enlaces — los CSV por módulo no sirven para migrar, porque no
 * traen ids ni enlaces entre fichas.
 */
export type RespaldoCompleto = Record<string, unknown[]>;

// Infraestructura de sincronización: no son datos del ministerio.
const TABLAS_INFRAESTRUCTURA = new Set(['syncQueue', 'syncTombstones']);

export async function construirRespaldo(base: Dexie): Promise<RespaldoCompleto> {
  const respaldo: RespaldoCompleto = {};
  for (const tabla of base.tables) {
    if (TABLAS_INFRAESTRUCTURA.has(tabla.name)) continue;
    respaldo[tabla.name] = await tabla.toArray();
  }
  return respaldo;
}

export function descargarRespaldo(respaldo: RespaldoCompleto, fecha = new Date()): void {
  const blob = new Blob([JSON.stringify(respaldo, null, 1)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `respaldo-mision-${fecha.toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
