import { normalizeField } from './csvImport';
import { fmt } from './utils';
import type { Beneficiario, Conversion, Diezmador, Estudiante, Miembro, Persona } from './types';
import type { FichasDePersona, ProcesoPersona } from './personas';

/**
 * FICHA ÚNICA — P1 (vista de solo lectura): lógica pura de composición.
 *
 * Agrupa los procesos (las 5 tablas del alcance) por su `personaId`,
 * produce las tarjetas-resumen que pinta la ficha, detecta los procesos
 * huérfanos (sin persona válida: los que llegan de equipos sin actualizar,
 * §4.3.3 del diseño) y filtra la lista de personas. Sin efectos: todo se
 * prueba sin base de datos.
 *
 * La Red de Colaboradores NO aparece aquí: no es proceso de la persona
 * (decisión de LemGil). Los beneficiarios «Casa de Familia»/«Grupo»
 * tampoco cuentan como huérfanos: por diseño (§3.4) no son una persona
 * del núcleo y su `personaId` vacío es legítimo hasta P5.
 */

export const ORDEN_PROCESOS: ProcesoPersona[] = ['conversiones', 'miembros', 'estudiantes', 'dadores', 'beneficiarios'];

export const PROCESO_ETIQUETA: Record<ProcesoPersona, string> = {
  conversiones: 'Conversión',
  miembros: 'Miembro',
  estudiantes: 'Estudiante',
  dadores: 'Diezmador',
  beneficiarios: 'Beneficiario',
};

export const PROCESO_ICONO: Record<ProcesoPersona, string> = {
  conversiones: '✝️',
  miembros: '👥',
  estudiantes: '🎓',
  dadores: '🙏',
  beneficiarios: '🤲',
};

export interface ProcesosAgrupados {
  conversiones: Conversion[];
  miembros: Miembro[];
  estudiantes: Estudiante[];
  dadores: Diezmador[];
  beneficiarios: Beneficiario[];
}

export const procesosVacios = (): ProcesosAgrupados => ({
  conversiones: [], miembros: [], estudiantes: [], dadores: [], beneficiarios: [],
});

type RegistroProceso = Conversion | Miembro | Estudiante | Diezmador | Beneficiario;

/** Agrupa los procesos por personaId. Los registros sin personaId no entran en ningún grupo. */
export function agruparProcesos(data: FichasDePersona): Map<string, ProcesosAgrupados> {
  const mapa = new Map<string, ProcesosAgrupados>();
  const agregar = (proceso: ProcesoPersona, r: RegistroProceso) => {
    const pid = r.personaId;
    if (!pid) return;
    let g = mapa.get(pid);
    if (!g) { g = procesosVacios(); mapa.set(pid, g); }
    (g[proceso] as RegistroProceso[]).push(r);
  };
  for (const c of data.conversiones) agregar('conversiones', c);
  for (const m of data.miembros) agregar('miembros', m);
  for (const e of data.estudiantes) agregar('estudiantes', e);
  for (const d of data.dadores) agregar('dadores', d);
  for (const b of data.beneficiarios) agregar('beneficiarios', b);
  return mapa;
}

/** Tipos de proceso presentes en un grupo, en el orden fijo de la ficha. */
export function tiposPresentes(g: ProcesosAgrupados): ProcesoPersona[] {
  return ORDEN_PROCESOS.filter((p) => g[p].length > 0);
}

export function totalProcesos(g: ProcesosAgrupados): number {
  return ORDEN_PROCESOS.reduce((n, p) => n + g[p].length, 0);
}

/**
 * P6: cuántas PERSONAS distintas hay detrás de una lista de procesos.
 * Una persona con tres procesos cuenta UNA vez: esa es la diferencia
 * entre contar personas y sumar fichas (el problema de §2.2 del diseño).
 * Un proceso aún sin enlazar cuenta como su propia persona (su `id` es
 * el que su persona heredará al asegurarla, §5.2): la lectura tolerante
 * no pierde a nadie del conteo.
 */
export function contarPersonasUnicas(
  procesos: readonly { id: string; personaId?: string | null }[],
): number {
  const ids = new Set<string>();
  for (const p of procesos) ids.add(p.personaId ?? p.id);
  return ids.size;
}

export type TonoSituacion = 'danger' | 'warn' | 'ok' | 'info';

export interface SituacionPersona {
  texto: string;
  tono: TonoSituacion;
}

/** Tono de la situación → clase de insignia existente en el CSS global. */
export const SITUACION_BADGE: Record<TonoSituacion, string> = {
  danger: 'badge-red',
  warn: 'badge-yellow',
  ok: 'badge-green',
  info: 'badge-blue',
};

/**
 * SITUACIÓN ACTUAL — la situación real de la persona, derivada de los
 * estados de sus procesos. La página Personas solo listaba los PROCESOS
 * («Conversión») y nunca decía cómo está la persona hoy (caso Martha:
 * su conversión estaba en «Apartado» en Misión y Personas no lo decía
 * en ningún sitio visible).
 *
 * Prioridad fija (gana la primera que aplica):
 * 1. Fallecido (conversión o miembro) — la situación más definitiva.
 * 2. Apartado — de la conversión; en el miembro se lee con tolerancia:
 *    el tipo actual ya no trae «Apartado» para miembros (una conversión
 *    apartada se refleja como miembro Inactivo), pero registros viejos
 *    o sincronizados podrían traerlo y no debe esconderse.
 * 3. Miembro Inactivo.
 * 4. Miembro Activo → «Miembro activo».
 * 5. Conversión Integrado → «Integrado».
 * 6. Conversión en proceso: la más avanzada del camino de Misión
 *    (Bautizado > Discipulado > Seguimiento > Nuevo; «Seguimiento» no
 *    es estado del tipo actual, se ordena por si un registro viejo lo
 *    trajera).
 * Si ningún proceso dice su situación (solo estudiante/diezmador/
 * beneficiario, o sin procesos) → null: sin insignia, porque la tarjeta
 * de cada proceso ya muestra su propio estado.
 */
export function situacionPersona(g: ProcesosAgrupados): SituacionPersona | null {
  const convs = g.conversiones;
  const miembros = g.miembros;
  if (convs.some((c) => c.estado === 'Fallecido') || miembros.some((m) => m.estado === 'Fallecido')) {
    return { texto: 'Fallecido', tono: 'danger' };
  }
  if (convs.some((c) => c.estado === 'Apartado') || miembros.some((m) => (m.estado as string) === 'Apartado')) {
    return { texto: 'Apartado', tono: 'warn' };
  }
  if (miembros.some((m) => m.estado === 'Inactivo')) return { texto: 'Inactivo', tono: 'warn' };
  if (miembros.some((m) => m.estado === 'Activo')) return { texto: 'Miembro activo', tono: 'ok' };
  if (convs.some((c) => c.estado === 'Integrado')) return { texto: 'Integrado', tono: 'ok' };
  const avance: Record<string, number> = { Nuevo: 0, Seguimiento: 1, Discipulado: 2, Bautizado: 3 };
  let mejor: string | null = null;
  for (const c of convs) {
    const nivel = avance[c.estado];
    if (nivel !== undefined && (mejor === null || nivel > avance[mejor])) mejor = c.estado;
  }
  if (mejor !== null) return { texto: mejor, tono: 'info' };
  return null;
}

export interface TarjetaProceso {
  proceso: ProcesoPersona;
  procesoId: string;
  icono: string;
  titulo: string;
  lineas: string[];
  /** Ruta del módulo dueño del proceso. */
  ruta: string;
  /** True si el módulo abre directamente esta ficha con `?ver=` (Misión y Miembros, Fase C). */
  abreFicha: boolean;
}

type CursoNombre = (cursoId: string) => string | undefined;

function tarjetaDe(proceso: ProcesoPersona, r: RegistroProceso, cursoNombre?: CursoNombre): TarjetaProceso {
  const base = { proceso, procesoId: r.id, icono: PROCESO_ICONO[proceso], titulo: PROCESO_ETIQUETA[proceso] };
  switch (proceso) {
    case 'conversiones': {
      const c = r as Conversion;
      return { ...base, lineas: [`Estado: ${c.estado}`, `Convertido el ${fmt(c.fecha)}`], ruta: `/mision?ver=${c.id}`, abreFicha: true };
    }
    case 'miembros': {
      const m = r as Miembro;
      return { ...base, lineas: [`Estado: ${m.estado}`, `Ingreso: ${fmt(m.fechaIngreso)}`], ruta: `/miembros?ver=${m.id}`, abreFicha: true };
    }
    case 'estudiantes': {
      const e = r as Estudiante;
      const curso = cursoNombre?.(e.cursoId);
      return { ...base, lineas: [`Estado: ${e.estado}`, ...(curso ? [`Curso: ${curso}`] : []), `Matrícula: ${fmt(e.fecha)}`], ruta: '/academia', abreFicha: false };
    }
    case 'dadores': {
      const d = r as Diezmador;
      return { ...base, lineas: [`Estado: ${d.estado}`, `Ingreso: ${fmt(d.fechaIngreso)}`], ruta: '/bien-comun', abreFicha: false };
    }
    case 'beneficiarios': {
      const b = r as Beneficiario;
      return { ...base, lineas: [`Tipo: ${b.tipo}`, `Estado: ${b.estado}`], ruta: '/manos-abiertas', abreFicha: false };
    }
  }
}

/** Una tarjeta-resumen por cada proceso del grupo (varias si hubiera más de uno del mismo tipo). */
export function tarjetasDeProcesos(g: ProcesosAgrupados, cursoNombre?: CursoNombre): TarjetaProceso[] {
  const tarjetas: TarjetaProceso[] = [];
  for (const p of ORDEN_PROCESOS) {
    for (const r of g[p]) tarjetas.push(tarjetaDe(p, r, cursoNombre));
  }
  return tarjetas;
}

export interface ProcesoHuerfano {
  proceso: ProcesoPersona;
  id: string;
  /** Nombre dormido en la propia ficha del proceso (para reconocerlo). */
  nombreVisible: string;
  detalle: string;
}

/**
 * Procesos sin persona válida: `personaId` vacío o apuntando a una persona
 * que no existe. Son los candidatos de la herramienta «Vincular proceso»
 * (§5.5 del diseño).
 */
export function procesosHuerfanos(data: FichasDePersona, idsPersonas: ReadonlySet<string>, cursoNombre?: CursoNombre): ProcesoHuerfano[] {
  const huerfanos: ProcesoHuerfano[] = [];
  const revisar = (proceso: ProcesoPersona, r: RegistroProceso & { nombre?: string; apellido?: string }) => {
    if (r.personaId && idsPersonas.has(r.personaId)) return;
    // «Casa de Familia»/«Grupo» no son personas del núcleo (§3.4): su
    // personaId vacío es legítimo y no se ofrece para vincular.
    if (proceso === 'beneficiarios') {
      const tipo = (r as Beneficiario).tipo;
      if (tipo === 'Casa de Familia' || tipo === 'Grupo') return;
    }
    const t = tarjetaDe(proceso, r, cursoNombre);
    huerfanos.push({
      proceso,
      id: r.id,
      nombreVisible: `${r.nombre ?? ''} ${r.apellido ?? ''}`.trim() || '(sin nombre)',
      detalle: t.lineas.join(' · '),
    });
  };
  for (const c of data.conversiones) revisar('conversiones', c);
  for (const m of data.miembros) revisar('miembros', m);
  for (const e of data.estudiantes) revisar('estudiantes', e);
  for (const d of data.dadores) revisar('dadores', d);
  for (const b of data.beneficiarios) revisar('beneficiarios', b);
  return huerfanos;
}

/**
 * Busca por nombre/apellido (sin tildes, sin mayúsculas) o por dígitos del
 * Nº de Identidad (la identificación principal, P0.1) o del teléfono.
 */
export function filtrarPersonas(personas: Persona[], texto: string): Persona[] {
  const q = normalizeField(texto);
  const digitos = texto.replace(/\D/g, '');
  if (!q && !digitos) return personas;
  return personas.filter((p) => {
    const nombreCompleto = normalizeField(`${p.nombre} ${p.apellido}`);
    if (q && nombreCompleto.includes(q)) return true;
    if (digitos && (p.numeroIdentidad ?? '').replace(/\D/g, '').includes(digitos)) return true;
    if (digitos && p.telefono.replace(/\D/g, '').includes(digitos)) return true;
    return false;
  });
}

/** Edad en años cumplidos desde la fecha de nacimiento; null si no hay fecha válida. */
export function edadDesde(fechaNacimiento: string, referencia: Date = new Date()): number | null {
  if (!fechaNacimiento) return null;
  const nac = new Date(`${fechaNacimiento}T00:00:00`);
  if (isNaN(nac.getTime())) return null;
  let edad = referencia.getFullYear() - nac.getFullYear();
  const cumplidoEsteAnio = referencia.getMonth() > nac.getMonth()
    || (referencia.getMonth() === nac.getMonth() && referencia.getDate() >= nac.getDate());
  if (!cumplidoEsteAnio) edad--;
  return edad >= 0 ? edad : null;
}

/** Nombre visible de una persona («Nombre Apellido», con respaldo). */
export function nombrePersona(p: Pick<Persona, 'nombre' | 'apellido'>): string {
  return `${p.nombre} ${p.apellido}`.trim() || '(sin nombre)';
}

export interface GrupoDuplicado {
  /** Las fichas sospechosas de ser la misma persona (siempre ≥2). */
  personas: Persona[];
  /** Por qué se sospecha: las señales que unen a las fichas del grupo. */
  senales: string[];
}

const SENAL_NOMBRE = 'mismo nombre';
const SENAL_TELEFONO = 'mismo teléfono';
const SENAL_IDENTIDAD = 'mismo Nº de Identidad';
const SENAL_APELLIDO_NACIMIENTO = 'mismo apellido y fecha de nacimiento';
/** Orden fijo de presentación de las señales (determinista). */
const ORDEN_SENALES = [SENAL_NOMBRE, SENAL_TELEFONO, SENAL_IDENTIDAD, SENAL_APELLIDO_NACIMIENTO];

const soloDigitos = (s: string | undefined | null): string => (s ?? '').replace(/\D/g, '');
const textoNormalizado = (s: string): string => normalizeField(s).replace(/\s+/g, ' ').trim();

/**
 * POSIBLES DUPLICADOS — sospechas para revisar, NUNCA uniones.
 *
 * La migración P0 solo unió fichas por carné o teléfono (regla de
 * LemGil: el nombre solo jamás une), así que una misma persona pudo
 * quedar creada dos veces — p. ej. su conversión en una ficha y su
 * membresía en otra — y cada ficha muestra solo parte de su historia.
 * Esta función SURFACE esos casos para que la persona decida con
 * «Unir personas»: agrupa fichas (union-find) que comparten alguna
 * señal fuerte y devuelve las señales para que se entienda la sospecha.
 *
 * Aristas entre dos fichas distintas:
 * - mismo nombre completo normalizado (minúsculas, sin diacríticos,
 *   espacios colapsados — la normalización de `normalizeField`);
 * - mismo teléfono (solo dígitos, no vacío);
 * - mismo Nº de Identidad (solo dígitos, no vacío);
 * - mismo apellido normalizado + misma fecha de nacimiento (no vacía).
 *
 * Determinista y sin efectos: mismos datos → mismos grupos, en el
 * mismo orden (fichas ordenadas por apellido/nombre/id, grupos por su
 * primera ficha, señales en el orden fijo de ORDEN_SENALES).
 */
export function posiblesDuplicados(personas: Persona[]): GrupoDuplicado[] {
  // Ids únicos (PK de Dexie); si la entrada trajera un id repetido, la
  // primera aparición manda y la otra se ignora.
  const unicas: Persona[] = [];
  const vistos = new Set<string>();
  for (const p of personas) {
    if (vistos.has(p.id)) continue;
    vistos.add(p.id);
    unicas.push(p);
  }
  const n = unicas.length;
  if (n < 2) return [];

  // Union-find por índice, con las señales acumuladas por raíz.
  const padre = unicas.map((_, i) => i);
  const senalesPorRaiz = new Map<number, Set<string>>();
  const raiz = (i: number): number => {
    let r = i;
    while (padre[r] !== r) r = padre[r];
    while (padre[i] !== r) { const sig = padre[i]; padre[i] = r; i = sig; }
    return r;
  };
  const unir = (a: number, b: number, senal: string) => {
    const ra = raiz(a); const rb = raiz(b);
    const set = senalesPorRaiz.get(ra) ?? new Set<string>();
    set.add(senal);
    if (rb !== ra) {
      padre[rb] = ra;
      for (const s of senalesPorRaiz.get(rb) ?? []) set.add(s);
      senalesPorRaiz.delete(rb);
    }
    senalesPorRaiz.set(ra, set);
  };
  /** Une a todas las fichas que comparten una clave no vacía. */
  const unirPorClave = (clave: (p: Persona) => string, senal: string) => {
    const porClave = new Map<string, number>();
    unicas.forEach((p, i) => {
      const k = clave(p);
      if (!k) return;
      const previo = porClave.get(k);
      if (previo === undefined) porClave.set(k, i);
      else unir(previo, i, senal);
    });
  };

  unirPorClave((p) => textoNormalizado(`${p.nombre} ${p.apellido}`), SENAL_NOMBRE);
  unirPorClave((p) => soloDigitos(p.telefono), SENAL_TELEFONO);
  unirPorClave((p) => soloDigitos(p.numeroIdentidad), SENAL_IDENTIDAD);
  unirPorClave((p) => {
    const apellido = textoNormalizado(p.apellido);
    const nacimiento = (p.fechaNacimiento ?? '').trim();
    return apellido && nacimiento ? `${apellido}|${nacimiento}` : '';
  }, SENAL_APELLIDO_NACIMIENTO);

  const porRaiz = new Map<number, number[]>();
  unicas.forEach((_, i) => {
    const r = raiz(i);
    const lista = porRaiz.get(r) ?? [];
    lista.push(i);
    porRaiz.set(r, lista);
  });

  const claveOrden = (p: Persona) => `${textoNormalizado(`${p.apellido} ${p.nombre}`)}|${p.id}`;
  const grupos: GrupoDuplicado[] = [];
  for (const [r, indices] of porRaiz) {
    if (indices.length < 2) continue;
    const fichas = indices.map((i) => unicas[i]).sort((a, b) => claveOrden(a).localeCompare(claveOrden(b)));
    const set = senalesPorRaiz.get(r) ?? new Set<string>();
    grupos.push({ personas: fichas, senales: ORDEN_SENALES.filter((s) => set.has(s)) });
  }
  grupos.sort((a, b) => claveOrden(a.personas[0]).localeCompare(claveOrden(b.personas[0])));
  return grupos;
}
