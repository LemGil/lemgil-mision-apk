export function exportCSV(headers: string[], rows: (string | number)[][], filename: string): void {
  const csv = [headers, ...rows].map(x => x.join(',')).join('\n');
  const b = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const u = URL.createObjectURL(b);
  const a = document.createElement('a');
  a.href = u;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(u);
}
