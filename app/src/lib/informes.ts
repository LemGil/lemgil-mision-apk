import type {
  Aporte, AporteComun, Beneficiario, Campana, Certificado, Colaborador,
  Conversion, Curso, Diezmador, Entrega, Estudiante, Evangelismo, Grupo,
  Miembro, MiembroMinisterio, Ministerio, PasoSeguimiento,
} from './types';
import type { ReporteDatos } from './pdfExport';
import { etiquetaDe, rutaDe, salidasDe } from './pasosMision';
import { inRange } from './utils';

/**
 * Informes por departamento (2026-11-17): la mesa de salida de
 * Secretaría. Cada departamento arma su informe como secciones de
 * filas [indicador, valor] — la MISMA estructura se ve en pantalla
 * (tarjetas) y se comparte en PDF. Puro: la página pasa las
 * colecciones vivas y el período; aquí no se toca la base.
 *
 * El Informe General no pasa por aquí: es el consolidado de siempre
 * (ReporteDatos + exportReporteGeneralPDF). Negocios Adonay y
 * Comunicación quedan fuera por decisión de LemGil (2026-11-16).
 */

export type DepartamentoId =
  | 'general' | 'mision' | 'miembros' | 'academia'
  | 'bien-comun' | 'colaboradores' | 'manos-abiertas';

export interface DepartamentoInfo {
  id: DepartamentoId;
  etiqueta: string;
  emoji: string;
  color: string;
}

export const DEPARTAMENTOS: DepartamentoInfo[] = [
  { id: 'general', etiqueta: 'General', emoji: '🏛️', color: 'var(--gold)' },
  { id: 'mision', etiqueta: 'Misión', emoji: '🙏', color: 'var(--mision-purple)' },
  { id: 'miembros', etiqueta: 'Miembros y Ministerios', emoji: '⛪', color: 'var(--green)' },
  { id: 'academia', etiqueta: 'Academia', emoji: '🎓', color: 'var(--academia-teal)' },
  { id: 'bien-comun', etiqueta: 'Bien Común', emoji: '💰', color: 'var(--oro-apostolico)' },
  { id: 'colaboradores', etiqueta: 'Red de Colaboradores', emoji: '🤝', color: 'var(--mision-blue)' },
  { id: 'manos-abiertas', etiqueta: 'Manos Abiertas', emoji: '🤲', color: 'var(--manos-terracota)' },
];

export interface SeccionInforme {
  titulo: string;
  filas: [string, string][];
}

export interface InformeDepartamento {
  id: Exclude<DepartamentoId, 'general'>;
  titulo: string;
  emoji: string;
  secciones: SeccionInforme[];
}

export interface ContextoInforme {
  datos: ReporteDatos;
  conversiones: Conversion[];
  pasos: PasoSeguimiento[];
  grupos: Grupo[];
  evangelismos: Evangelismo[];
  miembros: Miembro[];
  ministerios: Ministerio[];
  miembrosMinisterios: MiembroMinisterio[];
  cursos: Curso[];
  estudiantes: Estudiante[];
  certificados: Certificado[];
  /** Los registros de dadores de Bien Común (la tabla `dadores`). */
  diezmadores: Diezmador[];
  aportesComun: AporteComun[];
  colaboradores: Colaborador[];
  aportes: Aporte[];
  beneficiarios: Beneficiario[];
  campanas: Campana[];
  entregas: Entrega[];
  periodo: { desde: string; hasta: string };
}

const num = (n: number) => n.toLocaleString('en-US');
const dinero = (n: number) => `$${(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fila = (etiqueta: string, valor: string | number): [string, string] => [etiqueta, String(valor)];

type Dept = InformeDepartamento['id'];

export function construirInforme(dept: Dept, ctx: ContextoInforme): InformeDepartamento {
  const info = DEPARTAMENTOS.find((d) => d.id === dept);
  const base = { id: dept, titulo: info?.etiqueta ?? dept, emoji: info?.emoji ?? '📄' };
  switch (dept) {
    case 'mision': return { ...base, secciones: seccionesMision(ctx) };
    case 'miembros': return { ...base, secciones: seccionesMiembros(ctx) };
    case 'academia': return { ...base, secciones: seccionesAcademia(ctx) };
    case 'bien-comun': return { ...base, secciones: seccionesBienComun(ctx) };
    case 'colaboradores': return { ...base, secciones: seccionesColaboradores(ctx) };
    case 'manos-abiertas': return { ...base, secciones: seccionesManos(ctx) };
  }
}

// ── Misión ──────────────────────────────────────────────────────────

function seccionesMision(ctx: ContextoInforme): SeccionInforme[] {
  const { datos, conversiones, pasos, grupos, periodo } = ctx;
  const enPeriodo = (f: string) => inRange(f || '', periodo.desde, periodo.hasta);
  const registrados = conversiones.filter((c) => enPeriodo(c.fecha)).length;

  // La ruta hoy: cuántas conversiones hay AHORA en cada paso.
  const ruta: [string, string][] = rutaDe(pasos).map((p) =>
    fila(etiquetaDe(pasos, p.id), num(conversiones.filter((c) => c.estado === p.id).length)));
  for (const s of salidasDe(pasos)) {
    ruta.push(fila(etiquetaDe(pasos, s.id), num(conversiones.filter((c) => c.estado === s.id).length)));
  }

  const porGrupo: [string, string][] = grupos.map((g) => {
    const enMision = conversiones.filter((c) => c.grupoId === g.id).length;
    const miembrosActivos = ctx.miembros.filter((m) => m.grupoId === g.id && m.estado === 'Activo').length;
    return fila(g.nombre, `${num(enMision)} en Misión · ${num(miembrosActivos)} miembros`);
  });

  return [
    {
      titulo: 'El período',
      filas: [
        fila('Registrados en Misión', num(registrados)),
        fila('Confesiones de fe', num(datos.censo.periodo.confesiones)),
        fila('Conversiones (permanecieron)', num(datos.censo.periodo.conversiones)),
        fila('Bajas del período', num(datos.censo.periodo.bajas)),
      ],
    },
    { titulo: 'La ruta hoy (foto actual)', filas: ruta },
    ...(porGrupo.length > 0 ? [{ titulo: 'Grupos', filas: porGrupo }] : []),
    {
      titulo: 'Evangelismos del período',
      filas: [
        fila('Evangelismos', num(datos.evang.total)),
        fila('Contactos alcanzados', num(datos.evang.contactos)),
        fila('Conversiones evangelísticas', num(datos.evang.conversiones)),
      ],
    },
  ];
}

// ── Miembros y Ministerios ──────────────────────────────────────────

function seccionesMiembros(ctx: ContextoInforme): SeccionInforme[] {
  const { miembros, ministerios, miembrosMinisterios } = ctx;
  const contar = (estado: Miembro['estado']) => miembros.filter((m) => m.estado === estado).length;
  const conGrupo = miembros.filter((m) => m.grupoId).length;

  const porMinisterio: [string, string][] = ministerios.map((min) => {
    const equipo = miembrosMinisterios.filter((a) => a.ministerioId === min.id);
    const lideres = equipo.filter((a) => a.rol === 'Líder').length;
    return fila(
      `${min.emoji ? `${min.emoji} ` : ''}${min.nombre}`,
      `${num(equipo.length)} en el equipo${lideres ? ` · ${num(lideres)} líder(es)` : ''}`,
    );
  });
  const sirviendo = new Set(miembrosMinisterios.map((a) => a.miembroId));
  const activosSinMinisterio = miembros.filter((m) => m.estado === 'Activo' && !sirviendo.has(m.id)).length;

  return [
    {
      titulo: 'Miembros',
      filas: [
        fila('Total de miembros', num(miembros.length)),
        fila('Activos', num(contar('Activo'))),
        fila('Inactivos', num(contar('Inactivo'))),
        fila('Disciplinados', num(contar('Disciplinado'))),
        fila('Trasladados', num(contar('Trasladado'))),
        fila('Fallecidos', num(contar('Fallecido'))),
        fila('Bautizados', num(miembros.filter((m) => m.bautizado).length)),
        fila('Con grupo', num(conGrupo)),
        fila('Sin grupo', num(miembros.length - conGrupo)),
      ],
    },
    {
      titulo: 'Ministerios',
      filas: [
        ...porMinisterio,
        fila('Miembros sirviendo en algún ministerio', num(sirviendo.size)),
        fila('Miembros activos sin ministerio', num(activosSinMinisterio)),
      ],
    },
  ];
}

// ── Academia ────────────────────────────────────────────────────────

function seccionesAcademia(ctx: ContextoInforme): SeccionInforme[] {
  const { datos, cursos, estudiantes } = ctx;
  const porCurso: [string, string][] = cursos.map((c) => {
    const delCurso = estudiantes.filter((e) => e.cursoId === c.id);
    const activos = delCurso.filter((e) => e.estado === 'Activo').length;
    const completados = delCurso.filter((e) => e.estado === 'Completado').length;
    return fila(c.nombre, `${num(activos)} activo(s) · ${num(completados)} completado(s)`);
  });
  return [
    {
      titulo: 'Academia',
      filas: [
        fila('Cursos totales', num(datos.academia.cursos)),
        fila('Cursos activos', num(datos.academia.cursosActivos)),
        fila('Estudiantes matriculados', num(datos.academia.estudiantes)),
        fila('Certificados emitidos (período)', num(datos.academia.certificados)),
      ],
    },
    ...(porCurso.length > 0 ? [{ titulo: 'Estudiantes por curso', filas: porCurso }] : []),
  ];
}

// ── Bien Común ──────────────────────────────────────────────────────

function seccionesBienComun(ctx: ContextoInforme): SeccionInforme[] {
  const { datos, aportesComun, periodo } = ctx;
  const enPeriodo = aportesComun.filter((a) => inRange(a.fecha || '', periodo.desde, periodo.hasta));
  const queAportaron = new Set(enPeriodo.map((a) => a.diezmadorId).filter(Boolean));
  const f = datos.finanzas;
  const pctPlan = f.bienComunPlan ? Math.round((f.bienComunTotal / f.bienComunPlan) * 100) : 0;
  return [
    {
      titulo: 'Registros del período',
      filas: [
        fila('Nº de registros', num(enPeriodo.length)),
        fila('Diezmos', dinero(f.bienComunDiezmos)),
        fila('Ofrendas', dinero(f.bienComunOfrendas)),
        fila('Total Bien Común', dinero(f.bienComunTotal)),
        fila('Diezmadores que aportaron', num(queAportaron.size)),
      ],
    },
    {
      titulo: 'Cumplimiento',
      filas: [
        fila('Plan mensual Bien Común', dinero(f.bienComunPlan)),
        fila('% del plan con el total del período', `${pctPlan}%`),
      ],
    },
  ];
}

// ── Red de Colaboradores ────────────────────────────────────────────

function seccionesColaboradores(ctx: ContextoInforme): SeccionInforme[] {
  const { datos, colaboradores, aportes, periodo } = ctx;
  const enPeriodo = aportes.filter((a) => inRange(a.fecha || '', periodo.desde, periodo.hasta));
  const queAportaron = new Set(enPeriodo.map((a) => a.colaboradorId));
  const f = datos.finanzas;
  const pctPlan = f.colaboradoresPlan ? Math.round((f.colaboradoresTotal / f.colaboradoresPlan) * 100) : 0;
  return [
    {
      titulo: 'La Red',
      filas: [
        fila('Colaboradores registrados', num(colaboradores.length)),
        fila('Activos', num(colaboradores.filter((c) => c.estado === 'Activo').length)),
        fila('Con aportes en el período', num(queAportaron.size)),
      ],
    },
    {
      titulo: 'Aportes del período por destino',
      filas: [
        fila('Ayuda / Ofrendas', dinero(f.colaboradoresAyuda)),
        fila('Misiones', dinero(f.colaboradoresMisiones)),
        fila('Manos Abiertas', dinero(f.colaboradoresManosAbiertas)),
        fila('Construcción', dinero(f.colaboradoresConstruccion)),
        fila('Otros', dinero(f.colaboradoresOtro)),
        fila('TOTAL', dinero(f.colaboradoresTotal)),
        fila('Plan mensual de la Red', dinero(f.colaboradoresPlan)),
        fila('% del plan con el total del período', `${pctPlan}%`),
      ],
    },
  ];
}

// ── Manos Abiertas ──────────────────────────────────────────────────

function seccionesManos(ctx: ContextoInforme): SeccionInforme[] {
  const { datos, beneficiarios } = ctx;
  const porTipo = (tipo: string) => beneficiarios.filter((b) => b.tipo === tipo).length;
  return [
    {
      titulo: 'Manos Abiertas',
      filas: [
        fila('Beneficiarios registrados', num(datos.manos.beneficiarios)),
        fila('Campañas (período)', num(datos.manos.campanas)),
        fila('Entregas (período)', num(datos.manos.entregas)),
        fila('Familias impactadas', num(datos.manos.familias)),
        fila('Personas alcanzadas', num(datos.manos.personas)),
      ],
    },
    {
      titulo: 'Beneficiarios por tipo',
      filas: [
        fila('Personas', num(porTipo('Persona'))),
        fila('Casas', num(porTipo('Casa'))),
        fila('Grupos', num(porTipo('Grupo'))),
        fila('Activos', num(beneficiarios.filter((b) => b.estado === 'Activo').length)),
        fila('Inactivos', num(beneficiarios.filter((b) => b.estado === 'Inactivo').length)),
      ],
    },
  ];
}
