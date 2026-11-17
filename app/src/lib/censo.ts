import type { PasoSeguimiento, Persona } from './types';
import { agruparProcesos, type ProcesosAgrupados } from './personaVista';
import type { FichasDePersona } from './personas';
import {
  PS_APARTADO, PS_CONFESO, PS_FALLECIDO, PS_NUEVO, PS_TRASLADO,
  enCamino, esGozne, esSalida, etiquetaDe, idCanonico, indiceEnRuta, rutaDe, seConvirtio, fechaDeConversion,
} from './pasosMision';

/**
 * El censo de la congregación (2026-11-17, definido por LemGil): un
 * conteo de PERSONAS, no una suma de registros — la ficha única manda
 * y cada persona cuenta UNA sola vez, en su etapa más avanzada.
 *
 * - Total de Congregados = los que están en Misión en proceso (por su
 *   paso de la ruta) + los Miembros (miembro Activo o conversión en el
 *   gozne de Integrado).
 * - Cortes transversales sobre ese total: Diezmadores, sexo
 *   (Hombres/Mujeres/sin dato) y edades (Niños 0–11, Jóvenes 12–29,
 *   Adultos 30–59, Ancianos 60+).
 * - Fuera del total, sin esconderse: miembros Inactivos y las BAJAS
 *   (Apartados, Traslados, Fallecidos y otras salidas del catálogo).
 * - Del período: confesiones (entradas a Confeso), conversiones
 *   (entradas a Converso — la confesión no cuenta como conversión
 *   hasta perseverar) y bajas, leídas del historial.
 */

export interface EtapaCenso {
  pasoId: string;
  etiqueta: string;
  cantidad: number;
}

export interface CensoCongregacion {
  total: number;
  etapas: EtapaCenso[];
  miembros: number;
  miembrosInactivos: number;
  diezmadores: number;
  hombres: number;
  mujeres: number;
  sexoSinDato: number;
  ninos: number;
  jovenes: number;
  adultos: number;
  ancianos: number;
  edadSinDato: number;
  bajas: { apartados: number; traslados: number; fallecidos: number; otrasSalidas: number };
  periodo: { confesiones: number; conversiones: number; bajas: number };
}

export const CENSO_VACIO: CensoCongregacion = {
  total: 0,
  etapas: [],
  miembros: 0,
  miembrosInactivos: 0,
  diezmadores: 0,
  hombres: 0,
  mujeres: 0,
  sexoSinDato: 0,
  ninos: 0,
  jovenes: 0,
  adultos: 0,
  ancianos: 0,
  edadSinDato: 0,
  bajas: { apartados: 0, traslados: 0, fallecidos: 0, otrasSalidas: 0 },
  periodo: { confesiones: 0, conversiones: 0, bajas: 0 },
};

type Clase =
  | { tipo: 'etapa'; pasoId: string }
  | { tipo: 'miembro' }
  | { tipo: 'inactivo' }
  | { tipo: 'baja'; baja: 'apartados' | 'traslados' | 'fallecidos' | 'otrasSalidas' }
  | { tipo: 'fuera' };

/**
 * Dónde cae UNA persona en el censo. La prioridad replica la de
 * `situacionPersona` (la misma que la ficha ya muestra): primero las
 * salidas, después el miembro, después el camino.
 */
export function claseDePersona(g: ProcesosAgrupados, pasos?: PasoSeguimiento[]): Clase {
  const convs = g.conversiones;
  const miembros = g.miembros;
  if (convs.some((c) => idCanonico(c.estado) === PS_FALLECIDO) || miembros.some((m) => m.estado === 'Fallecido')) {
    return { tipo: 'baja', baja: 'fallecidos' };
  }
  if (convs.some((c) => idCanonico(c.estado) === PS_APARTADO) || miembros.some((m) => (m.estado as string) === 'Apartado')) {
    return { tipo: 'baja', baja: 'apartados' };
  }
  const salidaExtra = convs.find((c) => {
    const id = idCanonico(c.estado);
    return id !== PS_APARTADO && id !== PS_FALLECIDO && esSalida(pasos, c.estado);
  });
  if (salidaExtra) {
    return { tipo: 'baja', baja: idCanonico(salidaExtra.estado) === PS_TRASLADO ? 'traslados' : 'otrasSalidas' };
  }
  if (miembros.some((m) => m.estado === 'Trasladado')) return { tipo: 'baja', baja: 'traslados' };
  if (miembros.some((m) => m.estado === 'Inactivo')) return { tipo: 'inactivo' };
  if (miembros.some((m) => m.estado === 'Activo')) return { tipo: 'miembro' };
  if (convs.some((c) => esGozne(pasos, c.estado))) return { tipo: 'miembro' };
  let mejorId: string | null = null;
  let mejorNivel = -1;
  for (const c of convs) {
    if (!enCamino(pasos, c.estado)) continue;
    const nivel = indiceEnRuta(pasos, c.estado);
    if (nivel > mejorNivel) {
      mejorNivel = nivel;
      mejorId = idCanonico(c.estado);
    }
  }
  if (mejorId) return { tipo: 'etapa', pasoId: mejorId };
  return { tipo: 'fuera' };
}

/** Edad cumplida a la fecha; null si la fecha no sirve. */
export function edadEn(fechaNacimiento: string, hoy: Date): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fechaNacimiento ?? '');
  if (!m) return null;
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  if (!anio || mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  let edad = hoy.getFullYear() - anio;
  const yaCumplio = hoy.getMonth() + 1 > mes || (hoy.getMonth() + 1 === mes && hoy.getDate() >= dia);
  if (!yaCumplio) edad--;
  return edad >= 0 && edad < 130 ? edad : null;
}

export function calcularCenso(
  personas: Persona[],
  fichas: FichasDePersona,
  pasos: PasoSeguimiento[] | undefined,
  periodo: { desde: string; hasta: string },
  hoy: Date,
): CensoCongregacion {
  const grupos = agruparProcesos(fichas);
  const censo: CensoCongregacion = {
    ...CENSO_VACIO,
    etapas: rutaDe(pasos)
      .filter((p) => !esGozne(pasos, p.id))
      .map((p) => ({ pasoId: p.id, etiqueta: etiquetaDe(pasos, p.id), cantidad: 0 })),
    bajas: { ...CENSO_VACIO.bajas },
    periodo: { ...CENSO_VACIO.periodo },
  };
  const etapaPorId = new Map(censo.etapas.map((e) => [e.pasoId, e]));
  const diezmadoresIds = new Set<string>();

  for (const persona of personas) {
    const g = grupos.get(persona.id) ?? { conversiones: [], miembros: [], estudiantes: [], dadores: [], beneficiarios: [] };
    if (g.dadores.length > 0) diezmadoresIds.add(persona.id);
    const clase = claseDePersona(g, pasos);
    if (clase.tipo === 'baja') {
      censo.bajas[clase.baja]++;
      continue;
    }
    if (clase.tipo === 'inactivo') {
      censo.miembrosInactivos++;
      continue;
    }
    if (clase.tipo === 'fuera') continue;
    // Dentro de la congregación: suma al total y a sus cortes.
    censo.total++;
    if (clase.tipo === 'miembro') censo.miembros++;
    if (clase.tipo === 'etapa') {
      const etapa = etapaPorId.get(clase.pasoId);
      if (etapa) etapa.cantidad++;
    }
    if (persona.sexo === 'M') censo.hombres++;
    else if (persona.sexo === 'F') censo.mujeres++;
    else censo.sexoSinDato++;
    const edad = edadEn(persona.fechaNacimiento, hoy);
    if (edad === null) censo.edadSinDato++;
    else if (edad < 12) censo.ninos++;
    else if (edad < 30) censo.jovenes++;
    else if (edad < 60) censo.adultos++;
    else censo.ancianos++;
  }
  censo.diezmadores = diezmadoresIds.size;

  // Del período, por el historial de las conversiones: personas
  // DISTINTAS que entraron a cada paso dentro del rango.
  const enPeriodo = (fecha: string) => Boolean(fecha) && fecha >= periodo.desde && fecha <= periodo.hasta;
  const confesiones = new Set<string>();
  const conversiones = new Set<string>();
  const bajasPeriodo = new Set<string>();
  for (const c of fichas.conversiones) {
    const dueno = c.personaId ?? c.id;
    let entroAConverso = false;
    for (const h of c.historial ?? []) {
      if (!enPeriodo(h.fecha ?? '')) continue;
      const id = idCanonico(h.estado ?? '');
      if (id === PS_CONFESO) confesiones.add(dueno);
      if (id === PS_NUEVO) {
        conversiones.add(dueno);
        entroAConverso = true;
      }
      if (esSalida(pasos, h.estado ?? '')) bajasPeriodo.add(dueno);
    }
    // Conversiones viejas sin entrada en el historial: su fecha de
    // conversión manda (la misma tolerancia de fechaDeConversion).
    if (!entroAConverso && seConvirtio(c) && enPeriodo(fechaDeConversion(c))) {
      conversiones.add(dueno);
    }
  }
  censo.periodo = {
    confesiones: confesiones.size,
    conversiones: conversiones.size,
    bajas: bajasPeriodo.size,
  };
  return censo;
}
