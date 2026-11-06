import type { CSSProperties } from 'react';
import type { Conversion } from './types';
import { idCanonico } from './pasosMision';

export const today = () => new Date().toISOString().split('T')[0];

/**
 * Fecha en que una conversión entró en un estado — SEMÁNTICA ÚNICA (F10):
 * la fecha de la entrada MÁS RECIENTE del historial cuyo estado canónico
 * coincide con el buscado; si ninguna coincide, la fecha de la conversión
 * (`c.fecha`). Antes convivían tres criterios (primera entrada que
 * coincide aquí, última entrada sea del estado que sea en el detalle,
 * fecha máxima de cualquier movimiento en el Panel) y la misma persona
 * podía verse «recién movida» en su ficha y «estancada» en la alerta.
 * Hoy la consumen igual el detalle («días en el estado actual»), los KPI
 * por período de Misión (una conversión cuenta en el período en que entró
 * MÁS RECIENTEMENTE al estado), la escalera del miembro y el Panel.
 * Compara por IDENTIDAD de paso: el historial migrado trae ids
 * ('ps-integrado') y el alias tolera entradas aún en etiqueta.
 * (Lógica que antes vivía como `getFechaEstado` dentro de MisionBiblica.)
 */
export const fechaDeEstado = (c: Conversion, estado: string): string => {
  const buscado = idCanonico(estado);
  let ultima = '';
  for (const h of c.historial ?? []) {
    if (idCanonico(h.estado ?? '') === buscado && h.fecha && h.fecha > ultima) ultima = h.fecha;
  }
  return ultima || c.fecha || '';
};

/**
 * M1 — El orden de la lista de conversiones: por fecha de conversión
 * DESCENDENTE (el registro se hojea desde lo más reciente, como espera
 * quien lo usa; antes salía en el orden interno de la base, que es el
 * de los identificadores: azar). Desempate estable: fecha de creación
 * del registro y, por último, el nombre resuelto. Solo presentación:
 * devuelve una copia ordenada, no muta la entrada.
 */
export const ordenarConversionesRecientes = (lista: Conversion[]): Conversion[] =>
  [...lista].sort((a, b) =>
    (b.fecha || '').localeCompare(a.fecha || '')
    || (b.creado || '').localeCompare(a.creado || '')
    || `${a.nombre} ${a.apellido}`.trim().localeCompare(`${b.nombre} ${b.apellido}`.trim()));

/**
 * M2 — ¿Una conversión (ya resuelta desde su persona) coincide con el
 * texto del buscador? Nombre, zona y líder como siempre; ADEMÁS el
 * teléfono por DÍGITOS (tolerante a formato: «5355 1234» encuentra a
 * «53551234» y al revés) y el Nº de Identidad conteniendo el texto
 * (sin distinción de mayúsculas). El teléfono solo se compara cuando
 * el texto trae al menos 3 dígitos, para que una búsqueda por nombre
 * con un número suelto no arrastre coincidencias falsas.
 */
export const coincideBusquedaConversion = (c: Conversion, texto: string): boolean => {
  const t = (texto ?? '').trim().toLowerCase();
  if (!t) return true;
  const base = `${c.nombre} ${c.apellido} ${c.zona} ${c.lider ?? ''}`.toLowerCase();
  if (base.includes(t)) return true;
  if ((c.numeroIdentidad ?? '').toLowerCase().includes(t)) return true;
  const digitos = t.replace(/\D/g, '');
  if (digitos.length >= 3 && (c.telefono ?? '').replace(/\D/g, '').includes(digitos)) return true;
  return false;
};

export const fmt = (d: string) => {
  if (!d) return '—';
  const [y, m, dy] = d.split('-');
  return `${+dy} ${MS[+m - 1]} ${y}`;
};

export const monthKey = (d: string) => (d && d.length >= 7 ? d.slice(0, 7) : '');

export const inRange = (d: string, desde: string, hasta: string) => d && d >= desde && d <= hasta;

export const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const MS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const MS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export const MS_FULL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const accentStyle = (color: string): CSSProperties => ({ '--accent': color } as CSSProperties);
