import { describe, it, expect } from 'vitest';
import {
  agruparProcesos, tiposPresentes, totalProcesos, tarjetasDeProcesos,
  procesosHuerfanos, filtrarPersonas, edadDesde, procesosVacios, contarPersonasUnicas,
  posiblesDuplicados, situacionPersona, conversionDePersona, posiblesRepetidas,
} from './personaVista';
import { PASOS_MISION_DEFECTO } from './pasosMision';
import type { FichasDePersona } from './personas';
import type { Beneficiario, Conversion, Diezmador, Estudiante, Miembro, PasoSeguimiento, Persona } from './types';

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
  estado: 'ps-integrado', notas: '', historial: [], creado: '2024-01-15T00:00:00.000Z',
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

// P7: los personales del diezmador salieron del tipo; la fixture es un
// registro crudo viejo (con sus campos dormidos), como viene de la base.
type DiezmadorCrudo = Diezmador & {
  nombre?: string; apellido?: string; telefono?: string; email?: string;
  zona?: string; grupo?: string;
};

const diezmBase = (over: Partial<DiezmadorCrudo> = {}): DiezmadorCrudo => ({
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

describe('posiblesDuplicados: sospechas para revisar, nunca uniones', () => {
  it('mismo nombre normalizado (mayúsculas, acentos y espacios no importan) forma grupo', () => {
    const a = personaBase({ id: 'p1', nombre: 'MARTHA', apellido: '  AJEDRES ', telefono: '', numeroIdentidad: '', fechaNacimiento: '' });
    const b = personaBase({ id: 'p2', nombre: 'Martha', apellido: 'Ajedres', telefono: '5999888', numeroIdentidad: '', fechaNacimiento: '' });
    const sinRelacion = personaBase({ id: 'p3', nombre: 'Juan', apellido: 'Pérez', telefono: '', numeroIdentidad: '', fechaNacimiento: '' });
    const grupos = posiblesDuplicados([a, b, sinRelacion]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].personas.map((p) => p.id).sort()).toEqual(['p1', 'p2']);
    expect(grupos[0].senales).toEqual(['mismo nombre']);
  });

  it('mismo teléfono (comparado por dígitos) con nombres distintos forma grupo', () => {
    const a = personaBase({ id: 'p1', nombre: 'Juan', apellido: 'Pérez', telefono: '(555) 123-4', numeroIdentidad: '', fechaNacimiento: '' });
    const b = personaBase({ id: 'p2', nombre: 'Pedro', apellido: 'Ruiz', telefono: '5551234', numeroIdentidad: '', fechaNacimiento: '' });
    const grupos = posiblesDuplicados([a, b]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].senales).toEqual(['mismo teléfono']);
  });

  it('mismo Nº de Identidad (por dígitos) forma grupo', () => {
    const a = personaBase({ id: 'p1', nombre: 'Ana', apellido: 'Díaz', telefono: '5111', numeroIdentidad: '85010112345', fechaNacimiento: '' });
    const b = personaBase({ id: 'p2', nombre: 'Luisa', apellido: 'Mora', telefono: '5222', numeroIdentidad: '850101-12345', fechaNacimiento: '' });
    const grupos = posiblesDuplicados([a, b]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].senales).toEqual(['mismo Nº de Identidad']);
  });

  it('mismo apellido normalizado + misma fecha de nacimiento forma grupo', () => {
    const a = personaBase({ id: 'p1', nombre: 'Martha', apellido: 'Ajedres', telefono: '5111', numeroIdentidad: '', fechaNacimiento: '1990-05-01' });
    const b = personaBase({ id: 'p2', nombre: 'Marta', apellido: 'ÁJEDRES', telefono: '5222', numeroIdentidad: '', fechaNacimiento: '1990-05-01' });
    const grupos = posiblesDuplicados([a, b]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].senales).toEqual(['mismo apellido y fecha de nacimiento']);
  });

  it('dos personas sin ninguna señal NO forman grupo', () => {
    const a = personaBase({ id: 'p1', nombre: 'Ana', apellido: 'Díaz', telefono: '5111', numeroIdentidad: '111', fechaNacimiento: '1990-01-01' });
    const b = personaBase({ id: 'p2', nombre: 'Luis', apellido: 'Mora', telefono: '5222', numeroIdentidad: '222', fechaNacimiento: '1985-06-15' });
    expect(posiblesDuplicados([a, b])).toEqual([]);
    // El mismo apellido SIN la misma fecha de nacimiento tampoco alcanza.
    const c = personaBase({ id: 'p3', nombre: 'Elena', apellido: 'Díaz', telefono: '5333', numeroIdentidad: '333', fechaNacimiento: '1992-03-03' });
    expect(posiblesDuplicados([a, c])).toEqual([]);
  });

  it('una sola persona (o ninguna) nunca forma grupo', () => {
    expect(posiblesDuplicados([])).toEqual([]);
    expect(posiblesDuplicados([personaBase({ id: 'p1' })])).toEqual([]);
  });

  it('un grupo de tres unido por señales distintas se devuelve junto', () => {
    const a = personaBase({ id: 'p1', nombre: 'Ana', apellido: 'Sol', telefono: '5111', numeroIdentidad: '', fechaNacimiento: '' });
    const b = personaBase({ id: 'p2', nombre: 'ANA', apellido: 'SOL', telefono: '5222', numeroIdentidad: '', fechaNacimiento: '' });
    const c = personaBase({ id: 'p3', nombre: 'Otra', apellido: 'Persona', telefono: '5222', numeroIdentidad: '', fechaNacimiento: '' });
    const grupos = posiblesDuplicados([a, b, c]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].personas.map((p) => p.id).sort()).toEqual(['p1', 'p2', 'p3']);
    expect(grupos[0].senales).toEqual(['mismo nombre', 'mismo teléfono']);
  });

  it('las señales múltiples entre las mismas fichas se acumulan sin duplicar', () => {
    const a = personaBase({ id: 'p1', nombre: 'Ana', apellido: 'Sol', telefono: '5111', numeroIdentidad: '999', fechaNacimiento: '' });
    const b = personaBase({ id: 'p2', nombre: 'Ana', apellido: 'Sol', telefono: '5111', numeroIdentidad: '999', fechaNacimiento: '' });
    const grupos = posiblesDuplicados([a, b]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].senales).toEqual(['mismo nombre', 'mismo teléfono', 'mismo Nº de Identidad']);
  });
});

describe('situacionPersona: la situación actual que la ficha sí dice', () => {
  const grupo = (over: Partial<import('./personaVista').ProcesosAgrupados>): import('./personaVista').ProcesosAgrupados => ({
    ...procesosVacios(), ...over,
  });
  // Estados fuera de la unión actual (registros viejos/sincronizados):
  // se construyen con cast porque el tipo ya no los admite.
  const miembroApartado = miembroBase({ id: 'm-ap' }) as Miembro;
  (miembroApartado as { estado: string }).estado = 'Apartado';
  const convSeguimiento = convBase({ id: 'c-seg' }) as Conversion;
  (convSeguimiento as { estado: string }).estado = 'Seguimiento';

  it('regla 1: conversión Fallecido → Fallecido (danger)', () => {
    expect(situacionPersona(grupo({ conversiones: [convBase({ estado: 'ps-fallecido' })] })))
      .toEqual({ texto: 'Fallecido', tono: 'danger' });
  });

  it('regla 1: miembro Fallecido → Fallecido (danger)', () => {
    expect(situacionPersona(grupo({ miembros: [miembroBase({ estado: 'Fallecido' })] })))
      .toEqual({ texto: 'Fallecido', tono: 'danger' });
  });

  it('regla 1 gana a la 2: Fallecido manda sobre Apartado', () => {
    expect(situacionPersona(grupo({
      conversiones: [convBase({ estado: 'ps-apartado' })],
      miembros: [miembroBase({ estado: 'Fallecido' })],
    }))).toEqual({ texto: 'Fallecido', tono: 'danger' });
  });

  it('regla 2, caso Martha: SOLO conversión en Apartado → Apartado (warn)', () => {
    expect(situacionPersona(grupo({ conversiones: [convBase({ estado: 'ps-apartado' })] })))
      .toEqual({ texto: 'Apartado', tono: 'warn' });
  });

  it('regla 2: Apartado también sale del miembro (registro viejo)', () => {
    expect(situacionPersona(grupo({ miembros: [miembroApartado] })))
      .toEqual({ texto: 'Apartado', tono: 'warn' });
  });

  it('regla 2 gana a la 6: miembro apartado manda sobre conversión Integrado', () => {
    expect(situacionPersona(grupo({
      conversiones: [convBase({ estado: 'ps-integrado' })],
      miembros: [miembroApartado],
    }))).toEqual({ texto: 'Apartado', tono: 'warn' });
  });

  it('regla 3: conversión en Traslado → «Trasladado» (info, tono neutro)', () => {
    expect(situacionPersona(grupo({ conversiones: [convBase({ estado: 'ps-traslado' })] })))
      .toEqual({ texto: 'Trasladado', tono: 'info' });
  });

  it('regla 3: conversión en una salida PERSONALIZADA → su etiqueta viva (info)', () => {
    const salidaPropia: PasoSeguimiento = {
      id: 'ps-mudanza', ambito: 'mision', nombre: 'Se mudó del país', emoji: '✈️',
      orden: 8, fuente: 'manual', rol: 'salida', creado: '2026-01-01T00:00:00.000Z', version: 1,
    };
    const catalogo = [...PASOS_MISION_DEFECTO, salidaPropia];
    expect(situacionPersona(grupo({ conversiones: [convBase({ estado: 'ps-mudanza' })] }), catalogo))
      .toEqual({ texto: 'Se mudó del país', tono: 'info' });
    // Y si la iglesia la renombra, la insignia dice el nombre nuevo.
    const renombrado = catalogo.map((p) => (p.id === 'ps-mudanza' ? { ...p, nombre: 'Emigró' } : p));
    expect(situacionPersona(grupo({ conversiones: [convBase({ estado: 'ps-mudanza' })] }), renombrado))
      .toEqual({ texto: 'Emigró', tono: 'info' });
  });

  it('regla 3: miembro Trasladado → «Trasladado» (info), y gana a su conversión Integrado', () => {
    // CAMBIO documentado: antes esta combinación caía a la regla del
    // gozne y la insignia decía «Integrado»; ahora manda el traslado.
    expect(situacionPersona(grupo({ miembros: [miembroBase({ estado: 'Trasladado' })] })))
      .toEqual({ texto: 'Trasladado', tono: 'info' });
    expect(situacionPersona(grupo({
      conversiones: [convBase({ estado: 'ps-integrado' })],
      miembros: [miembroBase({ estado: 'Trasladado' })],
    }))).toEqual({ texto: 'Trasladado', tono: 'info' });
  });

  it('regla 2 gana a la 3: Apartado manda sobre Traslado', () => {
    expect(situacionPersona(grupo({
      conversiones: [convBase({ estado: 'ps-apartado' })],
      miembros: [miembroBase({ estado: 'Trasladado' })],
    }))).toEqual({ texto: 'Apartado', tono: 'warn' });
  });

  it('regla 4: miembro Inactivo → Inactivo (warn), y gana a conversión Integrado', () => {
    expect(situacionPersona(grupo({ miembros: [miembroBase({ estado: 'Inactivo' })] })))
      .toEqual({ texto: 'Inactivo', tono: 'warn' });
    expect(situacionPersona(grupo({
      conversiones: [convBase({ estado: 'ps-integrado' })],
      miembros: [miembroBase({ estado: 'Inactivo' })],
    }))).toEqual({ texto: 'Inactivo', tono: 'warn' });
  });

  it('regla 5: miembro Activo → «Miembro activo» (ok)', () => {
    expect(situacionPersona(grupo({ miembros: [miembroBase({ estado: 'Activo' })] })))
      .toEqual({ texto: 'Miembro activo', tono: 'ok' });
  });

  it('regla 5 gana a la 7: miembro Activo manda sobre conversión en proceso', () => {
    expect(situacionPersona(grupo({
      conversiones: [convBase({ estado: 'ps-nuevo' })],
      miembros: [miembroBase({ estado: 'Activo' })],
    }))).toEqual({ texto: 'Miembro activo', tono: 'ok' });
  });

  it('regla 6: solo conversión Integrado → Integrado (ok)', () => {
    expect(situacionPersona(grupo({ conversiones: [convBase({ estado: 'ps-integrado' })] })))
      .toEqual({ texto: 'Integrado', tono: 'ok' });
  });

  it('regla 7: conversión en proceso, una sola → su estado (info)', () => {
    expect(situacionPersona(grupo({ conversiones: [convBase({ estado: 'ps-discipulado' })] })))
      .toEqual({ texto: 'Discipulado', tono: 'info' });
    expect(situacionPersona(grupo({ conversiones: [convBase({ estado: 'ps-nuevo' })] })))
      .toEqual({ texto: 'Nuevo', tono: 'info' });
  });

  it('regla 7: entre varias en proceso gana la más avanzada (Bautizado > Discipulado > Nuevo)', () => {
    expect(situacionPersona(grupo({
      conversiones: [
        convBase({ id: 'c1', estado: 'ps-nuevo' }),
        convBase({ id: 'c2', estado: 'ps-bautizado' }),
        convBase({ id: 'c3', estado: 'ps-discipulado' }),
      ],
    }))).toEqual({ texto: 'Bautizado', tono: 'info' });
  });

  it('regla 7: el «Seguimiento» legado entra por el alias como Discipulado (Fase 2)', () => {
    expect(situacionPersona(grupo({ conversiones: [convSeguimiento, convBase({ id: 'c2', estado: 'ps-discipulado' })] })))
      .toEqual({ texto: 'Discipulado', tono: 'info' });
    expect(situacionPersona(grupo({ conversiones: [convSeguimiento] })))
      .toEqual({ texto: 'Discipulado', tono: 'info' });
  });

  it('sin situación: solo estudiante → null (su tarjeta ya dice su estado)', () => {
    expect(situacionPersona(grupo({ estudiantes: [estBase({})] }))).toBeNull();
  });

  it('sin situación: solo diezmador → null', () => {
    expect(situacionPersona(grupo({ dadores: [diezmBase({}) as Diezmador] }))).toBeNull();
  });

  it('sin situación: sin procesos → null', () => {
    expect(situacionPersona(procesosVacios())).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════
// Guardia «ya registrada» (2026-11-07) — caso real de LemGil: la misma
// persona entró dos veces como nueva convertida y nacieron dos
// registros sin ningún aviso. Dos helpers la sostienen: cuál es la
// conversión que la persona YA tiene (para avisar en Misión) y qué
// fichas comparten el nombre que se está tecleando (para avisar en el
// formulario único de persona, donde el carné — la guardia dura — no
// es obligatorio y puede no venir tecleado).
// ════════════════════════════════════════════════════════════════════

describe('conversionDePersona: la conversión que la persona ya tiene', () => {
  const deP1 = (over: Partial<Conversion> = {}) => convBase({ personaId: 'p1', ...over });

  it('sin persona o sin conversiones suyas → null', () => {
    expect(conversionDePersona([], 'p1', PASOS_MISION_DEFECTO)).toBeNull();
    expect(conversionDePersona([deP1()], '', PASOS_MISION_DEFECTO)).toBeNull();
    expect(conversionDePersona([deP1()], null, PASOS_MISION_DEFECTO)).toBeNull();
    expect(conversionDePersona([deP1()], undefined, PASOS_MISION_DEFECTO)).toBeNull();
    expect(conversionDePersona([convBase({ personaId: 'p2' })], 'p1', PASOS_MISION_DEFECTO)).toBeNull();
  });

  it('devuelve la suya, ignorando las de otras personas', () => {
    const suya = deP1({ id: 'c7' });
    expect(conversionDePersona([convBase({ personaId: 'p2' }), suya], 'p1', PASOS_MISION_DEFECTO)?.id).toBe('c7');
  });

  it('con varias, prefiere la que NO está en una salida, aunque la salida sea más reciente', () => {
    const enCamino = deP1({ id: 'c-viva', estado: 'ps-discipulado', creado: '2024-01-01T00:00:00.000Z' });
    const apartada = deP1({ id: 'c-salida', estado: 'ps-apartado', creado: '2025-06-01T00:00:00.000Z' });
    expect(conversionDePersona([apartada, enCamino], 'p1', PASOS_MISION_DEFECTO)?.id).toBe('c-viva');
    expect(conversionDePersona([enCamino, apartada], 'p1', PASOS_MISION_DEFECTO)?.id).toBe('c-viva');
  });

  it('a igualdad de clase manda la más reciente por creación', () => {
    const vieja = deP1({ id: 'c-vieja', estado: 'ps-nuevo', creado: '2024-01-01T00:00:00.000Z' });
    const nueva = deP1({ id: 'c-nueva', estado: 'ps-integrado', creado: '2025-01-01T00:00:00.000Z' });
    expect(conversionDePersona([vieja, nueva], 'p1', PASOS_MISION_DEFECTO)?.id).toBe('c-nueva');
    // Y entre dos salidas, también la más reciente.
    const salidaVieja = deP1({ id: 's-vieja', estado: 'ps-apartado', creado: '2024-01-01T00:00:00.000Z' });
    const salidaNueva = deP1({ id: 's-nueva', estado: 'ps-fallecido', creado: '2025-01-01T00:00:00.000Z' });
    expect(conversionDePersona([salidaVieja, salidaNueva], 'p1', PASOS_MISION_DEFECTO)?.id).toBe('s-nueva');
  });
});

describe('posiblesRepetidas: aviso por nombre en el formulario único', () => {
  const datos = { nombre: 'María', apellido: 'González' };

  it('coincidencia exacta normalizada (acentos, mayúsculas y espacios no importan)', () => {
    const a = personaBase({ id: 'p1', nombre: 'MARÍA', apellido: '  González ', telefono: '', fechaNacimiento: '' });
    const r = posiblesRepetidas([a], { nombre: 'maria', apellido: 'GONZALEZ' });
    expect(r).toHaveLength(1);
    expect(r[0].persona.id).toBe('p1');
    expect(r[0].coincideTelefono).toBe(false);
    expect(r[0].coincideNacimiento).toBe(false);
  });

  it('un nombre PARCIAL no alcanza: otro apellido u otro nombre no avisan', () => {
    const a = personaBase({ id: 'p1', nombre: 'María', apellido: 'González Ruiz' });
    expect(posiblesRepetidas([a], datos)).toEqual([]);
    const b = personaBase({ id: 'p2', nombre: 'María José', apellido: 'González' });
    expect(posiblesRepetidas([b], datos)).toEqual([]);
    const c = personaBase({ id: 'p3', nombre: 'María', apellido: 'Pérez' });
    expect(posiblesRepetidas([c], datos)).toEqual([]);
  });

  it('sin nombre o sin apellido tecleados no hay aviso', () => {
    const a = personaBase({ id: 'p1' });
    expect(posiblesRepetidas([a], { nombre: '', apellido: 'González' })).toEqual([]);
    expect(posiblesRepetidas([a], { nombre: 'María', apellido: '' })).toEqual([]);
  });

  it('la fuerza ordena: quien además coincide en teléfono o nacimiento va primero', () => {
    const soloNombre = personaBase({ id: 'p-nombre', telefono: '5111', fechaNacimiento: '1980-01-01' });
    const conTelefono = personaBase({ id: 'p-tel', telefono: '(555) 123-4', fechaNacimiento: '' });
    const conAmbos = personaBase({ id: 'p-ambos', telefono: '5551234', fechaNacimiento: '1990-05-01' });
    const r = posiblesRepetidas(
      [soloNombre, conTelefono, conAmbos],
      { ...datos, telefono: '555-1234', fechaNacimiento: '1990-05-01' },
    );
    expect(r.map((x) => x.persona.id)).toEqual(['p-ambos', 'p-tel', 'p-nombre']);
    expect(r[0]).toMatchObject({ coincideTelefono: true, coincideNacimiento: true });
    expect(r[1]).toMatchObject({ coincideTelefono: true, coincideNacimiento: false });
    expect(r[2]).toMatchObject({ coincideTelefono: false, coincideNacimiento: false });
  });

  it('el teléfono se compara por dígitos y el nacimiento exacto', () => {
    const a = personaBase({ id: 'p1', telefono: '555 12 34', fechaNacimiento: '1990-05-01' });
    const r = posiblesRepetidas([a], { ...datos, telefono: '(555)1234', fechaNacimiento: '1990-05-01' });
    expect(r[0].coincideTelefono).toBe(true);
    expect(r[0].coincideNacimiento).toBe(true);
    const r2 = posiblesRepetidas([a], { ...datos, telefono: '5551234', fechaNacimiento: '1990-05-02' });
    expect(r2[0].coincideNacimiento).toBe(false);
  });

  it('al editar, excluirId aparta la propia ficha (pero no a una homónima)', () => {
    const yo = personaBase({ id: 'p1' });
    const otra = personaBase({ id: 'p2', telefono: '5999' });
    expect(posiblesRepetidas([yo], datos, 'p1')).toEqual([]);
    expect(posiblesRepetidas([yo, otra], datos, 'p1').map((x) => x.persona.id)).toEqual(['p2']);
  });
});
