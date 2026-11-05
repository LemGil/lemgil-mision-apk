import type { Hito, PasoSeguimiento } from './types';

/**
 * Pasos de Misión (Fase 2): la PRIMERA parte del seguimiento deja de ser
 * texto escrito en el código (`ESTADOS` de constants.ts) y pasa a ser el
 * mismo catálogo editable de la Fase 1 (`pasosSeguimiento`, ámbito
 * 'mision'). La conversión guarda en su `estado` la IDENTIDAD del paso
 * ('ps-nuevo', 'ps-discipulado', …) y la etiqueta se resuelve aquí al
 * pintar: renombrar un paso no toca ninguna ficha ni ningún conteo.
 *
 * Cada paso tiene un ROL que la lógica usa en vez del nombre:
 * - `inicio` (protegido): donde nacen las conversiones.
 * - `camino`: pasos intermedios libres.
 * - `gozne` (protegido): el que crea al miembro (syncMember).
 * - `salida` (protegidas): Apartado/Fallecido; no avanzan por la ruta.
 *
 * TOLERANCIA LEGADO: los registros anteriores a esta fase guardan la
 * ETIQUETA ('Integrado') en vez del id. El pase `migrarEstadosAPasos`
 * los traduce al arrancar, pero un equipo sin actualizar puede seguir
 * sincronizando etiquetas durante un tiempo: por eso TODOS los helpers
 * canonicalizan el valor entrante con el alias de las semillas antes de
 * razonar. Lo desconocido (ni id ni alias) se deja intacto y se muestra
 * tal cual, como respaldo.
 */

/** Identidades fijas de las semillas (nunca cambian; la etiqueta sí). */
export const PS_NUEVO = 'ps-nuevo';
export const PS_DISCIPULADO = 'ps-discipulado';
export const PS_BAUTIZADO = 'ps-bautizado';
export const PS_INTEGRADO = 'ps-integrado';
export const PS_APARTADO = 'ps-apartado';
export const PS_FALLECIDO = 'ps-fallecido';

/** Etiqueta legada → identidad. «Seguimiento» fue un nombre viejo del Discipulado. */
export const ALIAS_ESTADOS_LEGADO: Record<string, string> = {
  Nuevo: PS_NUEVO,
  Discipulado: PS_DISCIPULADO,
  Bautizado: PS_BAUTIZADO,
  Integrado: PS_INTEGRADO,
  Apartado: PS_APARTADO,
  Fallecido: PS_FALLECIDO,
  Seguimiento: PS_DISCIPULADO,
};

/** El id canónico de un valor de estado: alias si es etiqueta legada; si no, el propio valor. */
export function idCanonico(valor: string): string {
  return ALIAS_ESTADOS_LEGADO[valor] ?? valor;
}

const semilla = (
  id: string, nombre: string, emoji: string, orden: number,
  rol: PasoSeguimiento['rol'], protegido?: boolean,
): PasoSeguimiento => ({
  id, ambito: 'mision', nombre, emoji, orden,
  // La `fuente` es un concepto del ámbito miembro; en Misión manda el
  // rol. Se guarda 'manual' como valor neutro del tipo.
  fuente: 'manual', rol, protegido, creado: '', version: 1,
});

/**
 * El catálogo de Misión TAL COMO NACE (la semilla que siembra
 * lib/migrate.ts). Los helpers lo usan como RESPALDO cuando el catálogo
 * vivo aún no cargó o no trae filas del ámbito: la app nunca se queda
 * sin camino que pintar.
 */
export const PASOS_MISION_DEFECTO: PasoSeguimiento[] = [
  semilla(PS_NUEVO, 'Nuevo', '🌱', 1, 'inicio', true),
  semilla(PS_DISCIPULADO, 'Discipulado', '📖', 2, 'camino'),
  semilla(PS_BAUTIZADO, 'Bautizado', '💧', 3, 'camino'),
  semilla(PS_INTEGRADO, 'Integrado', '🏘️', 4, 'gozne', true),
  semilla(PS_APARTADO, 'Apartado', '🚪', 5, 'salida', true),
  semilla(PS_FALLECIDO, 'Fallecido', '✝️', 6, 'salida', true),
];

/** Orden del catálogo: por `orden`; desempate estable por creación e id (el mismo de pasosMiembro.ordenarPasos). */
const ordenar = (pasos: PasoSeguimiento[]): PasoSeguimiento[] =>
  [...pasos].sort((a, b) =>
    (a.orden - b.orden) || a.creado.localeCompare(b.creado) || a.id.localeCompare(b.id));

/** Los pasos del ámbito 'mision', ordenados; con respaldo a la semilla si el catálogo no trae ninguno. */
export function pasosDeMision(pasos?: PasoSeguimiento[]): PasoSeguimiento[] {
  const propios = ordenar((pasos ?? []).filter((p) => p.ambito === 'mision'));
  return propios.length > 0 ? propios : PASOS_MISION_DEFECTO;
}

/** El paso dueño de un valor de estado (id o etiqueta legada); undefined si es desconocido. */
export function pasoPorId(pasos: PasoSeguimiento[] | undefined, valor: string): PasoSeguimiento | undefined {
  const id = idCanonico(valor);
  return pasosDeMision(pasos).find((p) => p.id === id);
}

/** La etiqueta VIVA de un estado: el nombre actual del catálogo; el propio valor si es desconocido. */
export function etiquetaDe(pasos: PasoSeguimiento[] | undefined, valor: string): string {
  return pasoPorId(pasos, valor)?.nombre ?? valor;
}

/** El emoji vivo de un estado ('' si es desconocido). */
export function emojiDe(pasos: PasoSeguimiento[] | undefined, valor: string): string {
  return pasoPorId(pasos, valor)?.emoji ?? '';
}

export function esInicio(pasos: PasoSeguimiento[] | undefined, valor: string): boolean {
  return pasoPorId(pasos, valor)?.rol === 'inicio';
}

export function esGozne(pasos: PasoSeguimiento[] | undefined, valor: string): boolean {
  return pasoPorId(pasos, valor)?.rol === 'gozne';
}

export function esSalida(pasos: PasoSeguimiento[] | undefined, valor: string): boolean {
  return pasoPorId(pasos, valor)?.rol === 'salida';
}

/** «En proceso»: está recorriendo el camino (inicio o paso intermedio), ni integrado ni salido. */
export function enCamino(pasos: PasoSeguimiento[] | undefined, valor: string): boolean {
  const rol = pasoPorId(pasos, valor)?.rol;
  return rol === 'inicio' || rol === 'camino';
}

/** La RUTA de avance: inicio + camino + gozne, en orden. Las salidas no forman parte. */
export function rutaDe(pasos?: PasoSeguimiento[]): PasoSeguimiento[] {
  return pasosDeMision(pasos).filter((p) => p.rol === 'inicio' || p.rol === 'camino' || p.rol === 'gozne');
}

/** Las salidas del camino, en orden (Apartado, Fallecido en la semilla). */
export function salidasDe(pasos?: PasoSeguimiento[]): PasoSeguimiento[] {
  return pasosDeMision(pasos).filter((p) => p.rol === 'salida');
}

/** El paso de inicio (donde nacen las conversiones); el primero de la ruta como respaldo. */
export function pasoInicio(pasos?: PasoSeguimiento[]): PasoSeguimiento {
  return pasosDeMision(pasos).find((p) => p.rol === 'inicio') ?? rutaDe(pasos)[0];
}

/** El paso-gozne (el que crea al miembro); undefined si el catálogo no lo trae. */
export function pasoGozne(pasos?: PasoSeguimiento[]): PasoSeguimiento | undefined {
  return pasosDeMision(pasos).find((p) => p.rol === 'gozne');
}

/** Posición (0-based) de un estado dentro de la ruta; -1 si no está en la ruta (salida o desconocido). */
export function indiceEnRuta(pasos: PasoSeguimiento[] | undefined, valor: string): number {
  const id = idCanonico(valor);
  return rutaDe(pasos).findIndex((p) => p.id === id);
}

/** El siguiente paso de la RUTA; null si el estado es el gozne, una salida o un desconocido. */
export function siguientePaso(pasos: PasoSeguimiento[] | undefined, valor: string): PasoSeguimiento | null {
  const ruta = rutaDe(pasos);
  const i = indiceEnRuta(pasos, valor);
  return i >= 0 && i < ruta.length - 1 ? ruta[i + 1] : null;
}

/**
 * El tipo de hito que crea el seguimiento al pasar por un estado (los
 * tipos de hito son una unión fija y NO se migran: son el vocabulario
 * del historial de la iglesia). Los pasos nuevos del camino registran
 * 'Otro', como ya hacía el código con lo no mapeado.
 */
export function tipoHitoDe(valor: string): Hito['tipo'] {
  switch (idCanonico(valor)) {
    case PS_NUEVO: return 'Conversión';
    case PS_DISCIPULADO: return 'Discipulado';
    case PS_BAUTIZADO: return 'Bautismo';
    case PS_INTEGRADO: return 'Integración';
    default: return 'Otro';
  }
}

/**
 * Presentación por IDENTIDAD: las semillas conservan exactamente las
 * clases y colores que tenían en constants.ts (EST_BADGE/ESTADOS_COLOR).
 * Un paso de camino NUEVO toma el color de su POSICIÓN en la ruta,
 * rotando la paleta del camino (azul → amarillo → verde → púrpura).
 */
const BADGE_SEMILLA: Record<string, string> = {
  [PS_NUEVO]: 'badge-blue',
  [PS_DISCIPULADO]: 'badge-yellow',
  [PS_BAUTIZADO]: 'badge-green',
  [PS_INTEGRADO]: 'badge-purple',
  [PS_APARTADO]: 'badge-red',
  [PS_FALLECIDO]: 'badge-gray',
};
const COLOR_SEMILLA: Record<string, string> = {
  [PS_NUEVO]: 'var(--blue)',
  [PS_DISCIPULADO]: 'var(--yellow)',
  [PS_BAUTIZADO]: 'var(--green)',
  [PS_INTEGRADO]: 'var(--purple)',
  [PS_APARTADO]: 'var(--red)',
  [PS_FALLECIDO]: 'var(--dim)',
};
const BADGE_CAMINO = ['badge-blue', 'badge-yellow', 'badge-green', 'badge-purple'];
const COLOR_CAMINO = ['var(--blue)', 'var(--yellow)', 'var(--green)', 'var(--purple)'];

export function badgeDe(pasos: PasoSeguimiento[] | undefined, valor: string): string {
  const id = idCanonico(valor);
  if (BADGE_SEMILLA[id]) return BADGE_SEMILLA[id];
  const paso = pasoPorId(pasos, valor);
  if (!paso) return 'badge-blue';
  if (paso.rol === 'salida') return 'badge-red';
  const i = indiceEnRuta(pasos, valor);
  return BADGE_CAMINO[(i >= 0 ? i : 0) % BADGE_CAMINO.length];
}

export function colorDe(pasos: PasoSeguimiento[] | undefined, valor: string): string {
  const id = idCanonico(valor);
  if (COLOR_SEMILLA[id]) return COLOR_SEMILLA[id];
  const paso = pasoPorId(pasos, valor);
  if (!paso) return 'var(--gold)';
  if (paso.rol === 'salida') return 'var(--red)';
  const i = indiceEnRuta(pasos, valor);
  return COLOR_CAMINO[(i >= 0 ? i : 0) % COLOR_CAMINO.length];
}
