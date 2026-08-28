/**
 * Utilidad para sincronizar conversiones con miembros
 * Cuando una conversión alcanza el estado "Integrado", crea automáticamente
 * un miembro en la base de datos con sus hitos correspondientes
 */

import { v4 as uuid } from 'uuid';
import { db } from '../../../lib/database';
import type { Conversion } from '../../types/mision';
import type { Miembro, Hito } from '../../../lib/types';

/**
 * Sincroniza una conversión con la tabla de miembros
 * Solo crea el miembro si el estado es "Integrado" y no existe ya
 * @returns El ID del miembro creado, o null si no se creó
 */
export async function syncMemberFromConversion(c: Conversion): Promise<string | null> {
  if (c.estado !== 'Integrado') return null;
  
  // Verificar si ya existe un miembro vinculado a esta conversión
  const existing = await db.miembros.where('conversionId').equals(c.id).first();
  if (existing) return null;
  
  const now = new Date().toISOString();
  const miembroId = uuid();
  
  // Crear el miembro
  const nuevoMiembro: Omit<Miembro, 'id'> = {
    nombre: c.nombre,
    apellido: c.apellido,
    telefono: c.telefono || '',
    email: c.email || '',
    direccion: c.direccion || '',
    zona: c.zona || '',
    grupoId: c.grupoId || null,
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
    hermanoMayorId: c.hermanoMayorId || null,
    conversionId: c.id,
    notas: c.notas || '',
    creado: now,
    actualizado: now,
  };
  
  await db.miembros.add({
    id: miembroId,
    ...nuevoMiembro
  });
  
  // Crear el hito de integración
  const hito: Omit<Hito, 'id'> = {
    miembroId,
    fecha: c.fecha || now.split('T')[0],
    tipo: 'Integración',
    descripcion: `Integrado a la iglesia${c.lider ? ` · Disciplinado por ${c.lider}` : ''}`,
    creado: now,
  };
  
  await db.hitos.add({
    id: uuid(),
    ...hito
  });
  
  return miembroId;
}

/**
 * Formatea una fecha ISO a formato legible
 * Ej: "2024-03-15" → "15 mar 2024"
 */
export function fmt(d: string): string {
  if (!d) return '—';
  const [y, m, dy] = d.split('-');
  const ms = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${+dy} ${ms[+m - 1]} ${y}`;
}

/**
 * Obtiene la fecha actual en formato ISO (YYYY-MM-DD)
 */
export function today(): string {
  return new Date().toISOString().split('T')[0];
}
