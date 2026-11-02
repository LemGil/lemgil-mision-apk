import { db } from './database';
import { today } from './utils';
import type { Conversion, Miembro } from './types';

/**
 * Este módulo nació con la propagación B2 («sin pisar») entre la ficha de
 * la conversión y la del miembro. Con la ficha única (P2) esa propagación
 * se JUBILÓ: los datos personales viven una sola vez en el núcleo
 * `personas` y ambas páginas los leen de ahí (lib/personaDatos.ts), así
 * que ya no hay dos copias que mantener en acuerdo.
 *
 * Sobrevive el reflejo B3 en sentido inverso, que es una regla del
 * PROCESO, no de la copia — por eso el diseño (§6, P2) lo conserva:
 */

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
