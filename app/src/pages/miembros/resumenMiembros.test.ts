import { describe, it, expect } from 'vitest';
import { cumplesDeMiembros, esSalidaMiembro, fotoEscalera, idsMiembrosEnCasa } from './resumenMiembros';
import type { Miembro, MiembroMinisterio, Persona } from '../../lib/types';

const miembro = (over: Partial<Miembro> = {}): Miembro => ({
  id: 'm1', nombre: '', apellido: '', telefono: '', email: '', direccion: '', zona: '',
  grupoId: null, fechaNacimiento: '', fechaIngreso: '2024-02-01', estado: 'Activo',
  contactoPreferido: 'WhatsApp', profesion: '', estadoCivil: 'Soltero',
  bautizado: false, fechaBautismo: '', conyuge: '', hijos: '', hermanoMayorId: null,
  conversionId: null, personaId: 'p1', notas: '',
  creado: '2024-02-01T00:00:00.000Z', actualizado: '2024-02-01T00:00:00.000Z', version: 1,
  ...over,
});

const persona = (over: Partial<Persona> = {}): Persona => ({
  id: 'p1', nombre: 'María', apellido: 'González', numeroIdentidad: '', telefono: '',
  email: '', direccion: '', zona: '', fechaNacimiento: '', profesion: '',
  estadoCivil: 'Soltero', contactoPreferido: 'WhatsApp', bautizado: false,
  fechaBautismo: '', conyuge: '', hijos: '', grupoId: null, hermanoMayorId: null,
  creado: '2024-01-01T00:00:00.000Z', version: 1, ...over,
});

/** Fecha de nacimiento cuyo próximo cumpleaños cae en ~10 días. */
const nacEn10Dias = () => {
  const d = new Date();
  d.setDate(d.getDate() + 10);
  return `1990-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

describe('resumenMiembros — la foto de la página (2026-11-17)', () => {
  it('esSalidaMiembro: Trasladado y Fallecido son las salidas', () => {
    expect(esSalidaMiembro('Trasladado')).toBe(true);
    expect(esSalidaMiembro('Fallecido')).toBe(true);
    expect(esSalidaMiembro('Activo')).toBe(false);
    expect(esSalidaMiembro('Inactivo')).toBe(false);
    expect(esSalidaMiembro('Disciplinado')).toBe(false);
  });

  it('cumpleaños SOLO de miembros en la casa: la congregada sin ficha no cuenta', () => {
    const miembros = [
      miembro({ id: 'm1', personaId: 'p1', estado: 'Activo' }),
      miembro({ id: 'm2', personaId: 'p2', estado: 'Trasladado' }),
    ];
    const personas = [
      persona({ id: 'p1', fechaNacimiento: nacEn10Dias() }),
      persona({ id: 'p2', fechaNacimiento: nacEn10Dias() }), // trasladada: fuera
      persona({ id: 'p3', fechaNacimiento: nacEn10Dias() }), // sin ficha de miembro: fuera
    ];
    const cumples = cumplesDeMiembros(personas, miembros);
    expect(cumples.map((c) => c.p.id)).toEqual(['p1']);
    expect(idsMiembrosEnCasa(miembros).has('p2')).toBe(false);
  });

  it('fotoEscalera: sobre los ACTIVOS — grupo, servicio, hermano mayor y bautismo', () => {
    const miembros = [
      miembro({ id: 'm1', personaId: 'p1', grupoId: 'g1', hermanoMayorId: 'p9', bautizado: true }),
      miembro({ id: 'm2', personaId: 'p2' }),
      miembro({ id: 'm3', personaId: 'p3', estado: 'Inactivo', grupoId: 'g1', bautizado: true }), // inactivo: fuera de la foto
    ];
    const asigs: MiembroMinisterio[] = [
      { id: 'a1', miembroId: 'm1', ministerioId: 'mn1', rol: 'Servidor', desde: '2024-01-01', notas: '', creado: '2024-01-01T00:00:00.000Z', version: 1 },
    ];
    expect(fotoEscalera(miembros, asigs)).toEqual({ enGrupo: 1, sirviendo: 1, conHermanoMayor: 1, bautizados: 1 });
  });
});
