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
  return search && !text.toLowerCase().includes(search.toLowerCase());
}

export const accentStyle = (color: string): CSSProperties => ({ '--accent': color } as CSSProperties);

export const CODE_PREFIXES: Record<string, string> = {
  conversiones: 'CONV',
  evangelismos: 'EVG',
  cursos: 'CUR',
  aportes: 'APO',
  entregas: 'MA',
  dadores: 'DON',
  colaboradores: 'COL',
  beneficiarios: 'BEN',
  certificados: 'CERT',
  reportes: 'REP',
  campanas: 'CAMP',
  negocios: 'NEG',
  publicaciones: 'PUB',
};

export function generateCodigo(table: string, fecha: string, existingCodes: string[]): string {
  const prefix = CODE_PREFIXES[table] || table.toUpperCase().slice(0, 4);
  const year = fecha ? fecha.slice(0, 4) : new Date().getFullYear().toString();
  const yearShort = year.slice(-2);
  const pattern = new RegExp(`^${prefix}-${yearShort}(\\d{3})$`);
  let max = 0;
  for (const code of existingCodes) {
    const match = code.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > max) max = num;
    }
  }
  const next = (max + 1).toString().padStart(3, '0');
  return `${prefix}-${yearShort}${next}`;
}
