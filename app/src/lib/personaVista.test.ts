import { describe, it, expect } from 'vitest';
import {
  agruparProcesos, tiposPresentes, totalProcesos, tarjetasDeProcesos,
  procesosHuerfanos, filtrarPersonas, edadDesde, procesosVacios, contarPersonasUnicas,
} from './personaVista';
import type { FichasDePersona } from './personas';
import type { Beneficiario, Conversion, Diezmador, Estudiante, Miembro, Persona } from './types';

const personaBase = (over: Partial<Persona> = {}): Persona => ({
  id: 'p1', nombre: 'María', apellido: 'González', numeroIdentidad: '', telefono: '5551234',
  email: '', direccion: '', zona: 'Norte', fechaNacimiento: '', profesion: '',
  estadoCivil: 'Soltero', contactoPreferido: 'WhatsApp', bautizado: false,
  fechaBautismo: '', conyuge: '', hijos: '', grupoId: null, hermanoMayorId: null,
  creado: '2024-01-01T00:00:00.000Z', version: 1, ...over,
});

const convBase = (over: Partial<Conversion> = {}): Conversion => ({
  id: 'c1', nombre: 'María', apellido: 'González', telefono: '5551234',
  edad: '', direccion: '', familia: '', fecha: '2024-01-15', zona: 'Norte',
  lider: '', grupoId: '', hermanoMayorId: null, email: '', profesion: '',
  bautizado: false, fechaBautismo: '', conyuge: '', hijos: '',
  estado: 'Integrado', notas: '', historial: [], creado: '2024-01-15T00:00:00.000Z',
  version: 1, ...over,
});

const miembroBase = (over: Partial<Miembro> = {}): Miembro => ({
  id: 'm1', nombre: 'María', apellido: 'González', telefono: '5551234',
  email: '', direccion: '', zona: 'Norte', grupoId: null,
  fechaNacimiento: '', fechaIngreso: '2024-02-01', estado: 'Activo',
  contactoPreferido: 'WhatsApp', profesion: '', estadoCivil: 'Soltero',
  bautizado: false, fechaBautismo: '', conyuge: '', hijos: '',
  hermanoMayorId: null, conversionId: null, notas: '',
  creado: '2024-02-01T00:00:00.000Z', actualizado: '2024-02-01T00:00:00.000Z',
  version: 1, ...over,
});

const estBase = (over: Partial<Estudiante> = {}): Estudiante => ({
  id: 'e1', nombre: 'María', apellido: 'González', telefono: '5551234',
  edad: '', cursoId: 'cur1', fecha: '2024-03-01', estado: 'Activo', notas: '',
  creado: '2024-03-01T00:00:00.000Z',
  zona: 'Norte', grupoId: null, hermanoMayorId: null, email: '', direccion: '',
  profesion: '', bautizado: false, fechaBautismo: '', conyuge: '', hijos: '',
  version: 1, ...over,
});

const diezmBase = (over: Partial<Diezmador> = {}): Diezmador => ({
  id: 'd1', nombre: 'María', apellido: 'González', telefono: '5551234',
  email: '', fechaIngreso: '2024-02-01', estado: 'Activo', zona: 'Norte',
  grupo: '', planDiezmo: 0, notas: '', creado: '2024-02-01T00:00:00.000Z',
  version: 1, ...over,
});

const benefBase = (over: Partial<Beneficiario> = {}): Beneficiario => ({
  id: 'b1', nombre: 'María', apellido: 'González', telefono: '5551234',
  direccion: '', zona: 'Norte', familia: 4, estado: 'Activo', notas: '',
  creado: '2024-04-01T00:00:00.000Z', tipo: 'Persona',
  version: 1, ...over,
});

const datos = (over: Partial<FichasDePersona> = {}): FichasDePersona => ({
  miembros: [], conversiones: [], estudiantes: [], dadores: [], beneficiarios: [], ...over,
});

describe('Ficha única P1 — composición de la vista (personaVista)', () => {
  it('una persona con varios procesos queda agrupada bajo su personaId', () => {
    const mapa = agruparProcesos(datos({
      conversiones: [convBase({ personaId: 'p1' })],
      miembros: [miembroBase({ personaId: 'p1' })],
      estudiantes: [estBase({ personaId: 'p1' })],
      dadores: [diezmBase({ personaId: 'p1' })],
      beneficiarios: [benefBase({ personaId: 'p1' })],
    }));
    const g = mapa.get('p1')!;
    expect(tiposPresentes(g)).toEqual(['conversiones', 'miembros', 'estudiantes', 'dadores', 'beneficiarios']);
    expect(totalProcesos(g)).toBe(5);
  });

  it('una persona sin procesos no aparece en el mapa y su grupo vacío no tiene tipos', () => {
    const mapa = agruparProcesos(datos({ miembros: [miembroBase({ personaId: 'p2' })] }));
    expect(mapa.has('p1')).toBe(false);
    expect(tiposPresentes(procesosVacios())).toEqual([]);
    expect(totalProcesos(procesosVacios())).toBe(0);
  });

  it('los procesos sin personaId (o con cadena vacía) no se agrupan en ninguna persona', () => {
    const mapa = agruparProcesos(datos({
      conversiones: [convBase({ personaId: null })],
      miembros: [miembroBase({ personaId: '' })],
      estudiantes: [estBase({})], // sin la propiedad siquiera
    }));
    expect(mapa.size).toBe(0);
  });

  it('las tarjetas resumen cada proceso y enlazan a su módulo (con ?ver= solo donde existe)', () => {
    const g = agruparProcesos(datos({
      conversiones: [convBase({ personaId: 'p1' })],
      miembros: [miembroBase({ personaId: 'p1' })],
      estudiantes: [estBase({ personaId: 'p1' })],
      dadores: [diezmBase({ personaId: 'p1' })],
      beneficiarios: [benefBase({ personaId: 'p1' })],
    })).get('p1')!;
    const tarjetas = tarjetasDeProcesos(g, (id) => (id === 'cur1' ? 'Fundamentos' : undefined));
    expect(tarjetas.map((t) => t.titulo)).toEqual(['Conversión', 'Miembro', 'Estudiante', 'Diezmador', 'Beneficiario']);
    const conv = tarjetas[0];
    expect(conv.lineas.join(' ')).toContain('Integrado');
    expect(conv.ruta).toBe('/mision?ver=c1');
    expect(conv.abreFicha).toBe(true);
    expect(tarjetas[1].ruta).toBe('/miembros?ver=m1');
    expect(tarjetas[2].lineas.join(' ')).toContain('Fundamentos');
    expect(tarjetas[3].ruta).toBe('/bien-comun');
    expect(tarjetas[3].abreFicha).toBe(false);
    expect(tarjetas[4].lineas.join(' ')).toContain('Persona');
  });

  it('huérfanos: proceso sin personaId y proceso con personaId inexistente', () => {
    const ids = new Set(['p1']);
    const huerfanos = procesosHuerfanos(datos({
      conversiones: [convBase({ personaId: null })],
      miembros: [miembroBase({ personaId: 'fantasma' })],
      estudiantes: [estBase({ personaId: 'p1' })], // bien enlazado: no es huérfano
    }), ids);
    expect(huerfanos.map((h) => `${h.proceso}:${h.id}`)).toEqual(['conversiones:c1', 'miembros:m1']);
    expect(huerfanos[0].nombreVisible).toBe('María González');
  });

  it('huérfanos: un beneficiario «Casa de Familia»/«Grupo» sin personaId NO es huérfano (no es persona del núcleo)', () => {
    const ids = new Set(['p1']);
    const huerfanos = procesosHuerfanos(datos({
      beneficiarios: [
        benefBase({ id: 'b-casa', tipo: 'Casa de Familia', personaId: null }),
        benefBase({ id: 'b-grupo', tipo: 'Grupo', personaId: null }),
        benefBase({ id: 'b-persona', tipo: 'Persona', personaId: null }),
      ],
    }), ids);
    expect(huerfanos.map((h) => h.id)).toEqual(['b-persona']);
  });

  it('filtrarPersonas busca por nombre sin tildes y por dígitos del teléfono', () => {
    const personas = [
      personaBase({ id: 'p1', nombre: 'María', apellido: 'González', telefono: '555-1234' }),
      personaBase({ id: 'p2', nombre: 'Juan', apellido: 'Pérez', telefono: '7779999' }),
    ];
    expect(filtrarPersonas(personas, 'maria gon').map((p) => p.id)).toEqual(['p1']);
    expect(filtrarPersonas(personas, '5512').map((p) => p.id)).toEqual(['p1']);
    expect(filtrarPersonas(personas, 'perez').map((p) => p.id)).toEqual(['p2']);
    expect(filtrarPersonas(personas, '')).toHaveLength(2);
    expect(filtrarPersonas(personas, 'zzz')).toHaveLength(0);
  });

  it('filtrarPersonas también encuentra por los dígitos del Nº de Identidad (P0.1)', () => {
    const personas = [
      personaBase({ id: 'p1', nombre: 'María', apellido: 'González', numeroIdentidad: '85010112345', telefono: '5551234' }),
      personaBase({ id: 'p2', nombre: 'Juan', apellido: 'Pérez', numeroIdentidad: '90020254321', telefono: '7779999' }),
    ];
    expect(filtrarPersonas(personas, '850101').map((p) => p.id)).toEqual(['p1']);
    expect(filtrarPersonas(personas, '54321').map((p) => p.id)).toEqual(['p2']);
  });

  it('edadDesde calcula años cumplidos y tolera fechas vacías', () => {
    expect(edadDesde('1990-05-01', new Date(2024, 3, 30))).toBe(33);
    expect(edadDesde('1990-05-01', new Date(2024, 4, 1))).toBe(34);
    expect(edadDesde('')).toBeNull();
    expect(edadDesde('no-es-fecha')).toBeNull();
  });

  it('contarPersonasUnicas: una persona con 3 procesos cuenta UNA vez (P6)', () => {
    const procesos = [
      { id: 'c1', personaId: 'p1' }, // su conversión
      { id: 'm1', personaId: 'p1' }, // su miembro
      { id: 'e1', personaId: 'p1' }, // su estudiante
    ];
    expect(contarPersonasUnicas(procesos)).toBe(1);
  });

  it('contarPersonasUnicas: personas distintas cuentan por separado y el proceso sin enlazar cuenta como él mismo', () => {
    const procesos = [
      { id: 'c1', personaId: 'p1' },
      { id: 'm1', personaId: 'p1' },
      { id: 'm2', personaId: 'p2' },
      { id: 'd9', personaId: null }, // aún sin enlazar: es su propia persona
    ];
    expect(contarPersonasUnicas(procesos)).toBe(3);
    expect(contarPersonasUnicas([])).toBe(0);
  });
});
