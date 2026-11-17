import { describe, it, expect } from 'vitest';
import { construirInforme, type ContextoInforme, type InformeDepartamento } from './informes';
import { REPORTE_DATOS_VACIO, type ReporteDatos } from './pdfExport';
import { CENSO_VACIO } from './censo';
import { PASOS_MISION_DEFECTO, PS_CONGREGADO, PS_NUEVO, PS_APARTADO } from './pasosMision';
import type { Conversion, Grupo, Miembro } from './types';

const datos = (over: Partial<ReporteDatos> = {}): ReporteDatos => ({
  ...REPORTE_DATOS_VACIO,
  censo: { ...CENSO_VACIO, periodo: { confesiones: 2, conversiones: 1, bajas: 1 } },
  ...over,
});

const ctx = (over: Partial<ContextoInforme> = {}): ContextoInforme => ({
  datos: datos(),
  conversiones: [],
  pasos: PASOS_MISION_DEFECTO,
  grupos: [],
  evangelismos: [],
  miembros: [],
  ministerios: [],
  miembrosMinisterios: [],
  cursos: [],
  estudiantes: [],
  certificados: [],
  diezmadores: [],
  aportesComun: [],
  colaboradores: [],
  aportes: [],
  beneficiarios: [],
  campanas: [],
  entregas: [],
  periodo: { desde: '2026-11-01', hasta: '2026-11-30' },
  ...over,
});

const conv = (over: Partial<Conversion>): Conversion =>
  ({ id: 'c1', fecha: '2026-11-05', estado: PS_CONGREGADO, historial: [], ...over }) as Conversion;
const miembro = (over: Partial<Miembro>): Miembro =>
  ({ id: 'm1', estado: 'Activo', bautizado: false, grupoId: null, ...over }) as Miembro;

function filasDe(informe: InformeDepartamento, titulo: string): Map<string, string> {
  const s = informe.secciones.find((x) => x.titulo === titulo);
  expect(s, `sección «${titulo}»`).toBeTruthy();
  return new Map(s!.filas);
}

describe('Informe de Misión', () => {
  it('el período toma el embudo del censo y la ruta reparte por paso vivo', () => {
    const informe = construirInforme('mision', ctx({
      conversiones: [
        conv({ id: 'c1', estado: PS_CONGREGADO }),
        conv({ id: 'c2', estado: PS_NUEVO, fecha: '2026-10-01' }),
        conv({ id: 'c3', estado: PS_APARTADO }),
      ],
      grupos: [{ id: 'g1', nombre: 'Grupo Vida' } as Grupo],
      miembros: [miembro({ grupoId: 'g1' })],
    }));
    const periodo = filasDe(informe, 'El período');
    expect(periodo.get('Registrados en Misión')).toBe('2');
    expect(periodo.get('Confesiones de fe')).toBe('2');
    expect(periodo.get('Conversiones (permanecieron)')).toBe('1');
    const ruta = filasDe(informe, 'La ruta hoy (foto actual)');
    expect(ruta.get('Congregado')).toBe('1');
    expect(ruta.get('Converso')).toBe('1');
    expect(ruta.get('Apartado')).toBe('1');
    expect(filasDe(informe, 'Grupos').get('Grupo Vida')).toBe('0 en Misión · 1 miembros');
  });
});

describe('Informe de Miembros y Ministerios', () => {
  it('cuenta estados, bautizados, grupo y equipos por ministerio', () => {
    const informe = construirInforme('miembros', ctx({
      miembros: [
        miembro({ id: 'm1', bautizado: true, grupoId: 'g1' }),
        miembro({ id: 'm2', grupoId: 'g1' }),
        miembro({ id: 'm3', estado: 'Fallecido' }),
      ],
      ministerios: [{ id: 'min1', nombre: 'Alabanza', emoji: '🎵', lider: '', descripcion: '', color: '', creado: '', version: 1 }],
      miembrosMinisterios: [
        { id: 'a1', miembroId: 'm1', ministerioId: 'min1', rol: 'Líder', desde: '', notas: '', creado: '', version: 1 },
        { id: 'a2', miembroId: 'm2', ministerioId: 'min1', rol: 'Servidor', desde: '', notas: '', creado: '', version: 1 },
      ],
    }));
    const m = filasDe(informe, 'Miembros');
    expect(m.get('Total de miembros')).toBe('3');
    expect(m.get('Activos')).toBe('2');
    expect(m.get('Fallecidos')).toBe('1');
    expect(m.get('Bautizados')).toBe('1');
    expect(m.get('Con grupo')).toBe('2');
    const mins = filasDe(informe, 'Ministerios');
    expect(mins.get('🎵 Alabanza')).toBe('2 en el equipo · 1 líder(es)');
    expect(mins.get('Miembros sirviendo en algún ministerio')).toBe('2');
    expect(mins.get('Miembros activos sin ministerio')).toBe('0');
  });
});

describe('Informe de Bien Común', () => {
  it('cuenta registros y diezmadores del período; el dinero viene de datos', () => {
    const informe = construirInforme('bien-comun', ctx({
      datos: datos({
        finanzas: {
          ...REPORTE_DATOS_VACIO.finanzas,
          bienComunDiezmos: 300, bienComunOfrendas: 50, bienComunTotal: 350, bienComunPlan: 700,
        },
      }),
      aportesComun: [
        { id: 'a1', diezmadorId: 'd1', grupoId: null, fecha: '2026-11-03', monto: 100, tipo: 'Diezmo' },
        { id: 'a2', diezmadorId: 'd1', grupoId: null, fecha: '2026-11-10', monto: 200, tipo: 'Diezmo' },
        { id: 'a3', diezmadorId: 'd2', grupoId: null, fecha: '2026-11-10', monto: 50, tipo: 'Ofrenda' },
        { id: 'a4', diezmadorId: 'd3', grupoId: null, fecha: '2026-09-10', monto: 999, tipo: 'Diezmo' },
      ] as ContextoInforme['aportesComun'],
    }));
    const reg = filasDe(informe, 'Registros del período');
    expect(reg.get('Nº de registros')).toBe('3');
    expect(reg.get('Diezmadores que aportaron')).toBe('2');
    expect(reg.get('Total Bien Común')).toContain('350');
    expect(filasDe(informe, 'Cumplimiento').get('% del plan con el total del período')).toBe('50%');
  });
});

describe('Informe de la Red de Colaboradores', () => {
  it('cuenta la red y quiénes aportaron en el período', () => {
    const informe = construirInforme('colaboradores', ctx({
      colaboradores: [
        { id: 'k1', estado: 'Activo' },
        { id: 'k2', estado: 'Pausado' },
      ] as ContextoInforme['colaboradores'],
      aportes: [
        { id: 'a1', colaboradorId: 'k1', fecha: '2026-11-02', monto: 10, tipo: 'Misión' },
        { id: 'a2', colaboradorId: 'k1', fecha: '2026-11-20', monto: 10, tipo: 'Otro' },
      ] as ContextoInforme['aportes'],
    }));
    const red = filasDe(informe, 'La Red');
    expect(red.get('Colaboradores registrados')).toBe('2');
    expect(red.get('Activos')).toBe('1');
    expect(red.get('Con aportes en el período')).toBe('1');
  });
});

describe('Informes de Academia y Manos Abiertas', () => {
  it('academia: estudiantes por curso con activos y completados', () => {
    const informe = construirInforme('academia', ctx({
      cursos: [{ id: 'cu1', nombre: 'Fundamentos' }] as ContextoInforme['cursos'],
      estudiantes: [
        { id: 'e1', cursoId: 'cu1', estado: 'Activo' },
        { id: 'e2', cursoId: 'cu1', estado: 'Completado' },
        { id: 'e3', cursoId: 'cu1', estado: 'Activo' },
      ] as ContextoInforme['estudiantes'],
    }));
    expect(filasDe(informe, 'Estudiantes por curso').get('Fundamentos')).toBe('2 activo(s) · 1 completado(s)');
  });

  it('manos abiertas: beneficiarios por tipo y estado', () => {
    const informe = construirInforme('manos-abiertas', ctx({
      beneficiarios: [
        { id: 'b1', tipo: 'Persona', estado: 'Activo' },
        { id: 'b2', tipo: 'Persona', estado: 'Inactivo' },
        { id: 'b3', tipo: 'Casa', estado: 'Activo' },
      ] as ContextoInforme['beneficiarios'],
    }));
    const tipos = filasDe(informe, 'Beneficiarios por tipo');
    expect(tipos.get('Personas')).toBe('2');
    expect(tipos.get('Casas')).toBe('1');
    expect(tipos.get('Grupos')).toBe('0');
    expect(tipos.get('Activos')).toBe('2');
  });
});
