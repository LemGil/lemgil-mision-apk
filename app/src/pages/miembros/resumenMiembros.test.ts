import { describe, it, expect } from 'vitest';
import { coincidePasoActual, conteoPasosCumplidos, cumplesDeMiembros, esSalidaMiembro, idsMiembrosEnCasa } from './resumenMiembros';
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

const paso = (id: string, orden: number): PasoSeguimiento => ({
  id, ambito: 'miembro', nombre: id, emoji: '🔹', orden, fuente: 'manual',
  creado: '2024-01-01T00:00:00.000Z', version: 1,
});

const IDS = ['pm-integracion', 'pm-grupo', 'pm-ministerio'];
const escalera = (cumplidos: string[], actualId: string | null): EscaleraMiembro => {
  const pasos = IDS.map((id, i) => paso(id, i + 1));
  return {
    estados: pasos.map((p) => ({ paso: p, cumplido: cumplidos.includes(p.id) })),
    actual: actualId ? pasos.find((p) => p.id === actualId) ?? null : null,
    cumplidos: cumplidos.length,
    total: pasos.length,
  };
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

  it('conteoPasosCumplidos: las tarjetas cuentan los pasos cumplidos del segmento', () => {
    const conteo = conteoPasosCumplidos([
      escalera(['pm-integracion', 'pm-grupo'], 'pm-ministerio'),
      escalera(['pm-integracion'], 'pm-grupo'),
      escalera(IDS, null),
    ]);
    expect(conteo.get('pm-integracion')).toBe(3);
    expect(conteo.get('pm-grupo')).toBe(2);
    expect(conteo.get('pm-ministerio')).toBe(1);
  });

  it('coincidePasoActual: parados en el paso, escalera completa y sin filtro', () => {
    const enGrupo = escalera(['pm-integracion'], 'pm-grupo');
    const completa = escalera(IDS, null);
    expect(coincidePasoActual(enGrupo, '')).toBe(true);
    expect(coincidePasoActual(enGrupo, 'pm-grupo')).toBe(true);
    expect(coincidePasoActual(enGrupo, 'pm-ministerio')).toBe(false);
    expect(coincidePasoActual(enGrupo, 'completa')).toBe(false);
    expect(coincidePasoActual(completa, 'completa')).toBe(true);
    expect(coincidePasoActual(undefined, 'pm-grupo')).toBe(false);
  });
});
