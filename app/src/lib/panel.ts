import type {
  Aporte, Certificado, Conversion, Curso, Estudiante, Evangelismo, Grupo, Miembro, Persona,
} from './types';
import { conversionConDatos, estudianteConDatos, evangelismoConDatos } from './personaDatos';
import { conteoGrupo } from './grupoStats';
import { monthKey, MS, MS_FULL } from './utils';

/**
 * PLAN DEL PANEL (mejoras aprobadas por LemGil, 2026-11-02): la lógica
 * del Panel Principal vive aquí como funciones PURAS y probadas; la
 * página solo las pinta. Tres bloques: (1) verdad en las cifras — la
 * actividad resuelve nombres desde la PERSONA y se ordena por su
 * timestamp real, los grupos cuentan desde el conteo derivado de
 * `grupoStats` y las metas comparan períodos coherentes; (2) alertas
 * accionables y con señal; (3) el pulido visual queda en la página.
 */

const pad2 = (n: number) => String(n).padStart(2, '0');
const tsVal = (iso: string) => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
};

/* ── Bloque 1 · Actividad reciente ─────────────────────────────────── */

export interface ActividadPanel {
  icon: string;
  bg: string;
  title: string;
  meta: string;
  /** Timestamp ISO real del hecho: el orden y el «hace…» parten de aquí. */
  ts: string;
  href?: string;
}

export interface EntradaActividad {
  conversiones: Conversion[];
  evangelismos: Evangelismo[];
  estudiantes: Estudiante[];
  certificados: Certificado[];
  cursos: Curso[];
  personasMap: Map<string, Persona>;
}

/** Las 5 más recientes de una corriente, POR TIMESTAMP (no por orden de claves). */
function recientes<T>(arr: T[], ts: (x: T) => string): T[] {
  return [...arr].sort((a, b) => tsVal(ts(b)) - tsVal(ts(a))).slice(0, 5);
}

/**
 * La actividad reciente del Panel, rehecha: los nombres, la zona y el
 * líder se resuelven desde la persona (decoradores de `personaDatos`,
 * como en Misión y Academia) — antes se leían los campos dormidos de la
 * ficha y las altas nuevas salían sin nombre —; cada corriente aporta
 * sus 5 hechos más recientes por timestamp, se mezclan, se ordenan
 * descendente y se muestran 5. Antes se ordenaba por el TEXTO relativo
 * («hace 5m») y se tomaba `slice(-5)` del orden de claves (azar).
 */
export function actividadReciente(e: EntradaActividad): ActividadPanel[] {
  const all: ActividadPanel[] = [];
  recientes(e.conversiones, (c) => c.creado).forEach((c) => {
    const v = conversionConDatos(c, e.personasMap);
    const nombre = `${v.nombre} ${v.apellido}`.trim();
    all.push({
      icon: '🌱', bg: 'var(--mision-purple-soft)',
      title: `${nombre || 'Conversión sin nombre'} — ${c.estado}`,
      meta: [v.zona, v.lider || 'Sin líder'].filter((x) => x && x.trim()).join(' · '),
      ts: c.creado,
      href: `/mision-biblica?ver=${c.id}`,
    });
  });
  recientes(e.evangelismos, (ev) => ev.creado).forEach((ev) => {
    const v = evangelismoConDatos(ev, e.personasMap);
    all.push({
      icon: '📢', bg: 'var(--oro-luz-soft)',
      title: `${ev.tipo} — ${ev.contactos} contactos`,
      meta: [ev.zona, v.liderNombre || 'Sin líder'].filter((x) => x && x.trim()).join(' · '),
      ts: ev.creado,
      href: '/mision-biblica',
    });
  });
  recientes(e.estudiantes, (es) => es.creado).forEach((es) => {
    const v = estudianteConDatos(es, e.personasMap);
    const curso = e.cursos.find((c) => c.id === es.cursoId);
    const nombre = `${v.nombre} ${v.apellido}`.trim();
    all.push({
      icon: '🎓', bg: 'var(--academia-teal-soft)',
      title: `${nombre || 'Estudiante sin nombre'} matriculado/a`,
      meta: curso ? `${curso.emoji} ${curso.nombre}` : 'Sin curso',
      ts: es.creado,
      href: '/academia',
    });
  });
  recientes(e.certificados, (c) => c.emitido).forEach((c) => {
    const est = e.estudiantes.find((x) => x.id === c.estId);
    const v = est ? estudianteConDatos(est, e.personasMap) : undefined;
    const nombre = v ? `${v.nombre} ${v.apellido}`.trim() : '';
    all.push({
      icon: '🏆', bg: 'var(--gold-soft)',
      title: `Certificado emitido — ${c.calificacion}`,
      meta: nombre || 'Estudiante',
      ts: c.emitido,
      href: '/academia',
    });
  });
  return all.sort((a, b) => tsVal(b.ts) - tsVal(a.ts)).slice(0, 5);
}

/* ── Bloque 1 · Grupos desde el conteo derivado ────────────────────── */

export interface ResumenGrupos {
  /** Grupos con alguien asignado (miembros activos + conversiones en proceso). */
  activos: number;
  /** Grupos con el conteo derivado en 0. */
  vacios: number;
}

/**
 * Activos y vacíos según `conteoGrupo` (la misma fuente que la página
 * de Miembros). Antes el Panel leía `grupo.miembros`, un contador que
 * se crea en 0 y nadie mantiene: daba 0 grupos activos y una alerta de
 * «grupos sin miembros» permanente, contradiciendo a Miembros.
 */
export function resumenGrupos(grupos: Grupo[], miembros: Miembro[], conversiones: Conversion[]): ResumenGrupos {
  let activos = 0;
  let vacios = 0;
  for (const g of grupos) {
    if (conteoGrupo(g.id, miembros, conversiones).totalAsignados > 0) activos++;
    else vacios++;
  }
  return { activos, vacios };
}

/* ── Bloque 1 · KPI de conversiones honesto ────────────────────────── */

export interface KpiConversiones {
  total: number;
  mesCount: number;
  etiqueta: string;
  change: string;
  changeDir: 'up' | 'down';
}

/**
 * Con filtro de año, «este mes» deja de llamarse «este mes» (es el mes
 * en curso DE ESE año) y la etiqueta del KPI nombra el año; sin filtro,
 * 0 conversiones en el mes se dice tal cual y en negativo — antes era
 * siempre «▲ +N este mes» en verde, también con 0.
 */
export function kpiConversiones(conversiones: Conversion[], filterAno: string, hoy: Date): KpiConversiones {
  const mes = hoy.getMonth();
  const claveMes = filterAno
    ? `${filterAno}-${pad2(mes + 1)}`
    : `${hoy.getFullYear()}-${pad2(mes + 1)}`;
  const delPeriodo = filterAno
    ? conversiones.filter((c) => c.fecha?.startsWith(filterAno))
    : conversiones;
  const mesCount = delPeriodo.filter((c) => monthKey(c.fecha) === claveMes).length;
  let change: string;
  if (filterAno) {
    change = mesCount > 0
      ? `+${mesCount} en ${MS_FULL[mes]} de ${filterAno}`
      : `Sin conversiones en ${MS_FULL[mes]} de ${filterAno}`;
  } else {
    change = mesCount > 0 ? `▲ +${mesCount} este mes` : 'Sin conversiones este mes';
  }
  return {
    total: delPeriodo.length,
    mesCount,
    etiqueta: filterAno ? `Conversiones ${filterAno}` : 'Conversiones Totales',
    change,
    changeDir: mesCount > 0 ? 'up' : 'down',
  };
}

/* ── Bloque 1 · Gráfico de crecimiento ─────────────────────────────── */

export interface BarraCrecimiento {
  key: string;
  label: string;
  val: number;
  pct: number;
  highlight: boolean;
}

/**
 * Sin filtro o con el año en curso: los últimos 6 meses hasta hoy, con
 * el mes actual resaltado. Con un año ANTERIOR filtrado: julio–diciembre
 * de ese año (antes se construían los meses alrededor del mes actual de
 * ese año y no se resaltaba nada con sentido).
 */
export function barrasCrecimiento(conversiones: Conversion[], filterAno: string, hoy: Date): BarraCrecimiento[] {
  const fuente = filterAno
    ? conversiones.filter((c) => c.fecha?.startsWith(filterAno))
    : conversiones;
  const counts: Record<string, number> = {};
  fuente.forEach((c) => {
    const k = monthKey(c.fecha);
    if (k) counts[k] = (counts[k] || 0) + 1;
  });
  const meses: { key: string; label: string; highlight: boolean }[] = [];
  if (filterAno && parseInt(filterAno, 10) < hoy.getFullYear()) {
    for (let m = 6; m <= 11; m++) {
      meses.push({ key: `${filterAno}-${pad2(m + 1)}`, label: MS[m], highlight: false });
    }
  } else {
    const curKey = `${hoy.getFullYear()}-${pad2(hoy.getMonth() + 1)}`;
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
      meses.push({ key, label: MS[d.getMonth()], highlight: key === curKey });
    }
  }
  const conVal = meses.map((m) => ({ ...m, val: counts[m.key] || 0 }));
  const max = Math.max(1, ...conVal.map((x) => x.val));
  return conVal.map((x) => ({ ...x, pct: Math.round((x.val / max) * 100) }));
}

/* ── Bloque 1 · Metas con períodos coherentes ──────────────────────── */

/**
 * Certificados del período de la meta Academia: sin filtro, SOLO el año
 * en curso (antes se contaba todo el histórico contra la meta anual);
 * con filtro, los del año filtrado.
 */
export function certificadosDelPeriodo(certificados: Certificado[], filterAno: string, hoy: Date): number {
  const anio = filterAno || String(hoy.getFullYear());
  return certificados.filter((c) => c.emitido?.startsWith(anio)).length;
}

export interface SostenimientoMeta {
  actual: number;
  meta: number;
  etiqueta: string;
}

/**
 * La meta de sostenimiento es MENSUAL: sin filtro se compara el mes en
 * curso contra la meta del mes; con un año filtrado se compara el TOTAL
 * de ese año contra la meta mensual × 12, y la etiqueta lo dice (antes
 * se sumaba el año entero contra la meta de un mes y el % se disparaba).
 */
export function sostenimientoContraMeta(aportes: Aporte[], filterAno: string, metaMensual: number, hoy: Date): SostenimientoMeta {
  if (filterAno) {
    const actual = aportes
      .filter((a) => a.fecha?.startsWith(filterAno))
      .reduce((s, a) => s + (a.monto || 0), 0);
    const meta = metaMensual * 12;
    return { actual, meta, etiqueta: `💰 Sostenimiento ${filterAno}: $${meta.toLocaleString()} en el año` };
  }
  const claveMes = `${hoy.getFullYear()}-${pad2(hoy.getMonth() + 1)}`;
  const actual = aportes
    .filter((a) => monthKey(a.fecha) === claveMes)
    .reduce((s, a) => s + (a.monto || 0), 0);
  return { actual, meta: metaMensual, etiqueta: `💰 Sostenimiento: $${metaMensual.toLocaleString()}/mes` };
}

/* ── Bloque 2 · Alertas accionables, con señal ─────────────────────── */

export type TipoAlerta = 'danger' | 'warn' | 'info' | 'ok';

export interface AlertaPanel {
  tipo: TipoAlerta;
  /** Sin emojis de color: el icono se pinta una sola vez según el tipo. */
  texto: string;
  /** Destino al tocar la alerta (la lista a la que lleva). */
  href?: string;
}

export interface EntradaAlertas {
  grupos: Grupo[];
  miembros: Miembro[];
  conversiones: Conversion[];
  estudiantes: Estudiante[];
  cursos: Curso[];
  evangelismos: Evangelismo[];
  personasMap: Map<string, Persona>;
  /** Conversiones del mes según el KPI (solo se usa sin filtro). */
  mesCount: number;
  hayConversiones: boolean;
  filterAno: string;
  hoy: Date;
}

/** Días desde el último movimiento de una conversión: su alta o la última entrada del historial, lo que sea posterior. */
export function diasSinMovimiento(c: Conversion, hoy: Date): number {
  let ultimo = tsVal(c.creado);
  for (const h of c.historial ?? []) {
    const t = tsVal(h.fecha);
    if (t > ultimo) ultimo = t;
  }
  if (ultimo === 0) return 0;
  return Math.floor((hoy.getTime() - ultimo) / 86400000);
}

const SEVERIDAD: Record<TipoAlerta, number> = { danger: 0, warn: 1, info: 2, ok: 3 };

/**
 * Las alertas del Panel: ordenadas por severidad y cortadas a 5, cada
 * una con el destino al que lleva. Fuera la de «cursos archivados»
 * (archivar es higiene, no un problema); dentro la señal que importa:
 * conversiones nuevas estancadas (>14 días sin moverse) y miembros
 * activos cuya persona no tiene grupo o no tiene hermano mayor.
 */
export function alertasDelPanel(e: EntradaAlertas): AlertaPanel[] {
  const out: AlertaPanel[] = [];

  if (!e.filterAno && e.mesCount === 0 && e.hayConversiones) {
    out.push({ tipo: 'danger', texto: 'Sin conversiones registradas este mes', href: '/mision-biblica' });
  }

  const { vacios } = resumenGrupos(e.grupos, e.miembros, e.conversiones);
  if (vacios > 0) {
    out.push({ tipo: 'warn', texto: `${vacios} grupo(s) sin miembros activos`, href: '/miembros' });
  }

  const estancadas = e.conversiones.filter(
    (c) => c.estado === 'Nuevo' && diasSinMovimiento(c, e.hoy) > 14,
  ).length;
  if (estancadas > 0) {
    out.push({ tipo: 'warn', texto: `${estancadas} conversión(es) nueva(s) sin movimiento hace más de 14 días`, href: '/mision-biblica' });
  }

  const pausados = e.estudiantes.filter((x) => x.estado === 'Pausado').length;
  if (pausados > 0) {
    out.push({ tipo: 'warn', texto: `${pausados} estudiante(s) en pausa`, href: '/academia' });
  }

  let sinGrupo = 0;
  let sinHermanoMayor = 0;
  for (const m of e.miembros) {
    if (m.estado !== 'Activo') continue;
    const p = m.personaId ? e.personasMap.get(m.personaId) : undefined;
    if (!p) continue;
    if (!p.grupoId) sinGrupo++;
    if (!p.hermanoMayorId) sinHermanoMayor++;
  }
  if (sinGrupo > 0) {
    out.push({ tipo: 'warn', texto: `${sinGrupo} miembro(s) activo(s) sin grupo asignado`, href: '/miembros' });
  }

  const borrador = e.cursos.filter((c) => c.estado === 'Borrador').length;
  if (borrador > 0) {
    out.push({ tipo: 'info', texto: `${borrador} curso(s) en borrador`, href: '/academia' });
  }

  if (sinHermanoMayor > 0) {
    out.push({ tipo: 'info', texto: `${sinHermanoMayor} miembro(s) activo(s) sin hermano mayor`, href: '/miembros' });
  }

  const sinLider = e.evangelismos.filter(
    (ev) => !evangelismoConDatos(ev, e.personasMap).liderNombre,
  ).length;
  if (sinLider > 0) {
    out.push({ tipo: 'info', texto: `${sinLider} actividad(es) sin líder asignado`, href: '/mision-biblica' });
  }

  const ordenadas = [...out].sort((a, b) => SEVERIDAD[a.tipo] - SEVERIDAD[b.tipo]);
  if (ordenadas.length === 0) {
    return [{ tipo: 'ok', texto: 'Todo en orden — sin alertas activas' }];
  }
  return ordenadas.slice(0, 5);
}
