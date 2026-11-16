import type { DiezmadorVista } from './personaDatos';

/**
 * Lista de Diezmadores de la Iglesia (menú, 2026-11-16): una vista de
 * SOLO LECTURA con los datos de las personas que diezman. El dinero se
 * registra en Bien Común (Finanzas); aquí se consulta quiénes son.
 * Funciones puras: la página las consume y las pruebas las verifican.
 */

function norm(s: string): string {
  return s.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Coincidencia de búsqueda: nombre, zona, grupo, carné (contiene) y
 *  teléfono (por dígitos, con 3 o más). */
export function coincideBusquedaDiezmador(v: DiezmadorVista, texto: string): boolean {
  const q = norm(texto);
  if (!q) return true;
  const nombreCompleto = norm(`${v.nombre} ${v.apellido}`);
  if (nombreCompleto.includes(q)) return true;
  if (norm(v.zona).includes(q)) return true;
  if (norm(v.grupo).includes(q)) return true;
  if (v.numeroIdentidad && v.numeroIdentidad.includes(texto.trim())) return true;
  const digitos = texto.replace(/\D/g, '');
  if (digitos.length >= 3 && (v.telefono ?? '').replace(/\D/g, '').includes(digitos)) return true;
  return false;
}

/** Filtra por la búsqueda y ordena por apellido y nombre. */
export function filtrarDiezmadores(vistas: DiezmadorVista[], texto: string): DiezmadorVista[] {
  return vistas
    .filter((v) => coincideBusquedaDiezmador(v, texto))
    .sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`));
}

/** Resumen de la cabecera: total de diezmadores y cuántos están activos. */
export function resumenDiezmadores(vistas: DiezmadorVista[]): { total: number; activos: number } {
  return {
    total: vistas.length,
    activos: vistas.filter((v) => v.estado === 'Activo').length,
  };
}
