import { db } from './database';
import { today } from './utils';
import type { Conversion, Miembro } from './types';

/** Campos compartidos Conversión ↔ Miembro que B2 sabe propagar. */
export const CAMPOS_COMPARTIDOS = [
  'nombre',
  'apellido',
  'telefono',
  'email',
  'direccion',
  'zona',
  'profesion',
  'bautizado',
  'fechaBautismo',
  'conyuge',
  'hijos',
  'grupoId',
  'hermanoMayorId',
] as const;

export type CampoCompartido = (typeof CAMPOS_COMPARTIDOS)[number];

/**
 * Normaliza para comparar: `null`/`undefined` valen como cadena vacía.
 * La copia que hace syncMember guarda `grupoId`/`hermanoMayorId` como
 * `null` cuando la conversión trae `''`, así que sin esto un campo
 * «vacío en ambos» parecería editado a mano en el miembro.
 */
const norm = (v: unknown): unknown => (v === null || v === undefined ? '' : v);

/** Valor a escribir en el miembro: `''` en los ids vuelve a ser `null`. */
const valorParaMiembro = (campo: CampoCompartido, v: unknown): unknown =>
  (campo === 'grupoId' || campo === 'hermanoMayorId') && (v === '' || v === null || v === undefined)
    ? null
    : v;

/**
 * B2 — Propagación Conversión → Miembro «sin pisar».
 *
 * Devuelve solo los campos compartidos que cumplen las dos condiciones:
 *  1. El valor CAMBIÓ entre la conversión antes y después del guardado.
 *  2. El valor actual en el miembro sigue siendo el que tenía la
 *     conversión ANTES (nadie lo editó por su cuenta en Miembros);
 *     si el miembro divergió a mano, se respeta y no se incluye.
 *
 * Las «notas» NO se propagan nunca: en la conversión son el contacto
 * inicial y en el miembro son notas pastorales (semánticas distintas);
 * solo se copian al crear el miembro, como hace syncMember.
 */
export function camposAPropagar(
  convAntes: Conversion,
  convDespues: Conversion,
  miembro: Miembro,
): Partial<Miembro> {
  const cambios: Partial<Miembro> = {};
  for (const campo of CAMPOS_COMPARTIDOS) {
    const antes = norm(convAntes[campo]);
    const despues = norm(convDespues[campo]);
    if (antes === despues) continue; // sin cambio en la conversión
    if (norm(miembro[campo]) !== antes) continue; // editado en Miembros: se respeta
    (cambios as Record<string, unknown>)[campo] = valorParaMiembro(campo, convDespues[campo]);
  }
  return cambios;
}

/**
 * B3 (sentido inverso) — Si el miembro quedó «Fallecido», reflejarlo en
 * su conversión vinculada: la conversión pasa a «Fallecido» y gana una
 * entrada en su historial con la fecha de hoy.
 *
 * La usan los dos caminos que marcan el fallecimiento de un miembro:
 * `guardarMiembro` (formulario de Miembros) y el botón «Registrar
 * Fallecimiento» del detalle del miembro — un solo lugar para la regla,
 * para que ambos produzcan exactamente el mismo efecto. Si la
 * conversión ya estaba «Fallecido», no se duplica la entrada.
 */
export async function reflejarFallecimientoEnConversion(
  miembro: Pick<Miembro, 'estado' | 'conversionId'>,
): Promise<void> {
  if (miembro.estado !== 'Fallecido' || !miembro.conversionId) return;
  const conv = await db.conversiones.get(miembro.conversionId);
  if (conv && conv.estado !== 'Fallecido') {
    await db.conversiones.update(miembro.conversionId, {
      estado: 'Fallecido' as Conversion['estado'],
      historial: [...conv.historial, { fecha: today(), estado: 'Fallecido', nota: 'Marcado fallecido desde Miembros' }],
    });
  }
}
