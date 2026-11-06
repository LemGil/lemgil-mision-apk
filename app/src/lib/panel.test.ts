import { describe, it, expect } from 'vitest';
import {
  actividadReciente, resumenGrupos, kpiConversiones, barrasCrecimiento,
  certificadosDelPeriodo, sostenimientoContraMeta, alertasDelPanel, diasSinMovimiento,
} from './panel';
import type { EntradaAlertas } from './panel';
import { mapaPersonas } from './personaDatos';
import type {
  Aporte, Certificado, Conversion, Curso, Estudiante, Evangelismo, Grupo, Miembro, Persona,
} from './types';

// «Hoy» fijo: 15 de noviembre de 2026, mediodía local.
const HOY = new Date(2026, 10, 15, 12, 0, 0);

const personaBase = (over: Partial<Persona> = {}): Persona => ({
  id: 'p1', nombre: 'María', apellido: 'González', numeroIdentidad: '', telefono: '5551234',
  email: '', direccion: '', zona: 'Norte', fechaNacimiento: '', profesion: '',
  estadoCivil: 'Soltero', contactoPreferido: 'WhatsApp', bautizado: false,
  fechaBautismo: '', conyuge: '', hijos: '', grupoId: null, hermanoMayorId: null,
  creado: '2024-01-01T00:00:00.000Z', version: 1, ...over,
});

const convBase = (over: Partial<Conversion> = {}): Conversion => ({
  id: 'c1', nombre: 'María', apellido: 'González', telefono: '5551234',
  edad: '', direccion: '', familia: '', fecha: '2026-01-15', zona: 'Norte',
  lider: '', grupoId: '', hermanoMayorId: null, email: '', profesion: '',
  bautizado: false, fechaBautismo: '', conyuge: '', hijos: '',
  estado: 'ps-nuevo', notas: '', historial: [], creado: '2026-01-15T10:00:00',
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
  edad: '', cursoId: 'cur1', fecha: '2026-03-01', estado: 'Activo', notas: '',
  creado: '2026-03-01T10:00:00',
  zona: 'Norte', grupoId: null, hermanoMayorId: null, email: '', direccion: '',
  profesion: '', bautizado: false, fechaBautismo: '', conyuge: '', hijos: '',
  version: 1, ...over,
});

const evangBase = (over: Partial<Evangelismo> = {}): Evangelismo => ({
  id: 'ev1', tipo: 'Casa en casa', fecha: '2026-11-01', zona: 'Norte', liderId: null,
  contactos: 12, conversiones: 0, notas: '', creado: '2026-11-01T10:00:00',
  version: 1, ...over,
});

const cursoBase = (over: Partial<Curso> = {}): Curso => ({
  id: 'cur1', nombre: 'Fundamentos', instructor: '', nivel: 'Basico', duracion: '',
  emoji: '📖', color: '', estado: 'Activo', descripcion: '',
  creado: '2026-01-01T10:00:00', version: 1, ...over,
});

const certBase = (over: Partial<Certificado> = {}): Certificado => ({
  id: 'ct1', estId: 'e1', cursoId: 'cur1', fecha: '2026-05-01', calificacion: 'Aprobado',
  observaciones: '', emitido: '2026-05-01T10:00:00', version: 1, ...over,
});

const aporteBase = (over: Partial<Aporte> = {}): Aporte => ({
  id: 'a1', colaboradorId: 'd1', fecha: '2026-11-05', monto: 100, tipo: 'Diezmo',
  metodo: 'Efectivo', referencia: '', notas: '', creado: '2026-11-05T10:00:00',
  version: 1, ...over,
});

const grupo = (id: string, miembrosGuardados: number): Grupo =>
  ({ id, nombre: id, miembros: miembrosGuardados } as Grupo);

/* ── Actividad reciente ──────────────────────────────────────────── */

describe('actividad reciente del Panel', () => {
  const lider = personaBase({ id: 'pl', nombre: 'Pedro', apellido: 'Ruiz' });
  const convertida = personaBase({ id: 'p1', nombre: 'Ana', apellido: 'Díaz', zona: 'Sur', hermanoMayorId: 'pl' });
  const mapa = mapaPersonas([lider, convertida]);

  it('resuelve nombre, zona y líder desde la persona (la ficha cruda viene vacía)', () => {
    const cruda = convBase({
      id: 'c9', nombre: '', apellido: '', zona: '', lider: '', personaId: 'p1',
      estado: 'ps-nuevo', creado: '2026-11-10T10:00:00',
    });
    const [a] = actividadReciente({
      conversiones: [cruda], evangelismos: [], estudiantes: [], certificados: [],
      cursos: [], personasMap: mapa,
    });
    expect(a.title).toBe('Ana Díaz — Nuevo');
    expect(a.meta).toContain('Sur');
    expect(a.meta).toContain('Pedro Ruiz');
    expect(a.href).toBe('/mision?ver=c9');
    expect(a.ts).toBe('2026-11-10T10:00:00');
  });

  it('mezcla las corrientes ordenadas por timestamp real, descendente', () => {
    const convs = [
      convBase({ id: 'c1', creado: '2026-11-01T10:00:00' }),
      convBase({ id: 'c2', creado: '2026-11-05T10:00:00' }),
      convBase({ id: 'c3', creado: '2026-11-03T10:00:00' }),
    ];
    const acts = actividadReciente({
      conversiones: convs,
      evangelismos: [evangBase({ creado: '2026-11-14T10:00:00', liderId: 'pl' })],
      estudiantes: [estBase({ creado: '2026-11-12T10:00:00' })],
      certificados: [], cursos: [cursoBase()], personasMap: mapa,
    });
    expect(acts.map((a) => a.ts)).toEqual([
      '2026-11-14T10:00:00', '2026-11-12T10:00:00', '2026-11-05T10:00:00',
      '2026-11-03T10:00:00', '2026-11-01T10:00:00',
    ]);
    expect(acts[0].meta).toContain('Pedro Ruiz');
    expect(acts[0].href).toBe('/mision');
    expect(acts[1].href).toBe('/academia');
  });

  it('por corriente toma las 5 más recientes POR TIMESTAMP, no el final del array', () => {
    const convs = [4, 1, 7, 3, 6, 2, 5].map((d) =>
      convBase({ id: `c${d}`, creado: `2026-11-0${d}T10:00:00` }));
    const acts = actividadReciente({
      conversiones: convs, evangelismos: [], estudiantes: [], certificados: [],
      cursos: [], personasMap: mapa,
    });
    expect(acts.map((a) => a.ts)).toEqual([
      '2026-11-07T10:00:00', '2026-11-06T10:00:00', '2026-11-05T10:00:00',
      '2026-11-04T10:00:00', '2026-11-03T10:00:00',
    ]);
  });
});

/* ── Grupos derivados ────────────────────────────────────────────── */

describe('resumen de grupos desde el conteo derivado', () => {
  it('un grupo con miembros reales cuenta activo aunque su contador guardado sea 0', () => {
    const grupos = [grupo('g1', 0), grupo('g2', 0)];
    const miembros = [miembroBase({ id: 'm1', grupoId: 'g1', estado: 'Activo' })];
    const r = resumenGrupos(grupos, miembros, []);
    expect(r.activos).toBe(1);
    expect(r.vacios).toBe(1);
  });

  it('una conversión en proceso también ocupa el grupo', () => {
    const r = resumenGrupos([grupo('g1', 0)], [], [convBase({ grupoId: 'g1', estado: 'ps-discipulado' })]);
    expect(r.activos).toBe(1);
    expect(r.vacios).toBe(0);
  });
});

/* ── KPI de conversiones ─────────────────────────────────────────── */

describe('KPI de conversiones honesto', () => {
  const convs = [
    convBase({ id: 'a', fecha: '2026-11-03' }),
    convBase({ id: 'b', fecha: '2026-11-12' }),
    convBase({ id: 'c', fecha: '2026-08-12' }),
    convBase({ id: 'd', fecha: '2025-11-20' }),
    convBase({ id: 'e', fecha: '2025-03-01' }),
  ];

  it('sin filtro: mes en curso con su flecha, etiqueta de totales', () => {
    const k = kpiConversiones(convs, '', HOY);
    expect(k.total).toBe(5);
    expect(k.mesCount).toBe(2);
    expect(k.etiqueta).toBe('Conversiones Totales');
    expect(k.change).toBe('▲ +2 este mes');
    expect(k.changeDir).toBe('up');
  });

  it('sin filtro y mes en cero: se dice tal cual, en negativo', () => {
    const k = kpiConversiones([convBase({ fecha: '2026-08-01' })], '', HOY);
    expect(k.mesCount).toBe(0);
    expect(k.change).toBe('Sin conversiones este mes');
    expect(k.changeDir).toBe('down');
  });

  it('con filtro: el texto nombra el mes y el año filtrados, nunca «este mes»', () => {
    const k = kpiConversiones(convs, '2025', HOY);
    expect(k.total).toBe(2);
    expect(k.mesCount).toBe(1);
    expect(k.etiqueta).toBe('Conversiones 2025');
    expect(k.change).toBe('+1 en noviembre de 2025');
    expect(k.changeDir).toBe('up');
  });

  it('con filtro y mes en cero: también honesto', () => {
    const k = kpiConversiones([convBase({ fecha: '2025-03-01' })], '2025', HOY);
    expect(k.change).toBe('Sin conversiones en noviembre de 2025');
    expect(k.changeDir).toBe('down');
  });
});

/* ── Gráfico ─────────────────────────────────────────────────────── */

describe('barras de crecimiento', () => {
  it('sin filtro: últimos 6 meses hasta hoy, el actual resaltado', () => {
    const b = barrasCrecimiento([convBase({ fecha: '2026-11-02' }), convBase({ id: 'x', fecha: '2026-09-02' })], '', HOY);
    expect(b.map((x) => x.key)).toEqual(['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
    expect(b[5].highlight).toBe(true);
    expect(b[5].val).toBe(1);
    expect(b[3].val).toBe(1);
    expect(b.filter((x) => x.highlight)).toHaveLength(1);
  });

  it('año anterior filtrado: julio–diciembre de ese año, sin resaltado', () => {
    const b = barrasCrecimiento([convBase({ fecha: '2025-12-24' }), convBase({ id: 'x', fecha: '2025-01-10' })], '2025', HOY);
    expect(b.map((x) => x.key)).toEqual(['2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12']);
    expect(b.map((x) => x.label)).toEqual(['jul', 'ago', 'sep', 'oct', 'nov', 'dic']);
    expect(b[5].val).toBe(1);
    expect(b.every((x) => !x.highlight)).toBe(true);
  });
});

/* ── Metas coherentes ────────────────────────────────────────────── */

describe('metas con períodos coherentes', () => {
  it('certificados sin filtro: solo el año en curso', () => {
    const certs = [
      certBase({ id: '1', emitido: '2026-05-01T10:00:00' }),
      certBase({ id: '2', emitido: '2025-05-01T10:00:00' }),
      certBase({ id: '3', emitido: '2024-05-01T10:00:00' }),
    ];
    expect(certificadosDelPeriodo(certs, '', HOY)).toBe(1);
    expect(certificadosDelPeriodo(certs, '2025', HOY)).toBe(1);
    expect(certificadosDelPeriodo(certs, '2024', HOY)).toBe(1);
  });

  it('sostenimiento sin filtro: el mes en curso contra la meta mensual', () => {
    const aportes = [
      aporteBase({ id: '1', fecha: '2026-11-05', monto: 300 }),
      aporteBase({ id: '2', fecha: '2026-10-05', monto: 900 }),
    ];
    const s = sostenimientoContraMeta(aportes, '', 8000, HOY);
    expect(s.actual).toBe(300);
    expect(s.meta).toBe(8000);
    expect(s.etiqueta).toBe('💰 Sostenimiento: $8,000/mes');
  });

  it('sostenimiento con filtro: el total del año contra la meta mensual × 12', () => {
    const aportes = [
      aporteBase({ id: '1', fecha: '2026-11-05', monto: 300 }),
      aporteBase({ id: '2', fecha: '2026-10-05', monto: 900 }),
      aporteBase({ id: '3', fecha: '2025-10-05', monto: 5000 }),
    ];
    const s = sostenimientoContraMeta(aportes, '2026', 8000, HOY);
    expect(s.actual).toBe(1200);
    expect(s.meta).toBe(96000);
    expect(s.etiqueta).toBe('💰 Sostenimiento 2026: $96,000 en el año');
  });
});

/* ── Alertas ─────────────────────────────────────────────────────── */

describe('alertas del Panel', () => {
  const entrada = (over: Partial<EntradaAlertas> = {}): EntradaAlertas => ({
    grupos: [], miembros: [], conversiones: [], estudiantes: [], cursos: [],
    evangelismos: [], personasMap: new Map(), mesCount: 1, hayConversiones: true,
    filterAno: '', hoy: HOY, ...over,
  });

  it('sin nada que avisar: «todo en orden»', () => {
    const a = alertasDelPanel(entrada());
    expect(a).toHaveLength(1);
    expect(a[0].tipo).toBe('ok');
  });

  it('los cursos archivados ya no alertan', () => {
    const a = alertasDelPanel(entrada({ cursos: [cursoBase({ estado: 'Archivado' })] }));
    expect(a.every((x) => !x.texto.includes('archivad'))).toBe(true);
    expect(a[0].tipo).toBe('ok');
  });

  it('orden por severidad: danger, warn, info — y corte a 5', () => {
    const pSin = personaBase({ id: 'ps', grupoId: null, hermanoMayorId: null });
    const a = alertasDelPanel(entrada({
      mesCount: 0,
      grupos: [grupo('g1', 0)],
      miembros: [miembroBase({ personaId: 'ps', estado: 'Activo' })],
      personasMap: mapaPersonas([pSin]),
      conversiones: [convBase({ id: 'cv', estado: 'ps-nuevo', creado: '2026-10-20T12:00:00', historial: [] })],
      estudiantes: [estBase({ estado: 'Pausado' })],
      cursos: [cursoBase({ estado: 'Borrador' })],
      evangelismos: [evangBase()],
    }));
    expect(a).toHaveLength(5);
    expect(a[0].tipo).toBe('danger');
    expect(a.slice(1, 4).every((x) => x.tipo === 'warn')).toBe(true);
    expect(a.every((x) => x.href)).toBe(true);
    expect(a.every((x) => !/[🔴🟡🔵🟢]/.test(x.texto))).toBe(true);
  });

  it('conversiones estancadas: >14 días sin movimiento cuentan; las recientes o con historial fresco, no', () => {
    // F10: la cuenta nace de cuándo entró en su estado actual
    // (fechaDeEstado: su fecha de conversión si el historial no dice
    // otra cosa) — los fixtures fijan `fecha`, no solo `creado`.
    const vieja = convBase({ id: 'v', estado: 'ps-nuevo', fecha: '2026-10-20', creado: '2026-10-20T12:00:00', historial: [] });
    const reciente = convBase({ id: 'r', estado: 'ps-nuevo', fecha: '2026-11-12', creado: '2026-11-12T12:00:00', historial: [] });
    const conHistorial = convBase({
      id: 'h', estado: 'Nuevo', creado: '2026-10-01T12:00:00',
      historial: [{ fecha: '2026-11-13', estado: 'Nuevo', nota: 'Visita de seguimiento' }],
    });
    const enProceso = convBase({ id: 'd', estado: 'Discipulado', creado: '2026-09-01T12:00:00', historial: [] });
    const a = alertasDelPanel(entrada({ conversiones: [vieja, reciente, conHistorial, enProceso] }));
    const est = a.find((x) => x.texto.includes('sin movimiento'));
    expect(est).toBeDefined();
    expect(est!.texto).toContain('1 conversión');
    expect(est!.href).toBe('/mision');
    expect(diasSinMovimiento(vieja, HOY)).toBeGreaterThan(14);
    expect(diasSinMovimiento(conHistorial, HOY)).toBeLessThanOrEqual(14);
  });

  it('la alerta de estancadas nombra los casos con sus días y enlace directo a su ficha', () => {
    const ana = personaBase({ id: 'pa', nombre: 'Ana', apellido: 'Pérez' });
    const luis = personaBase({ id: 'pl', nombre: 'Luis', apellido: 'Díaz' });
    const a = alertasDelPanel(entrada({
      conversiones: [
        convBase({ id: 'v1', personaId: 'pa', nombre: '', apellido: '', estado: 'ps-nuevo', fecha: '2026-10-20', creado: '2026-10-20T12:00:00', historial: [] }),
        convBase({ id: 'v2', personaId: 'pl', nombre: '', apellido: '', estado: 'Nuevo', fecha: '2026-10-01', creado: '2026-10-01T12:00:00', historial: [] }),
      ],
      personasMap: mapaPersonas([ana, luis]),
    }));
    const est = a.find((x) => x.texto.includes('sin movimiento'));
    expect(est?.items).toHaveLength(2);
    // Ordenadas por días descendente: Luis (45) antes que Ana (26).
    expect(est!.items![0].texto).toContain('Luis Díaz');
    expect(est!.items![0].texto).toContain('45 días');
    expect(est!.items![0].href).toBe('/mision?ver=v2');
    expect(est!.items![1].texto).toContain('Ana Pérez');
    expect(est!.items![1].texto).toContain('26 días');
    expect(est!.items![1].href).toBe('/mision?ver=v1');
  });

  it('los casos nombrados se cortan a 8 y el resto se resume', () => {
    const muchas = Array.from({ length: 10 }, (_, i) =>
      convBase({ id: `x${i}`, estado: 'Nuevo', creado: '2026-10-01T12:00:00', historial: [] }));
    const a = alertasDelPanel(entrada({ conversiones: muchas }));
    const est = a.find((x) => x.texto.includes('sin movimiento'));
    expect(est?.items).toHaveLength(9);
    expect(est!.items![8].texto).toContain('y 2 más');
    expect(est!.items![8].href).toBe('/mision');
  });

  it('la alerta de «sin conversiones este mes» no se genera con filtro de año', () => {
    const a = alertasDelPanel(entrada({ mesCount: 0, filterAno: '2025' }));
    expect(a.every((x) => x.tipo !== 'danger')).toBe(true);
  });

  it('miembros activos sin grupo y sin hermano mayor, resueltos desde su persona', () => {
    const conTodo = personaBase({ id: 'p1', grupoId: 'g1', hermanoMayorId: 'p9' });
    const sinNada = personaBase({ id: 'p2', grupoId: null, hermanoMayorId: null });
    const a = alertasDelPanel(entrada({
      miembros: [
        miembroBase({ id: 'm1', personaId: 'p1', estado: 'Activo' }),
        miembroBase({ id: 'm2', personaId: 'p2', estado: 'Activo' }),
        miembroBase({ id: 'm3', personaId: 'p2', estado: 'Inactivo' }),
      ],
      personasMap: mapaPersonas([conTodo, sinNada]),
    }));
    const sg = a.find((x) => x.texto.includes('sin grupo'));
    const sh = a.find((x) => x.texto.includes('sin hermano mayor'));
    expect(sg?.texto).toContain('1 miembro');
    expect(sg?.href).toBe('/miembros');
    expect(sh?.texto).toContain('1 miembro');
  });

  it('sin grupo y sin hermano mayor nombran al miembro y enlazan a su ficha', () => {
    const pedro = personaBase({ id: 'p2', nombre: 'Pedro', apellido: 'Ruiz', grupoId: null, hermanoMayorId: null });
    const a = alertasDelPanel(entrada({
      miembros: [miembroBase({ id: 'm2', personaId: 'p2', estado: 'Activo' })],
      personasMap: mapaPersonas([pedro]),
    }));
    const sg = a.find((x) => x.texto.includes('sin grupo'));
    const sh = a.find((x) => x.texto.includes('sin hermano mayor'));
    expect(sg?.items).toEqual([{ texto: 'Pedro Ruiz', href: '/miembros?ver=m2' }]);
    expect(sh?.items).toEqual([{ texto: 'Pedro Ruiz', href: '/miembros?ver=m2' }]);
  });

  it('grupos vacíos por el conteo derivado, no por el contador guardado', () => {
    const a = alertasDelPanel(entrada({
      grupos: [grupo('g1', 99), grupo('g2', 0)],
      miembros: [miembroBase({ grupoId: 'g1', estado: 'Activo' })],
    }));
    const gv = a.find((x) => x.texto.includes('sin miembros activos'));
    expect(gv?.texto).toContain('1 grupo');
    expect(gv?.href).toBe('/miembros');
  });
});

// Guardia (regresión 2026-11-02): los enlaces del Panel deben existir como
// rutas reales en App.tsx. El paquete del Panel usó '/mision-biblica' y la
// ruta verdadera es '/mision': al tocar esos atajos no había ruta que
// coincidiera y la pantalla quedaba en blanco.
import appSrc from '../App.tsx?raw';
import panelSrc from './panel.ts?raw';
import dashSrc from '../pages/Dashboard.tsx?raw';

describe('las rutas que usa el Panel existen en App.tsx', () => {
  const rutas = [...appSrc.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);
  it('declara las rutas destino del Panel', () => {
    for (const p of ['/mision', '/academia', '/manos-abiertas', '/miembros', '/reportes']) {
      expect(rutas).toContain(p);
    }
  });
  it('ninguna salida del panel apunta a una ruta inexistente', () => {
    for (const src of [panelSrc, dashSrc]) {
      const destinos = [...src.matchAll(/(?:href:|to=)\s*['"`]\/([a-z-]+)/g)].map((m) => '/' + m[1]);
      for (const d of destinos) expect(rutas).toContain(d);
    }
  });
});

describe('Pulido · F10: diasSinMovimiento cuenta desde que entró en su estado ACTUAL', () => {
  it('una nota reciente en OTRO estado ya no «desestanca»: manda la entrada en su estado', () => {
    // Entró en el paso de inicio el 1.º de septiembre; el historial trae
    // una entrada fresca de OTRO estado (una nota de seguimiento vieja
    // mal fechada o un estado ya dejado). Con el criterio anterior
    // (último movimiento de cualquier clase) daría 1 día; con la
    // semántica única de fechaDeEstado da los días en su estado: 75.
    const c = convBase({
      id: 'f10', estado: 'ps-nuevo', fecha: '2026-09-01', creado: '2026-09-01T12:00:00',
      historial: [
        { fecha: '2026-09-01', estado: 'Nuevo', nota: 'Registro inicial' },
        { fecha: '2026-11-14', estado: 'Discipulado', nota: 'Entrada de otro estado' },
      ],
    });
    expect(diasSinMovimiento(c, HOY)).toBe(75);
  });

  it('si volvió a entrar en su estado, cuenta desde la entrada MÁS RECIENTE en él', () => {
    const c = convBase({
      id: 'f10b', estado: 'ps-discipulado', fecha: '2026-09-01', creado: '2026-09-01T12:00:00',
      historial: [
        { fecha: '2026-09-10', estado: 'Discipulado', nota: 'Entró' },
        { fecha: '2026-11-13', estado: 'ps-discipulado', nota: 'Retomó' },
      ],
    });
    expect(diasSinMovimiento(c, HOY)).toBe(2);
  });
});
