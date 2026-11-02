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
