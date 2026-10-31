import { v4 as uuid } from 'uuid';
import { db } from '../../lib/database';
import { createBaseRecord } from '../../lib/utils/recordHelpers';
import type { Conversion } from '../../lib/types';

export const syncMemberFromConversion = async (c: Conversion): Promise<string | null> => {
  if (c.estado !== 'Integrado') return null;
  const existing = await db.miembros.where('conversionId').equals(c.id).first();
  if (existing) return null;
  const now = new Date().toISOString();
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
    fechaIngreso: c.fecha || now.split('T')[0],
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
    fecha: c.fecha || now.split('T')[0],
    tipo: 'Integración',
    descripcion: `Integrado a la iglesia${c.lider ? ` · Disciplinado por ${c.lider}` : ''}`,
    creado: now,
  }));
  return miembroId;
}
