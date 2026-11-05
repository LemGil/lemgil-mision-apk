import type { Conversion, Estudiante, Hito, Miembro, MiembroMinisterio, PasoSeguimiento } from './types';
import { fechaDeEstado } from './utils';

/**
 * Pasos del miembro (Fase 1): la SEGUNDA parte del seguimiento. Misión
 * acompaña a la persona hasta Integrado; desde ahí, la escalera del
 * miembro continúa el camino (Integrado → grupo → academia → ministerio
 * → …), con pasos EDITABLES: la identidad de cada paso es fija, su
 * etiqueta y su orden son libres (lib/migrate.ts siembra el catálogo).
 *
 * Este módulo es la lógica PURA de la escalera: dados los pasos del
 * ámbito miembro y el contexto de UN miembro, dice por paso si está
 * cumplido (y desde cuándo, si la fuente lo sabe) y cuál es el paso
 * actual. La verdad de cada paso sale de su `fuente`:
 * - Las automáticas leen datos que YA viven en la app (la ficha única
 *   otra vez: nadie teclea dos veces) y no se fuerzan a mano.
 * - La `manual` se registra como hito con `pasoId` (y se quita
 *   borrando ese hito).
 */

/** Todo lo que la escalera necesita saber de un miembro. */
export interface ContextoPasosMiembro {
  /**
   * El miembro YA leído con la capa de personaDatos: su grupo vive en
   * el núcleo `personas` y `miembroConDatos` lo resuelve sobre la
   * ficha; con un registro viejo sin persona, el grupoId propio vale.
   */
  miembro: Miembro;
  /** Su conversión de origen, si el vínculo (conversionId) resuelve. */
  conversionOrigen?: Conversion;
  /** Hitos DEL miembro (la página los agrupa por miembroId). */
  hitos: Hito[];
  /** Estudiantes de la app: aquí se filtran por su personaId. */
  estudiantes: Estudiante[];
  /** Asignaciones a ministerios DEL miembro. */
  asignaciones: MiembroMinisterio[];
  /** ¿Alguna OTRA persona lo tiene como hermano mayor (en el núcleo)? */
  esHermanoMayor: boolean;
}

export interface EstadoPaso {
  paso: PasoSeguimiento;
  cumplido: boolean;
  /** Fecha del cumplimiento si la fuente la conoce (YYYY-MM-DD). */
  fecha?: string;
  /**
   * Solo en pasos `manual` cumplidos vía hito con pasoId: el hito que
   * lo registra, para poder quitar el registro desde la escalera. El
   * Liderazgo legado (hito por tipo, sin pasoId) no lo trae: ese hito
   * se gestiona en el timeline, como siempre.
   */
  hitoId?: string;
}

export interface EscaleraMiembro {
  estados: EstadoPaso[];
  /** El primer paso no cumplido; null si la escalera está completa. */
  actual: PasoSeguimiento | null;
  cumplidos: number;
  total: number;
}

/** Orden de la escalera: por `orden`; desempate estable por creación e id. */
export function ordenarPasos(pasos: PasoSeguimiento[]): PasoSeguimiento[] {
  return [...pasos].sort((a, b) =>
    (a.orden - b.orden) || a.creado.localeCompare(b.creado) || a.id.localeCompare(b.id));
}

const primeraFecha = (fechas: string[]): string | undefined =>
  fechas.filter(Boolean).sort()[0];

function estadoDe(paso: PasoSeguimiento, ctx: ContextoPasosMiembro): EstadoPaso {
  const no: EstadoPaso = { paso, cumplido: false };
  switch (paso.fuente) {
    case 'integracion': {
      // El gozne con Misión. Primero la evidencia más vieja y firme:
      // el hito «Integración» que nace al crear el miembro.
      const fechaHito = primeraFecha(ctx.hitos.filter((h) => h.tipo === 'Integración').map((h) => h.fecha));
      if (fechaHito) return { paso, cumplido: true, fecha: fechaHito };
      const c = ctx.conversionOrigen;
      if (c && (c.estado === 'Integrado' || (c.historial ?? []).some((h) => h.estado === 'Integrado'))) {
        // Integrado hoy, o lo estuvo (el historial lo recuerda aunque
        // la conversión después se haya apartado: el gozne ocurrió).
        return { paso, cumplido: true, fecha: fechaDeEstado(c, 'Integrado') || undefined };
      }
      // Alta manual de miembro: nació ya miembro, sin pasar por Misión
      // en esta app. Cumplido, sin fecha conocida.
      if (!ctx.miembro.conversionId) return { paso, cumplido: true };
      return no;
    }
    case 'grupo':
      // El grupo vive en el núcleo (o en la ficha vieja): ya resuelto
      // sobre `miembro` por personaDatos. Sin fecha conocida.
      return ctx.miembro.grupoId ? { paso, cumplido: true } : no;
    case 'academia': {
      if (!ctx.miembro.personaId) return no;
      const activos = ctx.estudiantes.filter((e) => e.personaId === ctx.miembro.personaId && e.estado === 'Activo');
      if (activos.length === 0) return no;
      const fecha = primeraFecha(activos.map((e) => e.fecha || (e.creado ? e.creado.slice(0, 10) : '')));
      return { paso, cumplido: true, fecha };
    }
    case 'ministerio': {
      if (ctx.asignaciones.length === 0) return no;
      const fecha = primeraFecha(ctx.asignaciones.map((a) => a.desde || (a.creado ? a.creado.slice(0, 10) : '')));
      return { paso, cumplido: true, fecha };
    }
    case 'hermanoMayor':
      // Sin fecha: el núcleo no guarda desde cuándo acompaña a otro.
      return ctx.esHermanoMayor ? { paso, cumplido: true } : no;
    case 'manual': {
      const porPaso = ctx.hitos
        .filter((h) => h.pasoId === paso.id)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
      if (porPaso) return { paso, cumplido: true, fecha: porPaso.fecha, hitoId: porPaso.id };
      // Legado de la semilla: antes de existir pasoId, el Liderazgo se
      // registraba como hito por tipo. Sigue contando (sin hitoId: ese
      // hito se quita desde el timeline, no desde la escalera).
      if (paso.id === 'pm-liderazgo') {
        const legado = ctx.hitos
          .filter((h) => h.tipo === 'Liderazgo' && !h.pasoId)
          .sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
        if (legado) return { paso, cumplido: true, fecha: legado.fecha };
      }
      return no;
    }
  }
}

/** La escalera completa de un miembro: estados por paso + paso actual. */
export function escaleraDeMiembro(pasos: PasoSeguimiento[], ctx: ContextoPasosMiembro): EscaleraMiembro {
  const ordenados = ordenarPasos(pasos.filter((p) => p.ambito === 'miembro'));
  const estados = ordenados.map((p) => estadoDe(p, ctx));
  const primeroPendiente = estados.find((e) => !e.cumplido);
  return {
    estados,
    actual: primeroPendiente ? primeroPendiente.paso : null,
    cumplidos: estados.filter((e) => e.cumplido).length,
    total: estados.length,
  };
}
