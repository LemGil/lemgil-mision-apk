import { db } from './database';
import { today } from './utils';
import { PS_APARTADO, PS_FALLECIDO, PS_TRASLADO, esSalida, idCanonico } from './pasosMision';
import type { Miembro, PasoSeguimiento } from './types';

/**
 * Este módulo nació con la propagación B2 («sin pisar») entre la ficha de
 * la conversión y la del miembro. Con la ficha única (P2) esa propagación
 * se JUBILÓ: los datos personales viven una sola vez en el núcleo
 * `personas` y ambas páginas los leen de ahí (lib/personaDatos.ts), así
 * que ya no hay dos copias que mantener en acuerdo.
 *
 * Sobreviven los reflejos B3, que son reglas del PROCESO, no de la
 * copia — por eso el diseño (§6, P2) los conserva: las SALIDAS de la
 * conversión se reflejan en el estado del miembro (abajo), y el
 * Fallecido/Trasladado puesto a mano en el miembro se refleja en su
 * conversión vinculada (sentido inverso).
 */

/**
 * B3 (conversión → miembro): el estado que el miembro debe tomar cuando
 * su conversión entra en una SALIDA del catálogo de Misión; null si la
 * conversión no está en una salida o el miembro ya está como debe.
 *
 * - Fallecido → «Fallecido» (manda sobre cualquier estado previo).
 * - Trasladado → «Trasladado» (ídem; el estado del miembro ya existía,
 *   pero la cadena nunca lo alimentaba).
 * - Apartado → «Inactivo», y SOLO desde «Activo»: no pisa un
 *   Disciplinado, un Trasladado o un Fallecido ya registrados.
 * - Cualquier OTRA salida (las que la iglesia crea en el editor) →
 *   «Inactivo» con la misma guarda: es el reflejo genérico acordado.
 */
export function reflejoDeSalidaEnMiembro(
  estadoConversion: string,
  pasos: PasoSeguimiento[] | undefined,
  estadoMiembro: Miembro['estado'],
): Miembro['estado'] | null {
  const id = idCanonico(estadoConversion);
  if (id === PS_FALLECIDO) return estadoMiembro !== 'Fallecido' ? 'Fallecido' : null;
  if (id === PS_TRASLADO) return estadoMiembro !== 'Trasladado' ? 'Trasladado' : null;
  if (id === PS_APARTADO) return estadoMiembro === 'Activo' ? 'Inactivo' : null;
  if (esSalida(pasos, id)) return estadoMiembro === 'Activo' ? 'Inactivo' : null;
  return null;
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
  // Fase 2: la conversión guarda la IDENTIDAD del paso de salida
  // ('ps-fallecido'); el alias tolera fichas aún con la etiqueta vieja.
  if (conv && idCanonico(conv.estado) !== PS_FALLECIDO) {
    await db.conversiones.update(miembro.conversionId, {
      estado: PS_FALLECIDO,
      historial: [...conv.historial, { fecha: today(), estado: PS_FALLECIDO, nota: 'Marcado fallecido desde Miembros' }],
    });
  }
}

/**
 * B3 (sentido inverso) — Si el miembro quedó «Trasladado» (puesto a mano
 * en su formulario), reflejarlo en su conversión vinculada: la
 * conversión pasa a la salida `ps-traslado` y gana una entrada en su
 * historial con la fecha de hoy. Es el espejo de
 * `reflejarFallecimientoEnConversion` y lo usa `guardarMiembro`. Si la
 * conversión ya estaba en Trasladado, no se duplica la entrada.
 */
export async function reflejarTrasladoEnConversion(
  miembro: Pick<Miembro, 'estado' | 'conversionId'>,
): Promise<void> {
  if (miembro.estado !== 'Trasladado' || !miembro.conversionId) return;
  const conv = await db.conversiones.get(miembro.conversionId);
  if (conv && idCanonico(conv.estado) !== PS_TRASLADO) {
    await db.conversiones.update(miembro.conversionId, {
      estado: PS_TRASLADO,
      historial: [...conv.historial, { fecha: today(), estado: PS_TRASLADO, nota: 'Marcado trasladado desde Miembros' }],
    });
  }
}
