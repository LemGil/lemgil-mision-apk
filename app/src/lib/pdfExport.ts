import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const money = (n: number) => `$${(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = () => new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

const COLORS = {
  gold: [201, 162, 74] as [number, number, number],
  green: [61, 122, 79] as [number, number, number],
  yellow: [201, 162, 74] as [number, number, number],
  blue: [58, 106, 191] as [number, number, number],
  red: [176, 64, 64] as [number, number, number],
  purple: [106, 79, 175] as [number, number, number],
  dim: [140, 140, 140] as [number, number, number],
  dark: [30, 30, 30] as [number, number, number],
};

function header(doc: jsPDF, title: string, subtitle?: string, module: string = 'Bien Común') {
  doc.setFillColor(...COLORS.gold);
  doc.rect(0, 0, 210, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`LemGil — ${module}`, 14, 10);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 17);
  doc.setFontSize(8);
  doc.text(`Generado: ${today()}`, 196, 10, { align: 'right' });
  if (subtitle) {
    doc.setTextColor(...COLORS.dim);
    doc.setFontSize(9);
    doc.text(subtitle, 14, 28);
  }
}

function footer(doc: jsPDF) {
  const pageCount = (doc as any).internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.dim);
    doc.text(`Página ${i} de ${pageCount}`, 196, 287, { align: 'right' });
    doc.text('LemGil © ' + new Date().getFullYear(), 14, 287);
  }
}

function kpiBox(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, value: string, color: [number, number, number]) {
  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(...color);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');
  doc.setTextColor(...COLORS.dim);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(label.toUpperCase(), x + w / 2, y + 8, { align: 'center' });
  doc.setTextColor(...color);
  doc.setFontSize(13);
  doc.text(value, x + w / 2, y + h - 6, { align: 'center' });
}

function progressBar(doc: jsPDF, x: number, y: number, w: number, h: number, pct: number, color: [number, number, number]) {
  doc.setFillColor(230, 230, 230);
  doc.roundedRect(x, y, w, h, 1, 1, 'F');
  const w2 = Math.min(pct, 100) / 100 * w;
  doc.setFillColor(...color);
  doc.roundedRect(x, y, w2, h, 1, 1, 'F');
}

export function exportRegistrosPDF(opts: {
  aportes: any[];
  colaboradores: any[];
  grupos: any[];
  filters?: { tipo?: string; mes?: string; dador?: string };
}) {
  const { aportes, colaboradores, grupos, filters } = opts;
  const doc = new jsPDF();
  const titulo = 'Registros de Diezmos y Ofrendas';
  const subtitulo = filters?.tipo || filters?.mes || filters?.dador
    ? `Filtros: ${[filters.tipo, filters.mes, filters.dador].filter(Boolean).join(' · ')}`
    : `${aportes.length} registros en total`;
  header(doc, titulo, subtitulo);

  const total = aportes.reduce((s, a) => s + (a.monto || 0), 0);
  const diezmos = aportes.filter(a => a.tipo === 'Diezmo').reduce((s, a) => s + (a.monto || 0), 0);
  const ofrendas = aportes.filter(a => a.tipo === 'Ofrenda').reduce((s, a) => s + (a.monto || 0), 0);

  kpiBox(doc, 14, 34, 58, 18, 'Total', money(total), COLORS.gold);
  kpiBox(doc, 76, 34, 58, 18, 'Diezmos', money(diezmos), COLORS.green);
  kpiBox(doc, 138, 34, 58, 18, 'Ofrendas', money(ofrendas), COLORS.yellow);

  const rows = aportes.map((a, i) => {
    const d = colaboradores.find(c => c.id === a.diezmadorId);
    const g = grupos.find(g => g.id === a.grupoId);
    const nombre = d ? `${d.nombre} ${d.apellido}` : g ? g.nombre : 'Anónimo';
    const servicio = (a.notas || '').split('|')[0]?.trim() || 'General';
    return [
      (i + 1).toString(),
      nombre,
      a.tipo,
      money(a.monto),
      a.fecha,
      servicio,
      a.metodo || '—',
      a.referencia || '—',
    ];
  });

  autoTable(doc, {
    startY: 58,
    head: [['#', 'Dador / Grupo', 'Tipo', 'Monto', 'Fecha', 'Servicio', 'Método', 'Recibo']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: COLORS.gold, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7, textColor: COLORS.dark },
    alternateRowStyles: { fillColor: [250, 248, 240] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      2: { halign: 'center' },
      3: { halign: 'right', fontStyle: 'bold' },
      4: { halign: 'center' },
    },
  });

  footer(doc);
  doc.save(`bien-comun-registros-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportDiezmadoresPDF(opts: { colaboradores: any[]; aportes: any[]; anio: string }) {
  const { colaboradores, aportes, anio } = opts;
  const doc = new jsPDF();
  header(doc, 'Listado de Dadores', `Año ${anio} · ${colaboradores.length} dadores`);

  const rows = colaboradores.map(d => {
    const regs = aportes.filter(a => a.diezmadorId === d.id && a.fecha.startsWith(anio));
    const total = regs.reduce((s, a) => s + (a.monto || 0), 0);
    const planDiezmo = d.planDiezmo || 0;
    const metaAnual = planDiezmo * 12;
    const pct = metaAnual > 0 ? (total / metaAnual) * 100 : null;
    return [
      `${d.nombre} ${d.apellido}`,
      d.zona || '—',
      d.estado,
      planDiezmo > 0 ? money(planDiezmo) : '—',
      planDiezmo > 0 ? money(metaAnual) : '—',
      money(total),
      regs.length.toString(),
      pct !== null ? `${pct.toFixed(0)}%` : '—',
    ];
  });

  autoTable(doc, {
    startY: 34,
    head: [['Nombre', 'Zona', 'Estado', 'Plan Diezmo', 'Meta/Año', 'Recaudado', 'Reg.', '% Cump.']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: COLORS.gold, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: COLORS.dark },
    alternateRowStyles: { fillColor: [250, 248, 240] },
    columnStyles: {
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
      6: { halign: 'center' },
      7: { halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.column.index === 7 && data.cell.section === 'body') {
        const txt = data.cell.text[0];
        if (txt.endsWith('%')) {
          const v = parseFloat(txt);
          if (v >= 100) data.cell.styles.textColor = COLORS.gold;
          else if (v >= 70) data.cell.styles.textColor = COLORS.green;
          else data.cell.styles.textColor = COLORS.red;
        }
      }
    },
  });

  footer(doc);
  doc.save(`bien-comun-diezmadores-${anio}.pdf`);
}

export function exportGruposPDF(opts: { grupos: any[]; aportes: any[]; anio: string }) {
  const { grupos, aportes, anio } = opts;
  const doc = new jsPDF();
  header(doc, 'Listado de Grupos y Ofrendas', `Año ${anio} · ${grupos.length} grupos`);

  const rows = grupos.map(g => {
    const regs = aportes.filter(a => a.grupoId === g.id && a.tipo === 'Ofrenda' && a.fecha.startsWith(anio));
    const total = regs.reduce((s, a) => s + (a.monto || 0), 0);
    const metaMes = g.planOfrendasMensual || 0;
    const metaAnual = metaMes * 12;
    const pct = metaAnual > 0 ? (total / metaAnual) * 100 : null;
    return [
      g.nombre,
      g.zona || '—',
      g.lider || '—',
      metaMes > 0 ? money(metaMes) : '—',
      metaMes > 0 ? money(metaAnual) : '—',
      money(total),
      regs.length.toString(),
      pct !== null ? `${pct.toFixed(0)}%` : '—',
    ];
  });

  autoTable(doc, {
    startY: 34,
    head: [['Grupo', 'Zona', 'Líder', 'Meta/Mes', 'Meta/Año', 'Recaudado', 'Reg.', '% Cump.']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: COLORS.gold, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: COLORS.dark },
    alternateRowStyles: { fillColor: [250, 248, 240] },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
      6: { halign: 'center' },
      7: { halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.column.index === 7 && data.cell.section === 'body') {
        const txt = data.cell.text[0];
        if (txt.endsWith('%')) {
          const v = parseFloat(txt);
          if (v >= 100) data.cell.styles.textColor = COLORS.gold;
          else if (v >= 70) data.cell.styles.textColor = COLORS.green;
          else data.cell.styles.textColor = COLORS.red;
        }
      }
    },
  });

  footer(doc);
  doc.save(`bien-comun-grupos-${anio}.pdf`);
}

export function exportResumenGeneralPDF(opts: { resumenAnual: any; resumenCompleto: any; anio: string }) {
  const { resumenAnual, resumenCompleto, anio } = opts;
  const doc = new jsPDF();
  header(doc, 'Resumen General', `Año ${anio}`);

  kpiBox(doc, 14, 34, 44, 18, 'Total Recaudado', money(resumenAnual.total), COLORS.gold);
  kpiBox(doc, 62, 34, 44, 18, 'Diezmos', money(resumenAnual.diezmos), COLORS.green);
  kpiBox(doc, 110, 34, 44, 18, 'Ofrendas', money(resumenAnual.ofrendas), COLORS.yellow);
  kpiBox(doc, 158, 34, 44, 18, 'Dadores Activos', resumenCompleto.dadoresActivosAnio.toString(), COLORS.blue);

  doc.setFontSize(12);
  doc.setTextColor(...COLORS.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Estadísticas Destacadas', 14, 64);

  const stats = [
    ['Mejor Mes', resumenCompleto.mejorMes ? `${resumenCompleto.mejorMes.mes} — ${money(resumenCompleto.mejorMes.total)}` : '—'],
    ['Promedio Mensual', `${money(resumenCompleto.promedioMensual)} (con actividad)`],
    ['Total Aportes', `${resumenCompleto.totalAportes} registros`],
    ['Grupos Activos', `${resumenCompleto.gruposConOfrenda} con ofrenda`],
  ];
  autoTable(doc, {
    startY: 68,
    head: [['Indicador', 'Valor']],
    body: stats,
    theme: 'striped',
    headStyles: { fillColor: COLORS.gold, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Variación vs Año Anterior', 14, finalY);

  const variacion = [
    ['Total Recaudado', resumenCompleto.variacionTotal !== null ? `${resumenCompleto.variacionTotal >= 0 ? '+' : ''}${resumenCompleto.variacionTotal.toFixed(1)}%` : 'Sin datos'],
    ['Diezmos', resumenCompleto.variacionDiezmos !== null ? `${resumenCompleto.variacionDiezmos >= 0 ? '+' : ''}${resumenCompleto.variacionDiezmos.toFixed(1)}%` : 'Sin datos'],
    ['Ofrendas', resumenCompleto.variacionOfrendas !== null ? `${resumenCompleto.variacionOfrendas >= 0 ? '+' : ''}${resumenCompleto.variacionOfrendas.toFixed(1)}%` : 'Sin datos'],
  ];
  autoTable(doc, {
    startY: finalY + 4,
    head: [['Concepto', 'Variación']],
    body: variacion,
    theme: 'striped',
    headStyles: { fillColor: COLORS.gold, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'center', fontStyle: 'bold' } },
  });

  footer(doc);
  doc.save(`bien-comun-resumen-general-${anio}.pdf`);
}

export function exportResumenMensualPDF(opts: { mesesData: any[]; resumenAnual: any; anio: string }) {
  const { mesesData, resumenAnual, anio } = opts;
  const doc = new jsPDF();
  header(doc, 'Recaudación Mensual', `Año ${anio} · Detalle por mes`);

  const maxMes = Math.max(...mesesData.map(m => m.total), 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text('Gráfico de Recaudación Mensual', 14, 34);

  const chartTop = 38;
  const chartH = 8;
  mesesData.forEach((m, i) => {
    const y = chartTop + i * (chartH + 1.5);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.dim);
    doc.text(m.mes.toUpperCase(), 14, y + 5);
    const w = maxMes > 0 ? (m.total / maxMes) * 150 : 0;
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(30, y, 150, chartH, 1, 1, 'F');
    if (m.total > 0) {
      const wDz = (m.diezmos / m.total) * w;
      const wOf = (m.ofrendas / m.total) * w;
      doc.setFillColor(...COLORS.green);
      doc.roundedRect(30, y, wDz, chartH, 1, 1, 'F');
      doc.setFillColor(...COLORS.yellow);
      doc.roundedRect(30 + wDz, y, wOf, chartH, 1, 1, 'F');
    }
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.dark);
    doc.setFont('helvetica', 'bold');
    doc.text(money(m.total), 196, y + 5, { align: 'right' });
  });

  const tableY = chartTop + mesesData.length * 10 + 4;
  const rows = mesesData.map(m => {
    const pct = resumenAnual.total > 0 ? (m.total / resumenAnual.total) * 100 : 0;
    return [m.mes, money(m.diezmos), money(m.ofrendas), money(m.total), `${pct.toFixed(1)}%`];
  });
  rows.push(['TOTAL ANUAL', money(resumenAnual.diezmos), money(resumenAnual.ofrendas), money(resumenAnual.total), '100%']);

  autoTable(doc, {
    startY: tableY,
    head: [['Mes', 'Diezmos', 'Ofrendas', 'Total', '% Anual']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: COLORS.gold, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    footStyles: { fontStyle: 'bold', fillColor: [245, 245, 245] },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right', fontStyle: 'bold' },
      4: { halign: 'center' },
    },
  });

  footer(doc);
  doc.save(`bien-comun-resumen-mensual-${anio}.pdf`);
}

export function exportTopPDF(opts: { topDadores: any[]; topGrupos: any[]; anio: string }) {
  const { topDadores, topGrupos, anio } = opts;
  const doc = new jsPDF();
  header(doc, 'Top del Año', `Año ${anio} · Mejores dadores y grupos`);

  doc.setFontSize(12);
  doc.setTextColor(...COLORS.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('🏅 Top 5 Dadores', 14, 34);

  autoTable(doc, {
    startY: 38,
    head: [['#', 'Dador', 'Zona', 'Aportes', 'Total']],
    body: topDadores.map((d, i) => [
      (i + 1).toString(),
      `${d.nombre} ${d.apellido}`,
      d.zona || '—',
      d.regs.toString(),
      money(d.total),
    ]),
    theme: 'striped',
    headStyles: { fillColor: COLORS.gold, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12, fontStyle: 'bold' },
      3: { halign: 'center' },
      4: { halign: 'right', fontStyle: 'bold' },
    },
  });

  const finalY1 = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('⛪ Top 5 Grupos con Ofrendas', 14, finalY1);

  autoTable(doc, {
    startY: finalY1 + 4,
    head: [['#', 'Grupo', 'Zona', 'Ofrendas', 'Total']],
    body: topGrupos.map((g, i) => [
      (i + 1).toString(),
      g.nombre,
      g.zona || '—',
      g.regs.toString(),
      money(g.total),
    ]),
    theme: 'striped',
    headStyles: { fillColor: COLORS.gold, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12, fontStyle: 'bold' },
      3: { halign: 'center' },
      4: { halign: 'right', fontStyle: 'bold' },
    },
  });

  if (topDadores.length === 0 && topGrupos.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.dim);
    doc.text('Sin datos para el año seleccionado.', 14, 80);
  }

  footer(doc);
  doc.save(`bien-comun-top-${anio}.pdf`);
}

export function exportMetasPDF(opts: { cumplimiento: any; anio: string; colaboradores: any[]; grupos: any[] }) {
  const { cumplimiento, anio } = opts;
  const doc = new jsPDF();
  header(doc, 'Plan de Metas', `Año ${anio} · Configuración del plan propuesto`);

  kpiBox(doc, 14, 34, 44, 18, 'Meta Mensual', money(cumplimiento.metaGlobalMes), COLORS.blue);
  kpiBox(doc, 62, 34, 44, 18, 'Meta Anual', money(cumplimiento.metaGlobalAnual), COLORS.gold);
  kpiBox(doc, 110, 34, 44, 18, 'Recaudado', money(cumplimiento.totalRecAnio), COLORS.green);
  const pctColor = cumplimiento.pctGlobal >= 100 ? COLORS.gold : cumplimiento.pctGlobal >= 70 ? COLORS.green : COLORS.red;
  kpiBox(doc, 158, 34, 44, 18, '% Cumplimiento', cumplimiento.metaGlobalAnual > 0 ? `${cumplimiento.pctGlobal.toFixed(1)}%` : '—', pctColor);

  doc.setFontSize(12);
  doc.setTextColor(...COLORS.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Plan de Diezmos por Dador', 14, 64);

  autoTable(doc, {
    startY: 68,
    head: [['Dador', 'Zona', 'Plan Diezmo', 'Meta/Año', 'Recaudado', '%']],
    body: cumplimiento.cumplimientoDadores.map((d: any) => [
      `${d.nombre} ${d.apellido}`,
      d.zona,
      d.planDiezmo > 0 ? money(d.planDiezmo) : '—',
      d.planDiezmo > 0 ? money(d.metaAnual) : '—',
      money(d.total),
      d.pct !== null ? `${d.pct.toFixed(0)}%` : '—',
    ]),
    theme: 'striped',
    headStyles: { fillColor: COLORS.gold, textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold' },
      5: { halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.column.index === 5 && data.cell.section === 'body') {
        const txt = data.cell.text[0];
        if (txt.endsWith('%')) {
          const v = parseFloat(txt);
          if (v >= 100) data.cell.styles.textColor = COLORS.gold;
          else if (v >= 70) data.cell.styles.textColor = COLORS.green;
          else data.cell.styles.textColor = COLORS.red;
        }
      }
    },
  });

  let finalY = (doc as any).lastAutoTable.finalY + 8;
  if (finalY > 240) { doc.addPage(); finalY = 20; }
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Plan de Ofrendas por Grupo', 14, finalY);

  autoTable(doc, {
    startY: finalY + 4,
    head: [['Grupo', 'Zona', 'Meta/Mes', 'Meta/Año', 'Recaudado', '%']],
    body: cumplimiento.cumplimientoGrupos.map((g: any) => [
      g.nombre,
      g.zona,
      g.planOfrendasMensual > 0 ? money(g.planOfrendasMensual) : '—',
      g.planOfrendasMensual > 0 ? money(g.metaAnual) : '—',
      money(g.total),
      g.pct !== null ? `${g.pct.toFixed(0)}%` : '—',
    ]),
    theme: 'striped',
    headStyles: { fillColor: COLORS.gold, textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold' },
      5: { halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.column.index === 5 && data.cell.section === 'body') {
        const txt = data.cell.text[0];
        if (txt.endsWith('%')) {
          const v = parseFloat(txt);
          if (v >= 100) data.cell.styles.textColor = COLORS.gold;
          else if (v >= 70) data.cell.styles.textColor = COLORS.green;
          else data.cell.styles.textColor = COLORS.red;
        }
      }
    },
  });

  footer(doc);
  doc.save(`bien-comun-metas-${anio}.pdf`);
}

export function exportCumplimientoPDF(opts: { cumplimiento: any; anio: string }) {
  const { cumplimiento, anio } = opts;
  const doc = new jsPDF();
  header(doc, 'Cumplimiento del Plan', `Año ${anio} · Seguimiento de metas`);

  const pctColor = cumplimiento.pctGlobal >= 100 ? COLORS.gold : cumplimiento.pctGlobal >= 70 ? COLORS.green : COLORS.red;
  kpiBox(doc, 14, 34, 44, 18, 'Meta Anual', money(cumplimiento.metaGlobalAnual), COLORS.gold);
  kpiBox(doc, 62, 34, 44, 18, 'Recaudado', money(cumplimiento.totalRecAnio), COLORS.green);
  kpiBox(doc, 110, 34, 44, 18, '% Cumplimiento', cumplimiento.metaGlobalAnual > 0 ? `${cumplimiento.pctGlobal.toFixed(1)}%` : '—', pctColor);
  kpiBox(doc, 158, 34, 44, 18, cumplimiento.totalRecAnio >= cumplimiento.metaGlobalAnual ? 'Superávit' : 'Faltante', money(Math.abs(cumplimiento.metaGlobalAnual - cumplimiento.totalRecAnio)), COLORS.blue);

  doc.setFontSize(10);
  doc.setTextColor(...COLORS.dim);
  doc.text(`Recaudado: ${money(cumplimiento.totalRecAnio)} de ${money(cumplimiento.metaGlobalAnual)}`, 14, 62);
  progressBar(doc, 14, 65, 182, 5, cumplimiento.pctGlobal, pctColor);
  doc.setFontSize(8);
  doc.text(`${cumplimiento.pctGlobal.toFixed(1)}%`, 196, 69, { align: 'right' });

  doc.setFontSize(12);
  doc.setTextColor(...COLORS.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Cumplimiento Mensual', 14, 80);

  autoTable(doc, {
    startY: 84,
    head: [['Mes', 'Meta Mes', 'Real', '% Mes', 'Acum. Real', '% Acum.']],
    body: cumplimiento.mensuales.map((m: any) => [
      m.etiqueta,
      cumplimiento.metaGlobalMes > 0 ? money(m.metaEsperada) : '—',
      money(m.total),
      m.pct !== null ? `${m.pct.toFixed(0)}%` : '—',
      money(m.acumulado),
      m.pctAcumulado !== null ? `${m.pctAcumulado.toFixed(0)}%` : '—',
    ]),
    theme: 'striped',
    headStyles: { fillColor: COLORS.gold, textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right', fontStyle: 'bold' },
      3: { halign: 'center' },
      4: { halign: 'right', fontStyle: 'bold' },
      5: { halign: 'center' },
    },
    didParseCell: (data) => {
      if ([3, 5].includes(data.column.index) && data.cell.section === 'body') {
        const txt = data.cell.text[0];
        if (txt.endsWith('%')) {
          const v = parseFloat(txt);
          if (v >= 100) data.cell.styles.textColor = COLORS.gold;
          else if (v >= 70) data.cell.styles.textColor = COLORS.green;
          else data.cell.styles.textColor = COLORS.red;
        }
      }
    },
  });

  let finalY = (doc as any).lastAutoTable.finalY + 8;
  if (finalY > 240) { doc.addPage(); finalY = 20; }
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Por Trimestre y Semestre', 14, finalY);

  const allPeriodos = [...cumplimiento.trimestres, ...cumplimiento.semestres, cumplimiento.anual];
  autoTable(doc, {
    startY: finalY + 4,
    head: [['Período', 'Tipo', 'Meta', 'Real', '%']],
    body: allPeriodos.map(p => [
      p.etiqueta,
      p.tipo.charAt(0).toUpperCase() + p.tipo.slice(1),
      p.metaEsperada > 0 ? money(p.metaEsperada) : '—',
      money(p.total),
      p.pct !== null ? `${p.pct.toFixed(0)}%` : '—',
    ]),
    theme: 'striped',
    headStyles: { fillColor: COLORS.gold, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right', fontStyle: 'bold' },
      4: { halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.column.index === 4 && data.cell.section === 'body') {
        const txt = data.cell.text[0];
        if (txt.endsWith('%')) {
          const v = parseFloat(txt);
          if (v >= 100) data.cell.styles.textColor = COLORS.gold;
          else if (v >= 70) data.cell.styles.textColor = COLORS.green;
          else data.cell.styles.textColor = COLORS.red;
        }
      }
    },
  });

  footer(doc);
  doc.save(`bien-comun-cumplimiento-${anio}.pdf`);
}

export function exportMiembrosPDF(opts: { miembros: any[]; filtros?: any }) {
  const { miembros, filtros } = opts;
  const doc = new jsPDF();
  const subtitulo = filtros 
    ? `Filtros: ${[filtros.estado, filtros.zona, filtros.contacto].filter(Boolean).join(' · ')}`
    : `${miembros.length} miembros registrados`;
  header(doc, 'Directorio de Miembros', subtitulo, 'Misión Bíblica');

  const rows = miembros.map((m, i) => [
    (i + 1).toString(),
    `${m.nombre} ${m.apellido}`,
    m.zona || '—',
    m.estado,
    m.telefono || '—',
    m.email || '—',
    m.profesion || '—',
  ]);

  autoTable(doc, {
    startY: 34,
    head: [['#', 'Nombre', 'Zona', 'Estado', 'Teléfono', 'Email', 'Profesión']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: COLORS.gold, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: COLORS.dark },
    alternateRowStyles: { fillColor: [250, 248, 240] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      3: { halign: 'center' },
    },
  });

  footer(doc);
  doc.save(`mision-miembros-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportMinisteriosPDF(opts: { ministerios: any[]; asignaciones: any[]; miembros: any[] }) {
  const { ministerios, asignaciones, miembros } = opts;
  const doc = new jsPDF();
  header(doc, 'Ministerios y Asignaciones', `${ministerios.length} ministerios activos`, 'Misión Bíblica');

  let currentY = 34;
  ministerios.forEach((mn) => {
    if (currentY > 240) { doc.addPage(); currentY = 20; }
    
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.dark);
    doc.setFont('helvetica', 'bold');
    doc.text(`${mn.emoji} ${mn.nombre}`, 14, currentY);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.dim);
    doc.text(`Líder: ${mn.lider || '—'} · ${mn.descripcion || 'Sin descripción'}`, 14, currentY + 5);
    
    const asigs = asignaciones.filter(a => a.ministerioId === mn.id);
    const rows = asigs.map(a => {
      const m = miembros.find(x => x.id === a.miembroId);
      return [
        m ? `${m.nombre} ${m.apellido}` : 'Desconocido',
        a.rol,
        a.desde,
        a.notas || '—',
      ];
    });

    autoTable(doc, {
      startY: currentY + 10,
      head: [['Miembro', 'Rol', 'Desde', 'Notas']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: COLORS.gold, textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'center' },
      },
    });
    currentY = (doc as any).lastAutoTable.finalY + 12;
  });

  footer(doc);
  doc.save(`mision-ministerios-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportHitosPDF(opts: { hitos: any[]; miembros: any[] }) {
  const { hitos, miembros } = opts;
  const doc = new jsPDF();
  header(doc, 'Historial de Crecimiento', `${hitos.length} hitos registrados`, 'Misión Bíblica');

  const rows = hitos.map((h, i) => {
    const m = miembros.find(x => x.id === h.miembroId);
    return [
      (i + 1).toString(),
      h.fecha,
      m ? `${m.nombre} ${m.apellido}` : '—',
      h.tipo,
      h.descripcion,
    ];
  });

  autoTable(doc, {
    startY: 34,
    head: [['#', 'Fecha', 'Miembro', 'Tipo', 'Descripción']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: COLORS.gold, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: COLORS.dark },
    alternateRowStyles: { fillColor: [250, 248, 240] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center' },
      3: { halign: 'center' },
    },
  });

  footer(doc);
  doc.save(`mision-hitos-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportEstudiantesPDF(opts: { estudiantes: any[]; filtros?: any }) {
  const { estudiantes, filtros } = opts;
  const doc = new jsPDF();
  const subtitulo = filtros 
    ? `Filtros: ${[filtros.curso, filtros.estado].filter(Boolean).join(' · ')}`
    : `${estudiantes.length} estudiantes matriculados`;
  header(doc, 'Registro de Estudiantes', subtitulo, 'Misión Bíblica');

  const activos = estudiantes.filter(e => e.estado === 'Activo').length;
  const completados = estudiantes.filter(e => e.estado === 'Completado').length;

  kpiBox(doc, 14, 34, 58, 18, 'Total', estudiantes.length.toString(), COLORS.blue);
  kpiBox(doc, 76, 34, 58, 18, 'Activos', activos.toString(), COLORS.green);
  kpiBox(doc, 138, 34, 58, 18, 'Completados', completados.toString(), COLORS.purple);

  const rows = estudiantes.map((e, i) => [
    (i + 1).toString(),
    `${e.nombre} ${e.apellido}`,
    e.cursoId || '—',
    e.fecha,
    e.estado,
    e.telefono || '—',
  ]);

  autoTable(doc, {
    startY: 58,
    head: [['#', 'Estudiante', 'Curso (ID)', 'Inicio', 'Estado', 'Teléfono']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: COLORS.blue, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: COLORS.dark },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      4: { halign: 'center' },
    },
  });

  footer(doc);
  doc.save(`academia-estudiantes-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportCursosPDF(opts: { cursos: any[]; lecciones: any[] }) {
  const { cursos, lecciones } = opts;
  const doc = new jsPDF();
  header(doc, 'Catálogo de Cursos', `${cursos.length} cursos registrados`, 'Misión Bíblica');

  const rows = cursos.map(c => {
    const lCount = lecciones.filter(l => l.cursoId === c.id).length;
    return [
      c.nombre,
      c.nivel,
      c.instructor,
      c.duracion ? `${c.duracion} sem` : '—',
      lCount.toString(),
      c.estado,
    ];
  });

  autoTable(doc, {
    startY: 34,
    head: [['Curso', 'Nivel', 'Instructor', 'Duración', 'Lecciones', 'Estado']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: COLORS.gold, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: COLORS.dark },
    columnStyles: {
      4: { halign: 'center' },
      5: { halign: 'center' },
    },
  });

  footer(doc);
  doc.save(`academia-cursos-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportCertificadosPDF(opts: { certs: any[]; estudiantes: any[]; cursos: any[] }) {
  const { certs, estudiantes, cursos } = opts;
  const doc = new jsPDF();
  header(doc, 'Registro de Certificaciones', `${certs.length} certificados emitidos`, 'Misión Bíblica');

  const rows = certs.map((c, i) => {
    const e = estudiantes.find(x => x.id === c.estId);
    const cu = cursos.find(x => x.id === c.cursoId);
    return [
      (i + 1).toString(),
      e ? `${e.nombre} ${e.apellido}` : '—',
      cu ? cu.nombre : '—',
      c.fecha,
      c.calificacion,
    ];
  });

  autoTable(doc, {
    startY: 34,
    head: [['#', 'Estudiante', 'Curso', 'Fecha', 'Calificación']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: COLORS.purple, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: COLORS.dark },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      4: { halign: 'center', fontStyle: 'bold' },
    },
  });

  footer(doc);
  doc.save(`academia-certificados-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportConversionesPDF(opts: { conversiones: any[]; filtros?: any }) {
  const { conversiones, filtros } = opts;
  const doc = new jsPDF();
  const subtitulo = filtros 
    ? `Filtros: ${[filtros.estado, filtros.zona].filter(Boolean).join(' · ')}`
    : `${conversiones.length} registros en total`;
  header(doc, 'Registro de Conversiones', subtitulo, 'Misión Bíblica');

  const total = conversiones.length;
  const integrados = conversiones.filter(c => c.estado === 'Integrado').length;
  const pctInt = total > 0 ? (integrados / total * 100).toFixed(1) : '0';

  kpiBox(doc, 14, 34, 58, 18, 'Total', total.toString(), COLORS.blue);
  kpiBox(doc, 76, 34, 58, 18, 'Integrados', integrados.toString(), COLORS.purple);
  kpiBox(doc, 138, 34, 58, 18, '% Integración', `${pctInt}%`, COLORS.gold);

  const rows = conversiones.map((c, i) => [
    (i + 1).toString(),
    `${c.nombre} ${c.apellido}`,
    c.estado,
    c.zona || '—',
    c.lider || '—',
    c.fecha,
    c.telefono || '—',
  ]);

  autoTable(doc, {
    startY: 58,
    head: [['#', 'Nombre', 'Estado', 'Zona', 'Mayor', 'Fecha', 'Teléfono']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: COLORS.blue, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: COLORS.dark },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      2: { halign: 'center' },
    },
  });

  footer(doc);
  doc.save(`mision-conversiones-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportGruposMisionPDF(opts: { grupos: any[]; miembros: any[] }) {
  const { grupos, miembros } = opts;
  const doc = new jsPDF();
  header(doc, 'Directorio de Grupos de Misión', `${grupos.length} grupos activos`, 'Misión Bíblica');

  const totalMiembros = grupos.reduce((sum, g) => {
    const m = miembros.filter(mi => mi.grupoId === g.id).length;
    return sum + m;
  }, 0);

  kpiBox(doc, 14, 34, 58, 18, 'Total Grupos', grupos.length.toString(), COLORS.gold);
  kpiBox(doc, 76, 34, 58, 18, 'Miembros Totales', totalMiembros.toString(), COLORS.green);
  kpiBox(doc, 138, 34, 58, 18, 'Promedio/Grupo', grupos.length > 0 ? (totalMiembros / grupos.length).toFixed(1) : '0', COLORS.blue);

  const rows = grupos.map(g => {
    const mCount = miembros.filter(mi => mi.grupoId === g.id).length;
    const cap = parseInt(g.capacidad) || 0;
    const pct = cap > 0 ? (mCount / cap * 100).toFixed(0) : '—';
    return [
      g.nombre,
      g.zona || '—',
      g.lider || '—',
      `${g.dia} ${g.hora}`,
      mCount.toString(),
      cap > 0 ? `${cap}` : '—',
      pct + '%',
    ];
  });

  autoTable(doc, {
    startY: 58,
    head: [['Grupo', 'Zona', 'Mentor', 'Horario', 'Miembros', 'Cap.', '% Ocup.'],],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: COLORS.gold, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: COLORS.dark },
    columnStyles: {
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'center', fontStyle: 'bold' },
    },
  });

  footer(doc);
  doc.save(`mision-grupos-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportEvangelismoPDF(opts: { evangelismos: any[] }) {
  const { evangelismos } = opts;
  const doc = new jsPDF();
  header(doc, 'Actividades de Evangelismo', `${evangelismos.length} actividades`, 'Misión Bíblica');

  const totalContacts = evangelismos.reduce((s, e) => s + (parseInt(e.contactos) || 0), 0);
  const totalConvs = evangelismos.reduce((s, e) => s + (parseInt(e.conversiones) || 0), 0);

  kpiBox(doc, 14, 34, 58, 18, 'Total Actividades', evangelismos.length.toString(), COLORS.blue);
  kpiBox(doc, 76, 34, 58, 18, 'Contactos Totales', totalContacts.toString(), COLORS.green);
  kpiBox(doc, 138, 34, 58, 18, 'Conversiones', totalConvs.toString(), COLORS.gold);

  const rows = evangelismos.map((e, i) => [
    (i + 1).toString(),
    e.fecha,
    e.tipo,
    e.zona || '—',
    e.lider || '—',
    (e.participantes || []).length.toString(),
    e.contactos || '0',
    e.conversiones || '0',
  ]);

  autoTable(doc, {
    startY: 58,
    head: [['#', 'Fecha', 'Tipo', 'Zona', 'Ministro', 'Equipo', 'Cont.', 'Conv.']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: COLORS.blue, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: COLORS.dark },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      5: { halign: 'center' },
      6: { halign: 'center' },
      7: { halign: 'center', fontStyle: 'bold' },
    },
  });

  footer(doc);
  doc.save(`mision-evangelismo-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportReporteGeneralPDF(opts: { datos: any; periodo: string; desde: string; hasta: string }) {
  const { datos, periodo, desde, hasta } = opts;
  const doc = new jsPDF();
  header(doc, 'Reporte General', `${periodo} · ${fmt(desde)} → ${fmt(hasta)}`);

  const pctMeta = datos.finanzas.planMensual ? Math.round((datos.finanzas.totalFinal / datos.finanzas.planMensual) * 100) : 0;
  const pctColor = pctMeta >= 100 ? COLORS.gold : pctMeta >= 70 ? COLORS.green : COLORS.red;
  kpiBox(doc, 14, 34, 44, 18, 'Total Final', money(datos.finanzas.totalFinal), COLORS.gold);
  kpiBox(doc, 62, 34, 44, 18, 'Bien Común', money(datos.finanzas.bienComunTotal), COLORS.green);
  kpiBox(doc, 110, 34, 44, 18, 'Colaboradores', money(datos.finanzas.colaboradoresTotal), COLORS.yellow);
  kpiBox(doc, 158, 34, 44, 18, '% de Meta', `${pctMeta}%`, pctColor);

  let y = 58;
  const section = (title: string, rows: [string, string][]) => {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.dark);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [['Indicador', 'Valor']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: COLORS.gold, textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  };

  section('Misión Bíblica', [
    ['Conversiones (período)', datos.conv.total.toString()],
    ['Mes actual', datos.conv.mesActual.toString()],
    ['Integrados', datos.conv.integrados.toString()],
    ['Grupos activos', datos.conv.grupos.toString()],
    ['Evangelismos', datos.evang.total.toString()],
    ['Contactos alcanzados', datos.evang.contactos.toLocaleString('en-US')],
    ['Conversiones evangelísticas', datos.evang.conversiones.toString()],
  ]);

  section('Academia', [
    ['Cursos totales', datos.academia.cursos.toString()],
    ['Cursos activos', datos.academia.cursosActivos.toString()],
    ['Estudiantes matriculados', datos.academia.estudiantes.toString()],
    ['Certificados emitidos', datos.academia.certificados.toString()],
  ]);

  section('Finanzas', [
    ['Diezmos (Bien Común)', money(datos.finanzas.bienComunDiezmos)],
    ['Ofrendas (Bien Común)', money(datos.finanzas.bienComunOfrendas)],
    ['Total Bien Común', money(datos.finanzas.bienComunTotal)],
    ['Plan mensual Bien Común', money(datos.finanzas.bienComunPlan)],
    ['Ayuda / Ofrendas (Colab.)', money(datos.finanzas.colaboradoresAyuda)],
    ['Misiones (Colab.)', money(datos.finanzas.colaboradoresMisiones)],
    ['Manos Abiertas (Colab.)', money(datos.finanzas.colaboradoresManosAbiertas)],
    ['Construcción (Colab.)', money(datos.finanzas.colaboradoresConstruccion)],
    ['Otros (Colab.)', money(datos.finanzas.colaboradoresOtro)],
    ['Total Colaboradores', money(datos.finanzas.colaboradoresTotal)],
    ['Plan mensual Colaboradores', money(datos.finanzas.colaboradoresPlan)],
    ['TOTAL FINAL', money(datos.finanzas.totalFinal)],
    ['Plan mensual global', money(datos.finanzas.planMensual)],
    ['% de meta', `${pctMeta}%`],
  ]);

  section('Manos Abiertas', [
    ['Beneficiarios registrados', datos.manos.beneficiarios.toString()],
    ['Campañas (período)', datos.manos.campanas.toString()],
    ['Entregas (período)', datos.manos.entregas.toString()],
    ['Familias impactadas', datos.manos.familias.toString()],
    ['Personas alcanzadas', datos.manos.personas.toString()],
  ]);

  section('Negocios Adonay', [
    ['Proyectos activos', datos.negocios.activos.toString()],
    ['Emprendedores únicos', datos.negocios.emprendedores.toString()],
    ['Ingresos mensuales', money(datos.negocios.ingresos)],
  ]);

  section('Comunicación', [
    ['Publicaciones', datos.comunicacion.publicaciones.toString()],
    ['Alcance total', datos.comunicacion.alcance.toLocaleString('en-US')],
    ['Engagement total', datos.comunicacion.engagement.toLocaleString('en-US')],
    ['Engagement rate', `${datos.comunicacion.alcance ? ((datos.comunicacion.engagement / datos.comunicacion.alcance) * 100).toFixed(1) : '0.0'}%`],
  ]);

  footer(doc);
  doc.save(`reporte-lemgil-${new Date().toISOString().slice(0, 10)}.pdf`);
}
