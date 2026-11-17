import { describe, it, expect } from 'vitest';
import { calcularCenso, claseDePersona, edadEn } from './censo';
import { procesosVacios, type ProcesosAgrupados } from './personaVista';
import { PS_APARTADO, PS_CONFESO, PS_INTEGRADO, PS_NUEVO } from './pasosMision';
import type { Conversion, Diezmador, Miembro, Persona } from './types';

const HOY = new Date(2026, 10, 17);
const NOVIEMBRE = { desde: '2026-11-01', hasta: '2026-11-30' };

const persona = (extra: Partial<Persona>): Persona =>
  ({ id: 'p1', nombre: 'Ana', apellido: 'Pérez', fechaNacimiento: '', sexo: null, ...extra }) as Persona;
const conv = (extra: Partial<Conversion>): Conversion =>
  ({ id: 'c1', personaId: 'p1', estado: 'ps-congregado', fecha: '2026-11-01', historial: [], ...extra }) as Conversion;
const miembro = (extra: Partial<Miembro>): Miembro =>
  ({ id: 'm1', personaId: 'p1', estado: 'Activo', ...extra }) as Miembro;
const grupo = (extra: Partial<ProcesosAgrupados>): ProcesosAgrupados => ({ ...procesosVacios(), ...extra });
const fichasDe = (conversiones: Conversion[]) => ({
  conversiones, miembros: [], estudiantes: [], dadores: [], beneficiarios: [],
});

describe('claseDePersona', () => {
  it('la baja manda sobre el miembro activo; el gozne cuenta como miembro', () => {
    expect(claseDePersona(grupo({ conversiones: [conv({ estado: PS_APARTADO })], miembros: [miembro({})] })).tipo).toBe('baja');
    expect(claseDePersona(grupo({ conversiones: [conv({ estado: PS_INTEGRADO })] }))).toEqual({ tipo: 'miembro' });
    expect(claseDePersona(grupo({ conversiones: [conv({ estado: PS_CONFESO })] }))).toEqual({ tipo: 'etapa', pasoId: PS_CONFESO });
    expect(claseDePersona(grupo({}))).toEqual({ tipo: 'fuera' });
  });
});

describe('edadEn', () => {
  it('cuenta los años cumplidos y rechaza fechas que no sirven', () => {
    expect(edadEn('2020-11-17', HOY)).toBe(6);
    expect(edadEn('2020-11-18', HOY)).toBe(5);
    expect(edadEn('', HOY)).toBeNull();
    expect(edadEn('17/11/2020', HOY)).toBeNull();
  });
});

describe('calcularCenso', () => {
  it('total = proceso + miembros, cada persona una sola vez, con sus cortes', () => {
    const personas = [
      persona({ id: 'p1', sexo: 'F', fechaNacimiento: '2020-01-01' }),
      persona({ id: 'p2', sexo: 'M', fechaNacimiento: '1980-03-01' }),
      persona({ id: 'p3' }),
    ];
    const fichas = {
      conversiones: [conv({ personaId: 'p1', estado: PS_CONFESO })],
      miembros: [miembro({ personaId: 'p2' })],
      estudiantes: [],
      dadores: [{ id: 'd1', personaId: 'p2' } as Diezmador, { id: 'd2', personaId: 'p2' } as Diezmador],
      beneficiarios: [],
    };
    const censo = calcularCenso(personas, fichas, undefined, NOVIEMBRE, HOY);
    expect(censo.total).toBe(2);
    expect(censo.miembros).toBe(1);
    expect(censo.etapas.find((e) => e.pasoId === PS_CONFESO)?.cantidad).toBe(1);
    expect(censo.hombres).toBe(1);
    expect(censo.mujeres).toBe(1);
    expect(censo.ninos).toBe(1);
    expect(censo.adultos).toBe(1);
    expect(censo.diezmadores).toBe(1);
  });

  it('el período lee el historial: confesiones, conversiones y bajas por persona distinta', () => {
    const fichas = fichasDe([
      conv({
        personaId: 'p1',
        estado: PS_NUEVO,
        historial: [
          { fecha: '2026-11-05', estado: PS_CONFESO, nota: '' },
          { fecha: '2026-11-12', estado: PS_NUEVO, nota: '' },
        ],
      }),
      conv({
        id: 'c2',
        personaId: 'p2',
        estado: PS_APARTADO,
        historial: [{ fecha: '2026-10-01', estado: PS_CONFESO, nota: '' }, { fecha: '2026-11-03', estado: PS_APARTADO, nota: '' }],
      }),
    ]);
    const censo = calcularCenso([persona({ id: 'p1' }), persona({ id: 'p2' })], fichas, undefined, NOVIEMBRE, HOY);
    expect(censo.periodo).toEqual({ confesiones: 1, conversiones: 1, bajas: 1 });
    expect(censo.bajas.apartados).toBe(1);
  });
});
