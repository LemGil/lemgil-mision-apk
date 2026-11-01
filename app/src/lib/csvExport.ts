const esc = (v: string | number): string => {
  const s = String(v);
  // Entrecomilla solo cuando el valor lleva coma, comilla o salto de línea,
  // duplicando las comillas internas (RFC 4180).
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function exportCSV(headers: string[], rows: (string | number)[][], filename: string): void {
  const csv = [headers, ...rows].map(x => x.map(esc).join(',')).join('\n');
  const b = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const u = URL.createObjectURL(b);
  const a = document.createElement('a');
  a.href = u;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(u);
}
