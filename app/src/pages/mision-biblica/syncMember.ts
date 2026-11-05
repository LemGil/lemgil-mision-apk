import { v4 as uuid } from 'uuid';
import { db } from '../../lib/database';
import { createBaseRecord } from '../../lib/utils/recordHelpers';
import { today } from '../../lib/utils';
import { showToast } from '../../lib/notification';
import { asegurarPersonaDeConversion } from '../../lib/personas';
import { esGozne, tipoHitoDe } from '../../lib/pasosMision';
import type { Conversion, Miembro } from '../../lib/types';

/**
 * Al llegar una conversión a «Integrado» nace su proceso Miembro.
 *
 * P2 (ficha única): el miembro nace sobre la MISMA persona que la
 * conversión (el mismo `personaId`) y NO copia ningún dato personal: la
 * identidad vive una sola vez en `personas` y Miembros la lee del núcleo
 * (lib/personaDatos.ts). Con eso desaparecen la copia de 16 campos, la
 * adopción por nombre/teléfono (A2: su motivo era que había dos fichas)
 * y la propagación B2. Quedan las reglas del proceso:
 * - A1: la bandera `miembroDescartado` sigue mandando (no resucitar).
 * - A4: `fechaIngreso` = fecha real de integración (historial o hoy).
 * - Si la persona YA tiene proceso miembro (creado a mano sobre la
 *   misma persona), se enlaza ese (`conversionId`) en vez de duplicarlo:
 *   es el sucesor de la adopción, ahora por identidad y no por parecido.
 * - Una conversión sin persona (vieja o de un equipo sin actualizar) la
 *   asegura con la regla determinista de la migración (lib/personas.ts).
 */
export const syncMemberFromConversion = async (c: Conversion): Promise<string | null> => {
  // Fase 2: el miembro nace al llegar al paso-GOZNE del catálogo, sea
  // cual sea su etiqueta viva ('ps-integrado' por identidad; el alias
  // tolera fichas aún con la etiqueta vieja).
  const pasos = await db.pasosSeguimiento.toArray();
  if (!esGozne(pasos, c.estado)) return null;
  // A1: si el miembro de esta conversión fue eliminado a propósito, no recrearlo.
  if (c.miembroDescartado) return null;
  const existing = await db.miembros.where('conversionId').equals(c.id).first();
  if (existing) return null;
  const now = new Date().toISOString();
  // A4: el ingreso es la fecha en que llegó al gozne según el historial;
  // si el historial no lo registra, hoy. Nunca la fecha de conversión.
  const fechaIngreso = c.historial?.find((h) => esGozne(pasos, h.estado))?.fecha || today();

  // La persona de la conversión (las altas nuevas ya nacen enlazadas; una
  // ficha vieja puede no traerla y se asegura aquí, sin copiar nada).
  const personaId = await asegurarPersonaDeConversion(c);
  const persona = await db.personas.get(personaId);
  const mentor = persona?.hermanoMayorId ? await db.personas.get(persona.hermanoMayorId) : undefined;
  const nombreMentor = mentor ? `${mentor.nombre} ${mentor.apellido}`.trim() : (c.lider || '');
  const descripcionHito = `Integrado a la iglesia${nombreMentor ? ` · Disciplinado por ${nombreMentor}` : ''}`;

  // Sucesor de A2: la persona ya tiene su proceso miembro → enlazarlo.
  const deLaPersona = await db.miembros.where('personaId').equals(personaId).first();
  if (deLaPersona) {
    await db.miembros.update(deLaPersona.id, { conversionId: c.id, actualizado: now });
    await db.hitos.add(createBaseRecord({
      id: uuid(),
      miembroId: deLaPersona.id,
      fecha: fechaIngreso,
      tipo: tipoHitoDe(c.estado),
      descripcion: descripcionHito,
      creado: now,
    }));
    const nombre = persona ? `${persona.nombre} ${persona.apellido}` : 'La persona';
    showToast(`🔗 ${nombre} se vinculó con su miembro ya existente`, 'info');
    return deLaPersona.id;
  }

  const miembroId = uuid();
  const nuevoMiembro: Miembro = {
    id: miembroId,
    // El proceso NO guarda datos personales: quedan vacíos a propósito.
    // La identidad se lee del núcleo por `personaId` (lib/personaDatos.ts).
    nombre: '',
    apellido: '',
    telefono: '',
    email: '',
    direccion: '',
    zona: '',
    grupoId: null,
    fechaNacimiento: '',
    fechaIngreso,
    estado: 'Activo',
    contactoPreferido: 'WhatsApp',
    profesion: '',
    estadoCivil: 'Soltero',
    bautizado: false,
    fechaBautismo: '',
    conyuge: '',
    hijos: '',
    hermanoMayorId: null,
    conversionId: c.id,
    personaId,
    notas: '',
    creado: now,
    actualizado: now,
    version: 1,
  };
  await db.miembros.add(createBaseRecord(nuevoMiembro));
  await db.hitos.add(createBaseRecord({
    id: uuid(),
    miembroId,
    fecha: fechaIngreso,
    tipo: tipoHitoDe(c.estado),
    descripcion: descripcionHito,
    creado: now,
  }));
  return miembroId;
};
