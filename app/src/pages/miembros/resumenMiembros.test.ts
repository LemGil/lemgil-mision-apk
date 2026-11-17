import { describe, it, expect } from 'vitest';
import { cumplesDeMiembros, esSalidaMiembro, idsMiembrosEnCasa, pendienteDePaso, tarjetasDeMiembros } from './resumenMiembros';
import type { Miembro, PasoSeguimiento, Persona } from '../../lib/types';
import type { EscaleraMiembro } from '../../lib/pasosMiembro';

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

const paso = (id: string, orden: number, fuente: PasoSeguimiento['fuente']): PasoSeguimiento => ({
  id, ambito: 'miembro', nombre: id, emoji: '🔹', orden, fuente,
  creado: '2024-01-01T00:00:00.000Z', version: 1,
});

const PASOS: PasoSeguimiento[] = [
  paso('pm-grupo', 2, 'grupo'),
  paso('pm-academia', 3, 'academia'),
  paso('pm-ministerio', 4, 'ministerio'),
  paso('pm-liderazgo', 6, 'manual'),
];

const escalera = (cumplidos: string[]): EscaleraMiembro => {
  const estados = PASOS.map((p) => ({ paso: p, cumplido: cumplidos.includes(p.id) }));
  const pendiente = estados.find((e) => !e.cumplido);
  return { estados, actual: pendiente ? pendiente.paso : null, cumplidos: cumplidos.length, total: PASOS.length };
};

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

  it('tarjetas: estados sobre todas las fichas, atributos sobre los ACTIVOS', () => {
    const miembros = [
      miembro({ id: 'm1', personaId: 'p1', hermanoMayorId: 'p9' }),
      miembro({ id: 'm2', personaId: 'p2' }),
      miembro({ id: 'm3', personaId: 'p3', estado: 'Trasladado' }),
      miembro({ id: 'm4', personaId: 'p4', estado: 'Fallecido' }),
      miembro({ id: 'm5', personaId: 'p5', estado: 'Inactivo' }),
      miembro({ id: 'm6', personaId: 'p6', estado: 'Disciplinado' }),
    ];
    const escaleras = new Map<string, EscaleraMiembro>([
      ['m1', escalera(['pm-grupo', 'pm-academia', 'pm-ministerio', 'pm-liderazgo'])],
      ['m2', escalera([])],
    ]);
    const t = tarjetasDeMiembros(miembros, escaleras, new Set(['p1']));
    expect(t).toEqual({
      activos: 2, inactivos: 1, trasladados: 1, fallecidos: 1, disciplinados: 1,
      enGrupo: 1, diezmadores: 1, enAcademia: 1, sirviendo: 1, conHermanoMayor: 1, lideres: 1,
    });
  });

  it('pendienteDePaso: le falta ESE paso, sin importar los demás', () => {
    const mixta = escalera(['pm-ministerio']); // sirve, pero le falta grupo
    expect(pendienteDePaso(mixta, '')).toBe(true);
    expect(pendienteDePaso(mixta, 'pm-grupo')).toBe(true);
    expect(pendienteDePaso(mixta, 'pm-ministerio')).toBe(false);
    expect(pendienteDePaso(mixta, 'completa')).toBe(false);
    expect(pendienteDePaso(escalera(['pm-grupo', 'pm-academia', 'pm-ministerio', 'pm-liderazgo']), 'completa')).toBe(true);
    expect(pendienteDePaso(undefined, 'pm-grupo')).toBe(false);
  });
});
