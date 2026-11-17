import type { Conversion, Hito, HistorialEntry, PasoSeguimiento } from './types';

/**
 * Pasos de Misión (Fase 2): la PRIMERA parte del seguimiento deja de ser
 * texto escrito en el código (`ESTADOS` de constants.ts) y pasa a ser el
 * mismo catálogo editable de la Fase 1 (`pasosSeguimiento`, ámbito
 * 'mision'). La conversión guarda en su `estado` la IDENTIDAD del paso
 * ('ps-nuevo', 'ps-discipulado', …) y la etiqueta se resuelve aquí al
 * pintar: renombrar un paso no toca ninguna ficha ni ningún conteo.
 *
 * Cada paso tiene un ROL que la lógica usa en vez del nombre:
 * - `inicio` (protegido): donde nace el registro en Misión (el paso
 *   «Congregado»: la persona asiste, aún no se ha convertido).
 * - `camino`: pasos intermedios libres.
 * - `gozne` (protegido): el que crea al miembro (syncMember).
 * - `salida`: salen del camino; no avanzan por la ruta. Las de la casa
 *   (Apartado/Traslado/Fallecido) son protegidas; la iglesia puede
 *   crear las suyas desde el editor, con el reflejo genérico (el
 *   miembro pasa a Inactivo y Personas las muestra con su nombre).
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
export const PS_CONGREGADO = 'ps-congregado';
/**
 * Confeso (2026-11-17, definición de LemGil): hizo la oración de fe /
 * Confesión de Fe; está por verse si permanece. Si permanece y se le
 * ven frutos de conversión, pasa a Converso. La confesión NO cuenta
 * como conversión hasta perseverar (seConvirtio sigue mirando a
 * PS_NUEVO). Su paso propio «Profeso» era este mismo concepto.
 */
export const PS_CONFESO = 'ps-confeso';
export const PS_NUEVO = 'ps-nuevo';
export const PS_DISCIPULADO = 'ps-discipulado';
export const PS_BAUTIZADO = 'ps-bautizado';
export const PS_INTEGRADO = 'ps-integrado';
export const PS_APARTADO = 'ps-apartado';
export const PS_TRASLADO = 'ps-traslado';
export const PS_FALLECIDO = 'ps-fallecido';

/** Etiqueta legada → identidad. «Seguimiento» fue un nombre viejo del Discipulado. */
export const ALIAS_ESTADOS_LEGADO: Record<string, string> = {
  Congregado: PS_CONGREGADO,
  Confeso: PS_CONFESO,
  Nuevo: PS_NUEVO,
  Converso: PS_NUEVO,
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

/**
 * ¿Una conversión pasa el filtro de estado de la lista? (F3). El
 * `<select>` ofrece IDENTIDADES del catálogo, pero la ficha puede
 * guardar aún la etiqueta legada («Apartado»): la comparación es por
 * identidad canónica, la misma que usan los KPI — antes el filtro
 * comparaba el texto crudo y una ficha legada sumaba en el KPI pero
 * desaparecía de su propio filtro.
 */
export function estadoCoincideConFiltro(estado: string, filtro: string): boolean {
  return !filtro || idCanonico(estado) === filtro;
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
  // La ruta que pidió LemGil (2026-11-15): el registro en Misión nace
  // en «Congregado» (asiste a las reuniones; se registra tras la 3ª
  // visita) y la CONVERSIÓN es el avance a «Converso» — la semilla que
  // antes se llamaba «Nuevo» (su identidad no cambia: ps-nuevo).
  semilla(PS_CONGREGADO, 'Congregado', '🙏', 1, 'inicio', true),
  semilla(PS_CONFESO, 'Confeso', '🤲', 2, 'camino'),
  semilla(PS_NUEVO, 'Converso', '🌱', 3, 'camino'),
  semilla(PS_DISCIPULADO, 'Discipulado', '📖', 4, 'camino'),
  semilla(PS_BAUTIZADO, 'Bautizado', '💧', 5, 'camino'),
  semilla(PS_INTEGRADO, 'Integrado', '🏘️', 6, 'gozne', true),
  semilla(PS_APARTADO, 'Apartado', '🚪', 7, 'salida', true),
  semilla(PS_TRASLADO, 'Trasladado', '🧳', 8, 'salida', true),
  semilla(PS_FALLECIDO, 'Fallecido', '✝️', 9, 'salida', true),
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

/** Nombre histórico de cada semilla, por identidad (para cuando el paso ya no está en el catálogo). */
const NOMBRE_SEMILLA: Record<string, string> = Object.fromEntries(
  PASOS_MISION_DEFECTO.map((p) => [p.id, p.nombre]),
);

/**
 * La etiqueta de un estado CON RESPALDO (F8): el nombre vivo si el
 * paso existe en el catálogo; si ya no está (fue borrado), el nombre
 * histórico de la semilla para los ids conocidos — para que un
 * encabezado de KPI nunca titule `ps-discipulado` — y, en última
 * instancia, el propio valor (un id creado por la iglesia sin respaldo
 * posible, que no debería llegar a un titular).
 */
export function etiquetaConRespaldo(pasos: PasoSeguimiento[] | undefined, valor: string): string {
  const paso = pasoPorId(pasos, valor);
  if (paso) return paso.nombre;
  return NOMBRE_SEMILLA[idCanonico(valor)] ?? valor;
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

/** Las salidas del camino, en orden (Apartado, Trasladado, Fallecido en la semilla). */
export function salidasDe(pasos?: PasoSeguimiento[]): PasoSeguimiento[] {
  return pasosDeMision(pasos).filter((p) => p.rol === 'salida');
}

/** El paso de inicio (donde nace el registro en Misión); el primero de la ruta como respaldo. */
export function pasoInicio(pasos?: PasoSeguimiento[]): PasoSeguimiento {
  return pasosDeMision(pasos).find((p) => p.rol === 'inicio') ?? rutaDe(pasos)[0];
}

/**
 * Canonicaliza un estado que llega DE FUERA (la importación CSV, F2):
 * el export de la propia página escribe la ETIQUETA viva, así que la
 * vuelta debe resolver contra el catálogo del momento. Orden:
 * (1) ya es un id del catálogo → ese id; (2) es el NOMBRE actual de un
 * paso → su id; (3) es una etiqueta legada de semilla → su id canónico
 * (así un export anterior a un renombre sigue encontrando su paso).
 * Si nada calza, NO se acepta en silencio: la fila nace en el paso de
 * inicio y `reconocido: false` permite CONTARLA en el resumen de la
 * importación — antes quedaba huérfana: ningún KPI la contaba, ningún
 * filtro la encontraba y syncMember jamás la integraba.
 */
export function canonizarEstadoImportado(
  pasos: PasoSeguimiento[] | undefined,
  valor: string,
): { estado: string; reconocido: boolean } {
  const catalogo = pasosDeMision(pasos);
  const v = (valor ?? '').trim();
  if (v) {
    if (catalogo.some((p) => p.id === v)) return { estado: v, reconocido: true };
    const porNombre = catalogo.find((p) => p.nombre.trim().toLowerCase() === v.toLowerCase());
    if (porNombre) return { estado: porNombre.id, reconocido: true };
    const canonico = idCanonico(v);
    if (canonico !== v && catalogo.some((p) => p.id === canonico)) {
      return { estado: canonico, reconocido: true };
    }
  }
  return { estado: pasoInicio(pasos).id, reconocido: false };
}

/** El progreso de una conversión DENTRO de la ruta (F6). */
export interface ProgresoEnRuta {
  /** 0–100 recorriendo solo la ruta; 0 fuera de ella (salida o desconocido). */
  porcentaje: number;
  /** «paso X de N» en la ruta; fuera de ella, la etiqueta viva del estado. */
  rotulo: string;
}

/**
 * El denominador es la RUTA (inicio + camino + gozne): las salidas no
 * son «pasos que faltan». Antes el detalle dividía entre ruta + salidas
 * y un Integrado — el final del camino — se veía al 57 % («paso 4 de
 * 7»). En una salida no hay porcentaje que mostrar: 0 y el rótulo es
 * la etiqueta del estado, sin «paso X de N» engañoso.
 */
export function progresoEnRuta(pasos: PasoSeguimiento[] | undefined, valor: string): ProgresoEnRuta {
  const ruta = rutaDe(pasos);
  const idx = indiceEnRuta(pasos, valor);
  if (idx >= 0) {
    return {
      porcentaje: Math.round(((idx + 1) / ruta.length) * 100),
      rotulo: `paso ${idx + 1} de ${ruta.length}`,
    };
  }
  return { porcentaje: 0, rotulo: etiquetaDe(pasos, valor) };
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
    case PS_CONFESO: return 'Confesión';
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
  // Trasladado: el mismo amarillo de su insignia en Miembros
  // (miembros/constants.ts: EST_BADGE Trasladado = badge-yellow).
  [PS_TRASLADO]: 'badge-yellow',
  [PS_FALLECIDO]: 'badge-gray',
};
const COLOR_SEMILLA: Record<string, string> = {
  [PS_NUEVO]: 'var(--blue)',
  [PS_DISCIPULADO]: 'var(--yellow)',
  [PS_BAUTIZADO]: 'var(--green)',
  [PS_INTEGRADO]: 'var(--purple)',
  [PS_APARTADO]: 'var(--red)',
  [PS_TRASLADO]: 'var(--yellow)',
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

/**
 * Cuántas conversiones están en un paso, contando por IDENTIDAD
 * canónica: una ficha que aún guarda la etiqueta legada («Apartado»)
 * cuenta como uso de su paso ('ps-apartado') igual que la que guarda
 * el id. Es la guarda del editor al borrar pasos y salidas: nadie
 * puede quedar en el aire.
 */
export function contarUsoPaso(estados: string[], pasoId: string): number {
  return estados.filter((e) => idCanonico(e) === pasoId).length;
}

/** El uso COMPLETO de un paso, para la guarda de borrado del editor (F7). */
export interface UsoDelPaso {
  /** Conversiones cuyo estado ACTUAL es este paso (por identidad canónica). */
  enElPaso: number;
  /**
   * Conversiones que YA NO están en el paso pero cuyo HISTORIAL lo
   * menciona (pasaron por él): si el paso se borrara, esas entradas
   * perderían su nombre y la línea de tiempo mostraría el id crudo.
   * No incluye a las que están en el paso (ya cuentan en `enElPaso`).
   */
  enHistorial: number;
}

/**
 * La guarda vieja solo miraba el estado actual: un paso transitado y
 * hoy vacío se podía borrar, y el historial de quienes pasaron por él
 * quedaba huérfano. Aquí se cuentan AMBOS usos, comparando cada
 * entrada del historial por identidad canónica (el historial puede
 * guardar etiquetas legadas).
 */
export function usoDelPaso(convs: Conversion[], pasoId: string): UsoDelPaso {
  let enElPaso = 0;
  let enHistorial = 0;
  for (const c of convs) {
    if (idCanonico(c.estado) === pasoId) { enElPaso++; continue; }
    if ((c.historial ?? []).some((h) => idCanonico(h.estado ?? '') === pasoId)) enHistorial++;
  }
  return { enElPaso, enHistorial };
}

/**
 * La entrada de historial que deja un CAMBIO DE ESTADO guardado desde
 * el formulario (F10): null si el estado no cambió (comparación por
 * identidad canónica: renombrar o re-guardar lo mismo no es un cambio).
 * Sin esta entrada, las fechas de «cuándo entró en este estado»
 * nacían de entradas de OTRO estado y el detalle y el Panel se
 * contradecían. La nota replica el formato del seguimiento
 * («Estado: X → Y») y el estado se guarda canónico.
 */
export function entradaCambioDeEstado(
  pasos: PasoSeguimiento[] | undefined,
  anterior: string,
  nuevo: string,
  fecha: string,
): HistorialEntry | null {
  if (!anterior || idCanonico(anterior) === idCanonico(nuevo)) return null;
  return {
    fecha,
    estado: idCanonico(nuevo),
    nota: `Estado: ${etiquetaDe(pasos, anterior)} → ${etiquetaDe(pasos, nuevo)}`,
  };
}

/** Un paso tal como lo pinta el pipeline del detalle de la conversión. */
export interface PasoPipeline {
  id: string;
  etiqueta: string;
  emoji: string;
  cls: string;
  /** Solo en la SALIDA ACTIVA: su color del catálogo, para pintar el punto. */
  dotColor?: string;
}

/**
 * Los pasos del pipeline (ruta + salidas) con su clase visual para el
 * estado `actual` — que puede ser el guardado o la selección pendiente
 * (tempEst): el cálculo es el mismo.
 *
 * En la RUTA, las clases son las de siempre: done (ya pasados), active
 * (el actual) y reposo. Si el estado es una SALIDA, la ruta queda en
 * reposo (no hay posición que marcar en ella), pero la salida SÍ se
 * marca: clase `salida-activa` + su color del catálogo en el punto —
 * antes todas quedaban planas y Apartado/Fallecido no se veían marcados
 * aunque la persona estuviera en ellos.
 */
export function pasosPipeline(pasos: PasoSeguimiento[] | undefined, actual: string): PasoPipeline[] {
  const idx = indiceEnRuta(pasos, actual);
  const enRuta = idx >= 0 && !esSalida(pasos, actual);
  const actualId = idCanonico(actual);
  return pasosDeMision(pasos).map((p) => {
    const i = indiceEnRuta(pasos, p.id);
    if (enRuta && i >= 0) {
      const cls = i < idx ? 'step done' : i === idx ? 'step active' : 'step';
      return { id: p.id, etiqueta: p.nombre, emoji: p.emoji, cls };
    }
    if (p.id === actualId && esSalida(pasos, p.id)) {
      return { id: p.id, etiqueta: p.nombre, emoji: p.emoji, cls: 'step salida-activa', dotColor: colorDe(pasos, p.id) };
    }
    return { id: p.id, etiqueta: p.nombre, emoji: p.emoji, cls: 'step' };
  });
}

/* ── Congregado → Converso: la conversión como AVANCE (2026-11-15) ── */

/**
 * ¿Esta persona YA se convirtió? Desde que la ruta nace en
 * «Congregado», estar en la lista de Misión ya no equivale a haberse
 * convertido: la conversión es el AVANCE al paso «Converso» (la semilla
 * ps-nuevo). Se sabe por el historial (una entrada en Converso) o por
 * la posición actual en la ruta (en Converso o más allá). Quien sigue
 * en Congregado — o salió del camino sin pasar por Converso — NO
 * cuenta como conversión en ninguna cifra.
 */
export function seConvirtio(c: Conversion): boolean {
  if ((c.historial ?? []).some((h) => idCanonico(h.estado ?? '') === PS_NUEVO)) return true;
  const idxConverso = indiceEnRuta(undefined, PS_NUEVO);
  const idx = indiceEnRuta(undefined, c.estado);
  return idx >= 0 && idxConverso >= 0 && idx >= idxConverso;
}

/**
 * La fecha en que la persona se convirtió: la entrada MÁS RECIENTE del
 * historial en el paso Converso (la misma semántica de `fechaDeEstado`);
 * si llegó sin dejar entrada (nació en Converso antes de que existiera
 * Congregado, con el historial vacío de nacimiento), la fecha del
 * registro. '' si aún no se ha convertido.
 */
export function fechaDeConversion(c: Conversion): string {
  if (!seConvirtio(c)) return '';
  let fecha = '';
  for (const h of c.historial ?? []) {
    if (idCanonico(h.estado ?? '') === PS_NUEVO && h.fecha) fecha = h.fecha;
  }
  return fecha || c.fecha || '';
}

/**
 * La transformación del catálogo VIVO a la ruta Congregado → Converso
 * (pura; la aplica el pase `migrarRutaCongregados` de lib/migrate.ts):
 * - «Congregado» entra como paso de INICIO, al frente de la ruta (si
 *   falta; si un equipo ya lo sembró, se respeta su fila y solo se
 *   asegura su rol).
 * - La semilla ps-nuevo cede el rol de inicio y pasa a «camino»; su
 *   nombre pasa a «Converso» SOLO si aún es el de la semilla vieja
 *   («Nuevo»): un renombre hecho por la iglesia se respeta.
 * - El orden se renumera siguiendo el orden visible actual, con
 *   Congregado primero: cualquier reorden de la iglesia se conserva.
 * Devuelve el catálogo completo del ámbito (solo filas 'mision').
 */
export function catalogoConCongregado(pasos: PasoSeguimiento[]): PasoSeguimiento[] {
  const propios = ordenar(pasos.filter((p) => p.ambito === 'mision'));
  if (propios.length === 0) return [];
  const semillaCongregado = PASOS_MISION_DEFECTO.find((p) => p.id === PS_CONGREGADO)!;
  const existente = propios.find((p) => p.id === PS_CONGREGADO);
  const congregado: PasoSeguimiento = existente
    ? { ...existente, rol: 'inicio', protegido: true }
    : { ...semillaCongregado };
  const resto = propios
    .filter((p) => p.id !== PS_CONGREGADO)
    .map((p) => (p.id === PS_NUEVO
      ? { ...p, rol: 'camino' as const, nombre: p.nombre === 'Nuevo' ? 'Converso' : p.nombre }
      : p));
  return [congregado, ...resto].map((p, i) => ({ ...p, orden: i + 1 }));
}

/* ── Pasos duplicados por nombre (2026-11-16) ─────────────────────── */

/**
 * En el catálogo, el NOMBRE es la identidad visible: dos pasos del
 * mismo ámbito con el mismo nombre se ven dos veces en el pipeline
 * (a LemGil le apareció «Congregado» duplicado en la ficha) y parten
 * las cifras. Esta fusión pura decide, por cada nombre repetido del
 * ámbito 'mision', qué fila SOBREVIVE y hacia dónde reapuntar las
 * demás: gana la identidad de semilla (ps-…), luego la protegida,
 * luego la de menor orden y la más antigua. Las referencias
 * (conversiones) se reapuntan con `reapuntarEstado`.
 */
export interface FusionPasos {
  /** id que desaparece → id que sobrevive. */
  fusiones: Map<string, string>;
  /** El catálogo ya fusionado, en el orden de entrada. */
  catalogo: PasoSeguimiento[];
}

const IDS_SEMILLA_MISION = new Set(PASOS_MISION_DEFECTO.map((p) => p.id));

export function fusionarDuplicadosPorNombre(pasos: PasoSeguimiento[]): FusionPasos {
  const fusiones = new Map<string, string>();
  const porNombre = new Map<string, PasoSeguimiento[]>();
  for (const p of pasos) {
    if (p.ambito !== 'mision') continue;
    const clave = p.nombre.trim().toLowerCase();
    const grupo = porNombre.get(clave) ?? [];
    grupo.push(p);
    porNombre.set(clave, grupo);
  }
  const eliminados = new Set<string>();
  for (const grupo of porNombre.values()) {
    if (grupo.length < 2) continue;
    const [keeper] = [...grupo].sort((a, b) =>
      Number(IDS_SEMILLA_MISION.has(b.id)) - Number(IDS_SEMILLA_MISION.has(a.id))
      || Number(!!b.protegido) - Number(!!a.protegido)
      || (a.orden - b.orden)
      || a.creado.localeCompare(b.creado)
      || a.id.localeCompare(b.id));
    for (const p of grupo) {
      if (p.id === keeper.id) continue;
      // Dos identidades de SEMILLA nunca se fusionan entre sí: si
      // ps-nuevo llegó a llamarse «Congregado» (un renombre viejo), no
      // es un duplicado de ps-congregado — son dos pasos distintos con
      // el mismo nombre, y lo cura `ajusteDeConverso` renombrando, no
      // este pase borrando (borrarlo reapuntaba a los conversos a
      // Congregado: pasó el 2026-11-16 y lo repara repararFusion…).
      if (IDS_SEMILLA_MISION.has(p.id) && IDS_SEMILLA_MISION.has(keeper.id)) continue;
      fusiones.set(p.id, keeper.id);
      eliminados.add(p.id);
    }
  }
  return { fusiones, catalogo: pasos.filter((p) => !eliminados.has(p.id)) };
}

/** Un estado (id o etiqueta legada) tras la fusión: el id del paso que sobrevive. */
export function reapuntarEstado(valor: string, fusiones: Map<string, string>): string {
  if (fusiones.size === 0) return valor;
  return fusiones.get(idCanonico(valor)) ?? valor;
}

/**
 * El ajuste del paso Converso (ps-nuevo) cuando su fila quedó con el
 * nombre o el rol de OTRA época: «Nuevo» (la semilla vieja, que un
 * equipo sin actualizar puede devolver por sincronización) o
 * «Congregado» (el renombre que duplicaba el pipeline), o el rol de
 * inicio que ya es de Congregado. Devuelve los campos a corregir, o
 * null si la fila está sana — un renombre legítimo de la iglesia a
 * otro nombre cualquiera se respeta.
 */
export function ajusteDeConverso(paso: PasoSeguimiento | undefined): Partial<PasoSeguimiento> | null {
  if (!paso || paso.id !== PS_NUEVO) return null;
  const cambios: Partial<PasoSeguimiento> = {};
  const nombre = paso.nombre.trim().toLowerCase();
  if (nombre === 'nuevo' || nombre === 'congregado') cambios.nombre = 'Converso';
  if (paso.rol === 'inicio') cambios.rol = 'camino';
  // La protección también era de su época de inicio: al frente de la
  // ruta solo queda UN paso protegido, Congregado (LemGil, 2026-11-16).
  // Converso es un paso del camino como Discipulado o Bautizado.
  if (paso.protegido) cambios.protegido = false;
  return Object.keys(cambios).length > 0 ? cambios : null;
}

/**
 * Reparación de la fusión del 2026-11-16 (pura): en los equipos donde
 * ps-nuevo se llamaba «Congregado», el primer pase de duplicados lo
 * fusionó con ps-congregado y reapuntó a los conversos — su estado y
 * sus entradas de historial en Converso pasaron a decir Congregado.
 * La huella es inconfundible: una entrada «Registro inicial» o
 * «Avance rápido» en Congregado es imposible de nacimiento (quien
 * nace en el inicio no deja «Registro inicial», y al inicio no se
 * «avanza»): esa entrada ERA de Converso. Se restaura la entrada, y
 * si era la última (la persona seguía en Converso), también su
 * estado. Lo demás no se toca: una vuelta legítima a Congregado con
 * nota propia queda como está.
 */
export function repararFusionEnConversion(c: Conversion): { estado: string; historial: Conversion['historial'] } | null {
  const esHuella = (h: { estado?: string; nota?: string }) =>
    idCanonico(h.estado ?? '') === PS_CONGREGADO && (h.nota === 'Registro inicial' || h.nota === 'Avance rápido');
  const historial = c.historial ?? [];
  if (!historial.some(esHuella)) return null;
  const restaurado = historial.map((h) => (esHuella(h) ? { ...h, estado: PS_NUEVO } : h));
  let estado = c.estado;
  const ultima = restaurado[restaurado.length - 1];
  if (idCanonico(estado) === PS_CONGREGADO && ultima && idCanonico(ultima.estado) === PS_NUEVO && esHuella(historial[historial.length - 1])) {
    estado = PS_NUEVO;
  }
  return { estado, historial: restaurado };
}

/**
 * La cabeza de la ruta es ESTRUCTURAL (2026-11-16): «Congregado»
 * abre la lista de Misión y «Converso» es el paso siguiente — así lo
 * definió LemGil, y ningún reorden ni resurrección por sincronización
 * puede invertirlos (a él le volvió Converso con el orden viejo de
 * cuando era el inicio, y el pipeline lo pintó primero). Esta función
 * pura devuelve el catálogo con el orden saneado: Congregado 1,
 * Converso 2, y TODO lo demás — pasos propios de la iglesia como
 * «Profeso» y las salidas — conserva su orden relativo actual.
 */
/**
 * La ruta con Confeso (2026-11-17, pura; la aplica el pase
 * `migrarRutaConfeso`): si el catálogo vivo aún no tiene el paso
 * Confeso, entra su semilla. El ORDEN fino (Congregado → Confeso →
 * Converso) lo fija después `catalogoConInicioSano`, que corre en
 * cada arranque. Si LemGil renombra el paso, su nombre se respeta:
 * aquí solo se siembra la identidad cuando falta del todo.
 */
export function catalogoConConfeso(pasos: PasoSeguimiento[]): PasoSeguimiento[] {
  if (pasos.some((p) => p.id === PS_CONFESO)) return pasos;
  const semillaConfeso = PASOS_MISION_DEFECTO.find((p) => p.id === PS_CONFESO);
  if (!semillaConfeso) return pasos;
  return [...pasos, { ...semillaConfeso }];
}

export function catalogoConInicioSano(pasos: PasoSeguimiento[]): PasoSeguimiento[] {
  const propios = ordenar(pasos.filter((p) => p.ambito === 'mision'));
  const cong = propios.find((p) => p.id === PS_CONGREGADO);
  if (!cong) return pasos;
  const conf = propios.find((p) => p.id === PS_CONFESO);
  const conv = propios.find((p) => p.id === PS_NUEVO);
  const resto = propios.filter((p) => p.id !== PS_CONGREGADO && p.id !== PS_CONFESO && p.id !== PS_NUEVO);
  const secuencia = [
    cong,
    ...(conf ? [conf] : []),
    ...(conv ? [conv] : []),
    ...resto.filter((p) => p.rol !== 'salida'),
    ...resto.filter((p) => p.rol === 'salida'),
  ];
  const nuevoOrden = new Map(secuencia.map((p, i) => [p.id, i + 1]));
  return pasos.map((p) => (nuevoOrden.has(p.id) ? { ...p, orden: nuevoOrden.get(p.id)! } : p));
}
