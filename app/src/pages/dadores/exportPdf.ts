import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Aporte, Colaborador } from '../../lib/types';

export const exportDadoresPDF = (dadores: Colaborador[], aportes: Aporte[]) => {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text('Red de Colaboradores', 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')} · Total: ${dadores.length} colaboradores`, 14, 28);

  const rows = dadores.map((d) => {
    const total = aportes.filter((a) => a.colaboradorId === d.id).reduce((s, a) => s + (a.monto || 0), 0);
    const mes = aportes.filter((a) => a.colaboradorId === d.id && a.fecha?.startsWith(new Date().toISOString().slice(0, 7))).reduce((s, a) => s + (a.monto || 0), 0);
    const plan = d.planOfrendaMonto > 0 ? `$${d.planOfrendaMonto}/mes` : '—';
    return [`${d.nombre} ${d.apellido}`, d.tipo, d.telefono || '—', d.estado, plan, `$${total.toLocaleString()}`, `$${mes.toLocaleString()}`];
  });

  autoTable(doc, {
    startY: 34,
    head: [['Nombre', 'Tipo', 'Teléfono', 'Estado', 'Plan', 'Total Aportado', 'Este Mes']],
    body: rows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [212, 168, 67] },
  });

  const apRows = aportes
    .filter((a) => a.fecha?.startsWith(new Date().toISOString().slice(0, 7)))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 50)
    .map((a) => {
      const d = dadores.find((x) => x.id === a.colaboradorId);
      return [a.fecha, d ? `${d.nombre} ${d.apellido}` : '—', a.tipo, a.metodo, `$${a.monto.toLocaleString()}`, a.referencia || ''];
    });

  const lastY = doc.lastAutoTable?.finalY || 34;
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text('Aportes del Mes', 14, lastY + 14);

  autoTable(doc, {
    startY: lastY + 18,
    head: [['Fecha', 'Colaborador', 'Tipo', 'Método', 'Monto', 'Referencia']],
    body: apRows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [212, 168, 67] },
  });

  doc.save('lemgil-colaboradores.pdf');
};
