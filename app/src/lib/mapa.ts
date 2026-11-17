import type { Grupo, Persona } from './types';

/**
 * Mapa de ubicaciones (2026-11-16): las direcciones de personas y
 * grupos se FIJAN a mano — GPS al visitar o toque en el mapa — porque
 * la dirección escrita cubana no se puede geocodificar con fiabilidad.
 * Este módulo es la lógica pura: qué fichas tienen punto y cómo se
 * presenta cada chincheta. El dibujo vive en components/MapaLeaflet.
 */

/** Centro por defecto hasta que haya puntos o GPS: La Habana. */
export const CENTRO_DEFECTO: [number, number] = [23.1136, -82.3666];

export interface ConUbicacion {
  lat?: number | null;
  lng?: number | null;
}

/** ¿La ficha tiene ubicación fijada? (0 sería válido: se exige número finito.) */
export function tieneUbicacion(r: ConUbicacion): boolean {
  return (
    typeof r.lat === 'number' &&
    typeof r.lng === 'number' &&
    Number.isFinite(r.lat) &&
    Number.isFinite(r.lng)
  );
}

export interface PuntoMapa {
  id: string;
  tipo: 'persona' | 'grupo';
  nombre: string;
  detalle: string;
  lat: number;
  lng: number;
  /** Ruta interna de su ficha (la chincheta enlaza ahí). */
  href: string;
}

export function puntosDelMapa(personas: Persona[], grupos: Grupo[]): PuntoMapa[] {
  const puntos: PuntoMapa[] = [];
  for (const p of personas) {
    if (!tieneUbicacion(p)) continue;
    puntos.push({
      id: `persona:${p.id}`,
      tipo: 'persona',
      nombre: `${p.nombre} ${p.apellido}`.trim(),
      detalle: p.direccion || p.zona || '',
      lat: p.lat as number,
      lng: p.lng as number,
      href: `/personas?ver=${p.id}`,
    });
  }
  for (const g of grupos) {
    if (!tieneUbicacion(g)) continue;
    puntos.push({
      id: `grupo:${g.id}`,
      tipo: 'grupo',
      nombre: g.nombre,
      detalle: g.lugar || g.zona || '',
      lat: g.lat as number,
      lng: g.lng as number,
      href: '/mision?tab=grupos',
    });
  }
  return puntos;
}

/** Centro medio de los puntos (o el de por defecto si no hay ninguno). */
/**
 * Las ubicaciones YA fijadas que se ven de referencia al fijar una
 * nueva (LemGil, 2026-11-17): hay quienes viven en la misma casa o
 * cerca, y sin ver las demás chinchetas la nueva cae encima de otra.
 * Se excluye la ficha que se está fijando: la suya es la movible.
 */
/** La identidad real de la ficha detrás de un punto (`persona:<id>` → `<id>`). */
export function idRealDePunto(p: PuntoMapa): string {
  return p.id.slice(p.tipo.length + 1);
}

export function puntosDeReferencia(
  personas: Persona[],
  grupos: Grupo[],
  excluir?: { tipo: 'persona' | 'grupo'; id: string },
): PuntoMapa[] {
  const clave = excluir ? `${excluir.tipo}:${excluir.id}` : null;
  return puntosDelMapa(personas, grupos).filter((p) => p.id !== clave);
}

export function centroDePuntos(puntos: PuntoMapa[]): [number, number] {
  if (puntos.length === 0) return CENTRO_DEFECTO;
  const lat = puntos.reduce((s, p) => s + p.lat, 0) / puntos.length;
  const lng = puntos.reduce((s, p) => s + p.lng, 0) / puntos.length;
  return [lat, lng];
}
