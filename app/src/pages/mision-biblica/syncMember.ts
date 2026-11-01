import { v4 as uuid } from 'uuid';
import { db } from '../../lib/database';
import { createBaseRecord } from '../../lib/utils/recordHelpers';
import { today } from '../../lib/utils';
import { showToast } from '../../lib/notification';
import type { Conversion } from '../../lib/types';

export const syncMemberFromConversion = async (c: Conversion): Promise<string | null> => {
  if (c.estado !== 'Integrado') return null;
  // A1: si el miembro de esta conversión fue eliminado a propósito, no recrearlo.
  if (c.miembroDescartado) return null;
  const existing = await db.miembros.where('conversionId').equals(c.id).first();
  if (existing) return null;
  const now = new Date().toISOString();
  // A4: el ingreso es la fecha en que llegó a «Integrado» según el historial;
  // si el historial no lo registra, hoy. Nunca la fecha de conversión (por eso
  // no se usa fechaDeEstado, cuyo respaldo histórico es c.fecha).
  const fechaIngreso = c.historial?.find((h) => h.estado === 'Integrado')?.fecha || today();
  const descripcionHito = `Integrado a la iglesia${c.lider ? ` · Disciplinado por ${c.lider}` : ''}`;

  // A2: si ya existe un miembro creado a mano con el mismo nombre, apellido y
  // teléfono (y sin vínculo), se adopta en vez de duplicar a la persona.
  const telefono = (c.telefono || '').trim();
  if (telefono) {
    const candidato = await db.miembros
      .filter((m) => !m.conversionId
        && m.nombre === c.nombre
        && m.apellido === c.apellido
        && (m.telefono || '').trim() === telefono)
      .first();
    if (candidato) {
      await db.miembros.update(candidato.id, { conversionId: c.id, actualizado: now });
      await db.hitos.add(createBaseRecord({
        id: uuid(),
        miembroId: candidato.id,
        fecha: fechaIngreso,
        tipo: 'Integración',
        descripcion: descripcionHito,
        creado: now,
      }));
      showToast(`🔗 ${c.nombre} ${c.apellido} se vinculó con su miembro ya existente`, 'info');
      return candidato.id;
    }
  }

  const miembroId = uuid();
  await db.miembros.add(createBaseRecord({
    id: miembroId,
    nombre: c.nombre,
    apellido: c.apellido,
    telefono: c.telefono || '',
    email: c.email || '',
    direccion: c.direccion || '',
    zona: c.zona || '',
    fechaNacimiento: '',
    fechaIngreso,
    estado: 'Activo',
    contactoPreferido: 'WhatsApp',
    profesion: c.profesion || '',
    estadoCivil: 'Soltero',
    bautizado: c.bautizado || false,
    fechaBautismo: c.fechaBautismo || '',
    conyuge: c.conyuge || '',
    hijos: c.hijos || '',
    conversionId: c.id,
    hermanoMayorId: c.hermanoMayorId || null,
    grupoId: c.grupoId || null,
    notas: c.notas || '',
    creado: now,
    actualizado: now,
  }));
  await db.hitos.add(createBaseRecord({
    id: uuid(),
    miembroId,
    fecha: fechaIngreso,
    tipo: 'Integración',
    descripcion: descripcionHito,
    creado: now,
  }));
  return miembroId;
}
