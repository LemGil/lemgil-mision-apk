import type { Zona } from './types';

/**
 * B5 — Zonas canónicas.
 * La zona se guarda como texto en conversiones, miembros, grupos y
 * evangelismos, y las variantes de grafía («POSITO» / «Pósito») parten los
 * filtros. La clave de comparación ignora mayúsculas, espacios y diacríticos.
 */
export const claveZona = (nombre: string): string =>
  (nombre || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

/**
 * Devuelve la grafía oficial de la zona: si el catálogo tiene una zona con
 * la misma clave, se usa su nombre exacto; si no hay coincidencia, el texto
 * limpio (solo recortado). Nombre vacío → ''.
 */
export function zonaCanonica(nombre: string, zonas: Zona[]): string {
  const limpio = (nombre || '').trim();
  if (!limpio) return '';
  const clave = claveZona(limpio);
  const oficial = zonas.find((z) => claveZona(z.nombre) === clave);
  return oficial ? oficial.nombre : limpio;
}
