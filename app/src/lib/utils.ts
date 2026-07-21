import type { CSSProperties } from 'react';

export const today = () => new Date().toISOString().split('T')[0];

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

export function q(search: string, text: string) {
  return !search || text.toLowerCase().includes(search.toLowerCase());
}

export const accentStyle = (color: string): CSSProperties => ({ '--accent': color } as CSSProperties);
