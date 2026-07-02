import { useState, useMemo } from 'react';
import { exportCSV } from '../../lib/csvExport';
import { db } from '../../lib/database';
import {
  exportResumenGeneralPDF,
  exportResumenMensualPDF,
  exportTopPDF,
  exportMetasPDF,
  exportCumplimientoPDF,
} from '../../lib/pdfExport';
import { money, MS_SHORT, monthKey } from '../../lib/utils';
import type { Diezmador, AporteComun, Grupo } from '../../lib/types';
import { showToast } from '../../lib/notification';

interface ResumenTabProps {
  aportes: AporteComun[];
  colaboradores: Diezmador[];
  grupos: Grupo[];
}

export function ResumenTab({ aportes, colaboradores, grupos }: ResumenTabProps) {
  const [anioResumen, setAnioResumen] = useState(new Date().getFullYear().toString());
  const [subTab, setSubTab] = useState<'general' | 'mensual' | 'top' | 'metas' | 'cumplimiento'>('general');

  const resumenAnual = useMemo(() => {
    const regsAnio = aportes.filter(a => a.fecha.startsWith(anioResumen));
    const total = regsAnio.reduce((s, a) => s + (a.monto || 0), 0);
    const diezmos = regsAnio.filter(a => a.tipo === 'Diezmo').reduce((s, a) => s + (a.monto || 0), 0);
    const ofrendas = regsAnio.filter(a => a.tipo === 'Ofrenda').reduce((s, a) => s + (a.monto || 0), 0);
    return { total, diezmos, ofrendas };
  }, [aportes, anioResumen]);

  const resumenCompleto = useMemo(() => {
    const regsAnio = aportes.filter(a => a.fecha.startsWith(anioResumen));
    const mesesData = MS_SHORT.map((m: string, i: number) => {
      const mesIdx = (i + 1).toString().padStart(2, '0');
      const regsMes = regsAnio.filter(a => a.fecha.startsWith(`${anioResumen}-${mesIdx}`));
      const totMes = regsMes.reduce((s, a) => s + (a.monto || 0), 0);
      const dzMes = regsMes.filter(a => a.tipo === 'Diezmo').reduce((s, a) => s + (a.monto || 0), 0);
      const ofMes = regsMes.filter(a => a.tipo === 'Ofrenda').reduce((s, a) => s + (a.monto || 0), 0);
      return { mes: m, idx: i, total: totMes, diezmos: dzMes, ofrendas: ofMes, regs: regsMes.length };
    });
    const anioPrev = (parseInt(anioResumen) - 1).toString();
    const regsAnioPrev = aportes.filter(a => a.fecha.startsWith(anioPrev));
    const totalPrev = regsAnioPrev.reduce((s, a) => s + (a.monto || 0), 0);
    const diezmosPrev = regsAnioPrev.filter(a => a.tipo === 'Diezmo').reduce((s, a) => s + (a.monto || 0), 0);
    const ofrendasPrev = regsAnioPrev.filter(a => a.tipo === 'Ofrenda').reduce((s, a) => s + (a.monto || 0), 0);
    const mesesConData = mesesData.filter((m: { total: number }) => m.total > 0);
    const mejorMes = mesesConData.length > 0 ? mesesConData.reduce((max: { mes: string; total: number }, m: { mes: string; total: number }) => m.total > max.total ? m : max, mesesConData[0]) : null;
    const promedioMensual = mesesConData.length > 0 ? mesesConData.reduce((s: number, m: { total: number }) => s + m.total, 0) / mesesConData.length : 0;
    const idsActivos = new Set(regsAnio.map(a => a.diezmadorId).filter(Boolean));
    const diezmadoresActivosAnio = colaboradores.filter(c => idsActivos.has(c.id)).length;
    const topDiezmadores = colaboradores.map(c => {
      const regs = regsAnio.filter(a => a.diezmadorId === c.id);
      const tot = regs.reduce((s, a) => s + (a.monto || 0), 0);
      return { id: c.id, nombre: c.nombre, apellido: c.apellido, zona: c.zona, total: tot, regs: regs.length };
    }).filter(c => c.total > 0).sort((a, b) => b.total - a.total).slice(0, 5);
    const topGrupos = grupos.map(g => {
      const regs = regsAnio.filter(a => a.grupoId === g.id && a.tipo === 'Ofrenda');
      const tot = regs.reduce((s, a) => s + (a.monto || 0), 0);
      return { id: g.id, nombre: g.nombre, zona: g.zona, total: tot, regs: regs.length };
    }).filter(g => g.total > 0).sort((a, b) => b.total - a.total).slice(0, 5);
    const variacionTotal = totalPrev > 0 ? ((resumenAnual.total - totalPrev) / totalPrev) * 100 : null;
    const variacionDiezmos = diezmosPrev > 0 ? ((resumenAnual.diezmos - diezmosPrev) / diezmosPrev) * 100 : null;
    const variacionOfrendas = ofrendasPrev > 0 ? ((resumenAnual.ofrendas - ofrendasPrev) / ofrendasPrev) * 100 : null;
    return { mesesData, mejorMes, promedioMensual, diezmadoresActivosAnio, topDiezmadores, topGrupos, totalAportes: regsAnio.length, gruposConOfrenda: topGrupos.length, variacionTotal, variacionDiezmos, variacionOfrendas };
  }, [aportes, anioResumen, colaboradores, grupos, resumenAnual]);

  const cumplimiento = useMemo(() => {
    const regsAnio = aportes.filter(a => a.fecha.startsWith(anioResumen));
    const metaGlobalAnual = colaboradores.reduce((s, c) => s + (c.planDiezmo || 0) * 12, 0);
    const metaGlobalMes = metaGlobalAnual / 12;
    const totalRecAnio = regsAnio.reduce((s, a) => s + (a.monto || 0), 0);
    const totalRecMesActual = regsAnio.filter(a => monthKey(a.fecha) === new Date().toISOString().slice(0, 7)).reduce((s, a) => s + (a.monto || 0), 0);
    const pctGlobal = metaGlobalAnual > 0 ? (totalRecAnio / metaGlobalAnual) * 100 : 0;
    const mesActualNum = new Date().getMonth() + 1;
    const metaAcumuladaEsperada = metaGlobalAnual > 0 ? (metaGlobalMes * mesActualNum) : 0;
    const cumplimientoDiezmadores = colaboradores.map(c => {
      const regs = regsAnio.filter(a => a.diezmadorId === c.id);
      const total = regs.reduce((s, a) => s + (a.monto || 0), 0);
      const planDiezmo = c.planDiezmo || 0;
      const metaAnual = planDiezmo * 12;
      const pct = metaAnual > 0 ? (total / metaAnual) * 100 : null;
      return { id: c.id, nombre: c.nombre, apellido: c.apellido, zona: c.zona || '—', planDiezmo, metaAnual, total, regs: regs.length, pct };
    }).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
    const cumplimientoGrupos = grupos.map(g => {
      const regs = regsAnio.filter(a => a.grupoId === g.id && a.tipo === 'Ofrenda');
      const total = regs.reduce((s, a) => s + (a.monto || 0), 0);
      const metaMes = g.planOfrendasMensual || 0;
      const metaAnual = metaMes * 12;
      const pct = metaAnual > 0 ? (total / metaAnual) * 100 : null;
      return { id: g.id, nombre: g.nombre, zona: g.zona || '—', planOfrendasMensual: metaMes, metaAnual, total, regs: regs.length, pct };
    }).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
    const periodos = MS_SHORT.map((m: string, i: number) => {
      const mesIdx = (i + 1).toString().padStart(2, '0');
      const regsMes = regsAnio.filter(a => a.fecha.startsWith(`${anioResumen}-${mesIdx}`));
      const total = regsMes.reduce((s, a) => s + (a.monto || 0), 0);
      const metaEsperada = metaGlobalMes;
      const pct = metaEsperada > 0 ? (total / metaEsperada) * 100 : null;
      return { etiqueta: m, tipo: 'mes' as const, total, metaEsperada, pct, idx: i };
    });
    const acumulados = [];
    let acum = 0;
    for (let i = 0; i < 12; i++) {
      acum += periodos[i].total;
      const metaAcum = metaGlobalMes * (i + 1);
      acumulados.push({ ...periodos[i], acumulado: acum, metaAcumulada: metaAcum, pctAcumulado: metaAcum > 0 ? (acum / metaAcum) * 100 : null });
    }
    type Periodo = { etiqueta: string; tipo: 'mes' | 'trimestre' | 'semestre' | 'año'; total: number; metaEsperada: number; pct: number | null; idx?: number };
    const trimestres: Periodo[] = [];
    for (let t = 0; t < 4; t++) {
      const regsT = regsAnio.filter(a => {
        const mes = parseInt(a.fecha.slice(5, 7));
        return Math.floor((mes - 1) / 3) === t;
      });
      const total = regsT.reduce((s, a) => s + (a.monto || 0), 0);
      const metaEsperada = metaGlobalAnual / 4;
      const pct = metaEsperada > 0 ? (total / metaEsperada) * 100 : null;
      trimestres.push({ etiqueta: `Q${t + 1}`, tipo: 'trimestre' as const, total, metaEsperada, pct });
    }
    const semestres: Periodo[] = [];
    for (let s = 0; s < 2; s++) {
      const regsS = regsAnio.filter(a => {
        const mes = parseInt(a.fecha.slice(5, 7));
        return Math.floor((mes - 1) / 6) === s;
      });
      const total = regsS.reduce((s, a) => s + (a.monto || 0), 0);
      const metaEsperada = metaGlobalAnual / 2;
      const pct = metaEsperada > 0 ? (total / metaEsperada) * 100 : null;
      semestres.push({ etiqueta: s === 0 ? '1er Semestre' : '2do Semestre', tipo: 'semestre' as const, total, metaEsperada, pct });
    }
    const anual = { etiqueta: anioResumen, tipo: 'año' as const, total: totalRecAnio, metaEsperada: metaGlobalAnual, pct: metaGlobalAnual > 0 ? (totalRecAnio / metaGlobalAnual) * 100 : null };
    return { metaGlobalAnual, metaGlobalMes, totalRecAnio, totalRecMesActual, pctGlobal, metaAcumuladaEsperada, cumplimientoDiezmadores, cumplimientoGrupos, mensuales: acumulados, trimestres, semestres, anual };
  }, [aportes, anioResumen, colaboradores, grupos]);

  const handleExportPDF = () => {
    if (subTab === 'general') exportResumenGeneralPDF({ resumenAnual, resumenCompleto, anio: anioResumen });
    else if (subTab === 'mensual') exportResumenMensualPDF({ mesesData: resumenCompleto.mesesData, resumenAnual, anio: anioResumen });
    else if (subTab === 'top') exportTopPDF({ topDadores: resumenCompleto.topDiezmadores, topGrupos: resumenCompleto.topGrupos, anio: anioResumen });
    else if (subTab === 'metas') exportMetasPDF({ cumplimiento, anio: anioResumen, colaboradores, grupos });
    else if (subTab === 'cumplimiento') exportCumplimientoPDF({ cumplimiento, anio: anioResumen });
  };

  const handleExportCSV = () => {
    const h = ['Métrica', 'Valor'];
    let r: (string | number)[][] = [];
    if (subTab === 'general') {
      r = [
        ['Año', anioResumen],
        ['Total Recaudado', resumenAnual.total],
        ['Diezmos', resumenAnual.diezmos],
        ['Ofrendas', resumenAnual.ofrendas],
        ['Diezmadores Activos', resumenCompleto.diezmadoresActivosAnio],
        ['Grupos con Ofrendas', resumenCompleto.gruposConOfrenda],
        ['Promedio Mensual', Math.round(resumenCompleto.promedioMensual)],
      ];
    } else if (subTab === 'mensual') {
      r = resumenCompleto.mesesData.map((m: { mes: string; diezmos: number; ofrendas: number; total: number }) => [m.mes, `Diezmos: ${m.diezmos} | Ofrendas: ${m.ofrendas} | Total: ${m.total}`]);
    } else if (subTab === 'top') {
      r = [
        ...resumenCompleto.topDiezmadores.map((d, i) => [`Top ${i+1} Diezmador`, `${d.nombre} ${d.apellido}: ${money(d.total)}`]),
        ...resumenCompleto.topGrupos.map((g, i) => [`Top ${i+1} Grupo`, `${g.nombre}: ${money(g.total)}`]),
      ];
    } else if (subTab === 'metas') {
      r = cumplimiento.cumplimientoDiezmadores.map(c => [`${c.nombre} ${c.apellido}`, `Plan: ${money(c.metaAnual)} | Real: ${money(c.total)} | ${c.pct !== null ? `${Math.round(c.pct)}%` : '—'}`]);
    } else if (subTab === 'cumplimiento') {
      r = cumplimiento.mensuales.map(m => [m.etiqueta, `${money(m.total)} / ${money(m.metaEsperada)} | ${m.pct !== null ? `${Math.round(m.pct)}%` : '—'}`]);
    }
    exportCSV(h, r, `lemgil-resumen-${subTab}-${anioResumen}.csv`);
    showToast('CSV exportado');
  };

  return (
    <div className="page-content">
      <div className="actions-row" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap'}}>
          <span style={{fontSize: '18px', fontWeight: 700}}>📅 Año:</span>
          <select className="filter-select" value={anioResumen} onChange={e => setAnioResumen(e.target.value)} style={{fontWeight: 600}}>
            {[...new Set(aportes.map(a => a.fecha.slice(0, 4)))].sort().reverse().map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-secondary" onClick={handleExportPDF}>📄 Exportar PDF</button>
          <button className="btn btn-secondary" onClick={handleExportCSV}>📥 Exportar CSV</button>
        </div>
        <div style={{padding: '8px 16px', background: 'var(--gold-glow)', borderRadius: '12px', border: '1px solid var(--gold)', fontSize: '14px', fontWeight: 700, color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '8px'}}>
          <span style={{fontSize: '18px'}}>💰</span> Total Anual: {money(resumenAnual.total)}
        </div>
      </div>

      <div className="tabs" style={{marginBottom: '20px', flexWrap: 'wrap'}}>
        {[{k: 'general', l: '📈 GENERAL'}, {k: 'mensual', l: '📊 MENSUAL'}, {k: 'top', l: '🏅 TOP'}, {k: 'metas', l: '🎯 METAS'}, {k: 'cumplimiento', l: '✅ CUMPLIMIENTO'}].map(s => (
          <button key={s.k} className={`tab ${subTab === s.k ? 'active' : ''}`} onClick={() => setSubTab(s.k as typeof subTab)}>{s.l}</button>
        ))}
      </div>

      {subTab === 'general' && (
        <>
          <div className="kpis" style={{marginBottom: '24px'}}>
            <div className="kpi" style={{'--accent': 'var(--gold)'} as any}>
              <div className="kpi-label">Total Recaudado</div>
              <div className="kpi-value">{money(resumenAnual.total)}</div>
              {resumenCompleto.variacionTotal !== null && (
                <div style={{fontSize: '12px', fontWeight: 700, marginTop: '4px', color: resumenCompleto.variacionTotal >= 0 ? 'var(--green)' : 'var(--red)'}}>
                  {resumenCompleto.variacionTotal >= 0 ? '↗' : '↘'} {Math.abs(resumenCompleto.variacionTotal).toFixed(1)}% vs {parseInt(anioResumen) - 1}
                </div>
              )}
              <div className="kpi-icon">💰</div>
            </div>
            <div className="kpi" style={{'--accent': 'var(--green)'} as any}>
              <div className="kpi-label">Diezmos</div>
              <div className="kpi-value">{money(resumenAnual.diezmos)}</div>
              {resumenCompleto.variacionDiezmos !== null && (
                <div style={{fontSize: '12px', fontWeight: 700, marginTop: '4px', color: resumenCompleto.variacionDiezmos >= 0 ? 'var(--green)' : 'var(--red)'}}>
                  {resumenCompleto.variacionDiezmos >= 0 ? '↗' : '↘'} {Math.abs(resumenCompleto.variacionDiezmos).toFixed(1)}% vs {parseInt(anioResumen) - 1}
                </div>
              )}
              <div className="kpi-icon">🙏</div>
            </div>
            <div className="kpi" style={{'--accent': 'var(--yellow)'} as any}>
              <div className="kpi-label">Ofrendas</div>
              <div className="kpi-value">{money(resumenAnual.ofrendas)}</div>
              {resumenCompleto.variacionOfrendas !== null && (
                <div style={{fontSize: '12px', fontWeight: 700, marginTop: '4px', color: resumenCompleto.variacionOfrendas >= 0 ? 'var(--green)' : 'var(--red)'}}>
                  {resumenCompleto.variacionOfrendas >= 0 ? '↗' : '↘'} {Math.abs(resumenCompleto.variacionOfrendas).toFixed(1)}% vs {parseInt(anioResumen) - 1}
                </div>
              )}
              <div className="kpi-icon">🎁</div>
            </div>
            <div className="kpi" style={{'--accent': 'var(--blue)'} as any}>
              <div className="kpi-label">Diezmadores Activos</div>
              <div className="kpi-value">{resumenCompleto.diezmadoresActivosAnio}</div>
              <div style={{fontSize: '12px', fontWeight: 600, marginTop: '4px', color: 'var(--dim)'}}>de {colaboradores.length} registrados</div>
              <div className="kpi-icon">👥</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">📈 Estadísticas Destacadas</h3>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px'}}>
              <div style={{padding: '16px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px'}}>
                <div style={{width: '44px', height: '44px', borderRadius: '12px', background: 'var(--gold-glow)', border: '1px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px'}}>🏆</div>
                <div>
                  <div style={{fontSize: '11px', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600}}>Mejor Mes</div>
                  <div style={{fontSize: '16px', fontWeight: 800, color: 'var(--gold)'}}>{resumenCompleto.mejorMes ? resumenCompleto.mejorMes.mes : '—'}</div>
                  {resumenCompleto.mejorMes && <div style={{fontSize: '12px', color: 'var(--dim)'}}>{money(resumenCompleto.mejorMes.total)}</div>}
                </div>
              </div>
              <div style={{padding: '16px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px'}}>
                <div style={{width: '44px', height: '44px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px'}}>📊</div>
                <div>
                  <div style={{fontSize: '11px', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600}}>Promedio Mensual</div>
                  <div style={{fontSize: '16px', fontWeight: 800, color: 'var(--green)'}}>{money(resumenCompleto.promedioMensual)}</div>
                  <div style={{fontSize: '12px', color: 'var(--dim)'}}>con actividad</div>
                </div>
              </div>
              <div style={{padding: '16px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px'}}>
                <div style={{width: '44px', height: '44px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px'}}>📋</div>
                <div>
                  <div style={{fontSize: '11px', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600}}>Total Aportes</div>
                  <div style={{fontSize: '16px', fontWeight: 800, color: 'var(--blue)'}}>{resumenCompleto.totalAportes}</div>
                  <div style={{fontSize: '12px', color: 'var(--dim)'}}>registros del año</div>
                </div>
              </div>
              <div style={{padding: '16px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px'}}>
                <div style={{width: '44px', height: '44px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px'}}>⛪</div>
                <div>
                  <div style={{fontSize: '11px', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600}}>Grupos Activos</div>
                  <div style={{fontSize: '16px', fontWeight: 800, color: 'var(--yellow)'}}>{resumenCompleto.gruposConOfrenda}</div>
                  <div style={{fontSize: '12px', color: 'var(--dim)'}}>con ofrenda</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {subTab === 'mensual' && (
        <>
          <div className="card" style={{marginBottom: '24px'}}>
            <div className="card-header">
              <h3 className="card-title">📊 Recaudación Mensual Visual</h3>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
              {resumenCompleto.mesesData.map((m: { mes: string; idx: number; total: number; diezmos: number; ofrendas: number; regs: number }, i: number) => {
                const isCurrent = i === new Date().getMonth() && parseInt(anioResumen) === new Date().getFullYear();
                const pctDz = m.total > 0 ? (m.diezmos / m.total) * 100 : 0;
                const pctOf = m.total > 0 ? (m.ofrendas / m.total) * 100 : 0;
                return (
                  <div key={m.mes} style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                    <div style={{width: '40px', fontSize: '12px', fontWeight: 700, color: isCurrent ? 'var(--gold)' : 'var(--dim)', textTransform: 'uppercase'}}>{m.mes}</div>
                    <div style={{flex: 1, height: '32px', background: 'var(--bg-input)', borderRadius: '8px', overflow: 'hidden', position: 'relative', border: isCurrent ? '1px solid var(--gold)' : '1px solid var(--border)'}}>
                      {m.total > 0 && (
                        <>
                          <div style={{position: 'absolute', left: 0, top: 0, width: `${pctDz}%`, height: '100%', background: 'var(--green)', display: 'flex', alignItems: 'center', paddingLeft: '8px', fontSize: '10px', fontWeight: 700, color: 'white', transition: 'width 0.5s'}}>
                            {pctDz >= 20 && `${pctDz.toFixed(0)}%`}
                          </div>
                          <div style={{position: 'absolute', left: `${pctDz}%`, top: 0, width: `${pctOf}%`, height: '100%', background: 'var(--yellow)', display: 'flex', alignItems: 'center', paddingLeft: '8px', fontSize: '10px', fontWeight: 700, color: '#1a1a1a', transition: 'width 0.5s'}}>
                            {pctOf >= 20 && `${pctOf.toFixed(0)}%`}
                          </div>
                        </>
                      )}
                    </div>
                    <div style={{width: '90px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: m.total > 0 ? 'var(--gold)' : 'var(--dim)'}}>{money(m.total)}</div>
                  </div>
                );
              })}
            </div>
            <div style={{display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)', fontSize: '12px'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}><div style={{width: '12px', height: '12px', borderRadius: '3px', background: 'var(--green)'}}></div><span style={{color: 'var(--dim)'}}>Diezmos</span></div>
              <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}><div style={{width: '12px', height: '12px', borderRadius: '3px', background: 'var(--yellow)'}}></div><span style={{color: 'var(--dim)'}}>Ofrendas</span></div>
              <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}><div style={{width: '12px', height: '12px', borderRadius: '3px', border: '1px solid var(--gold)'}}></div><span style={{color: 'var(--dim)'}}>Mes actual</span></div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">📅 Detalle Mensual de Recaudación</h3>
            </div>
            <table className="data-table">
              <thead>
                <tr style={{background: 'var(--bg-input)'}}>
                  <th style={{textAlign: 'left'}}>MES</th>
                  <th style={{textAlign: 'right'}}>DIEZMOS</th>
                  <th style={{textAlign: 'right'}}>OFRENDAS</th>
                  <th style={{textAlign: 'right', color: 'var(--gold)'}}>TOTAL</th>
                  <th style={{textAlign: 'center'}}>%</th>
                </tr>
              </thead>
              <tbody>
                {resumenCompleto.mesesData.map((m: { mes: string; idx: number; total: number; diezmos: number; ofrendas: number; regs: number }, i: number) => {
                  const isCurrent = i === new Date().getMonth() && parseInt(anioResumen) === new Date().getFullYear();
                  const pctAnual = resumenAnual.total > 0 ? (m.total / resumenAnual.total) * 100 : 0;
                  return (
                    <tr key={m.mes} style={{background: isCurrent ? 'var(--gold-glow)' : (m.total > 0 ? 'var(--bg-input)' : 'transparent'), transition: 'background 0.2s', borderLeft: isCurrent ? '3px solid var(--gold)' : 'none'}}>
                      <td style={{fontWeight: 600}}>{m.mes} {isCurrent && '⭐'}</td>
                      <td style={{textAlign: 'right', color: m.diezmos > 0 ? 'var(--green)' : 'var(--dim)'}}>{money(m.diezmos)}</td>
                      <td style={{textAlign: 'right', color: m.ofrendas > 0 ? 'var(--yellow)' : 'var(--dim)'}}>{money(m.ofrendas)}</td>
                      <td style={{textAlign: 'right', fontWeight: 700, color: m.total > 0 ? 'var(--gold)' : 'var(--dim)'}}>{money(m.total)}</td>
                      <td style={{textAlign: 'center', color: 'var(--dim)', fontSize: '12px'}}>{pctAnual > 0 ? `${pctAnual.toFixed(1)}%` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{background: 'var(--bg-input)', fontWeight: 800, fontSize: '15px'}}>
                  <td>TOTAL ANUAL</td>
                  <td style={{textAlign: 'right', color: 'var(--green)'}}>{money(resumenAnual.diezmos)}</td>
                  <td style={{textAlign: 'right', color: 'var(--yellow)'}}>{money(resumenAnual.ofrendas)}</td>
                  <td style={{textAlign: 'right', color: 'var(--gold)'}}>{money(resumenAnual.total)}</td>
                  <td style={{textAlign: 'center', color: 'var(--gold)'}}>100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {subTab === 'top' && (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px'}}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">🏅 Top 5 Diezmadores del Año</h3>
            </div>
            {resumenCompleto.topDiezmadores.length > 0 ? (
              <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                {resumenCompleto.topDiezmadores.map((d, i) => {
                  const medals = ['🥇', '🥈', '🥉'];
                  const color = ['var(--gold)', 'var(--blue)', 'var(--purple)'];
                  const pct = resumenCompleto.topDiezmadores[0].total > 0 ? (d.total / resumenCompleto.topDiezmadores[0].total) * 100 : 0;
                  return (
                    <div key={d.id} style={{display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border)'}}>
                      <div style={{width: '36px', height: '36px', borderRadius: '50%', background: i < 3 ? 'var(--gold-glow)' : 'var(--bg)', border: `2px solid ${i < 3 ? color[i] : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: i < 3 ? color[i] : 'var(--dim)'}}>
                        {i < 3 ? medals[i] : (i + 1)}
                      </div>
                      <div style={{flex: 1, minWidth: 0}}>
                        <div style={{fontWeight: 700, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{d.nombre} {d.apellido}</div>
                        <div style={{fontSize: '11px', color: 'var(--dim)'}}>{d.zona || 'Sin zona'} • {d.regs} aportes</div>
                        <div style={{height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden', marginTop: '4px'}}>
                          <div style={{height: '100%', width: `${pct}%`, background: i === 0 ? 'var(--gold)' : i === 1 ? 'var(--blue)' : 'var(--purple)', transition: 'width 0.5s'}}></div>
                        </div>
                      </div>
                      <div style={{fontWeight: 800, color: 'var(--gold)', fontSize: '14px', whiteSpace: 'nowrap'}}>{money(d.total)}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{textAlign: 'center', padding: '30px', color: 'var(--dim)'}}>No hay aportes este año</div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">⛪ Top 5 Grupos con Ofrendas</h3>
            </div>
            {resumenCompleto.topGrupos.length > 0 ? (
              <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                {resumenCompleto.topGrupos.map((g, i) => {
                  const medals = ['🥇', '🥈', '🥉'];
                  const color = ['var(--gold)', 'var(--blue)', 'var(--purple)'];
                  const pct = resumenCompleto.topGrupos[0].total > 0 ? (g.total / resumenCompleto.topGrupos[0].total) * 100 : 0;
                  return (
                    <div key={g.id} style={{display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border)'}}>
                      <div style={{width: '36px', height: '36px', borderRadius: '50%', background: i < 3 ? 'var(--gold-glow)' : 'var(--bg)', border: `2px solid ${i < 3 ? color[i] : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: i < 3 ? color[i] : 'var(--dim)'}}>
                        {i < 3 ? medals[i] : (i + 1)}
                      </div>
                      <div style={{flex: 1, minWidth: 0}}>
                        <div style={{fontWeight: 700, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{g.nombre}</div>
                        <div style={{fontSize: '11px', color: 'var(--dim)'}}>{g.zona || 'Sin zona'} • {g.regs} ofrendas</div>
                        <div style={{height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden', marginTop: '4px'}}>
                          <div style={{height: '100%', width: `${pct}%`, background: i === 0 ? 'var(--gold)' : i === 1 ? 'var(--blue)' : 'var(--purple)', transition: 'width 0.5s'}}></div>
                        </div>
                      </div>
                      <div style={{fontWeight: 800, color: 'var(--gold)', fontSize: '14px', whiteSpace: 'nowrap'}}>{money(g.total)}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{textAlign: 'center', padding: '30px', color: 'var(--dim)'}}>No hay ofrendas de grupos este año</div>
            )}
          </div>
        </div>
      )}

      {subTab === 'metas' && (
        <>
          <div className="card" style={{marginBottom: '24px'}}>
            <div className="card-header">
              <h3 className="card-title">🎯 Resumen del Plan Propuesto</h3>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px'}}>
              <div style={{padding: '16px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center'}}>
                <div style={{fontSize: '12px', color: 'var(--dim)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600}}>Meta Mensual Global</div>
                <div style={{fontSize: '20px', fontWeight: 800, color: 'var(--blue)'}}>{money(cumplimiento.metaGlobalMes)}</div>
                <div style={{fontSize: '11px', color: 'var(--dim)', marginTop: '4px'}}>{colaboradores.filter(c => c.planDiezmo > 0).length} diezmadores + {grupos.filter(g => (g.planOfrendasMensual || 0) > 0).length} grupos</div>
              </div>
              <div style={{padding: '16px', background: 'var(--gold-glow)', borderRadius: '12px', border: '1px solid var(--gold)', textAlign: 'center'}}>
                <div style={{fontSize: '12px', color: 'var(--gold)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 700}}>Meta Anual Global</div>
                <div style={{fontSize: '20px', fontWeight: 800, color: 'var(--gold)'}}>{money(cumplimiento.metaGlobalAnual)}</div>
                <div style={{fontSize: '11px', color: 'var(--gold)', marginTop: '4px'}}>Plan total del año</div>
              </div>
              <div style={{padding: '16px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center'}}>
                <div style={{fontSize: '12px', color: 'var(--dim)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600}}>Recaudado a la Fecha</div>
                <div style={{fontSize: '20px', fontWeight: 800, color: 'var(--green)'}}>{money(cumplimiento.totalRecAnio)}</div>
                <div style={{fontSize: '11px', color: 'var(--dim)', marginTop: '4px'}}>de {cumplimiento.metaGlobalAnual > 0 ? money(cumplimiento.metaGlobalAnual) : 'sin meta'}</div>
              </div>
              <div style={{padding: '16px', background: cumplimiento.pctGlobal >= 100 ? 'var(--gold-glow)' : 'var(--bg-input)', borderRadius: '12px', border: `1px solid ${cumplimiento.pctGlobal >= 100 ? 'var(--gold)' : 'var(--border)'}`, textAlign: 'center'}}>
                <div style={{fontSize: '12px', color: 'var(--dim)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600}}>% Cumplimiento</div>
                <div style={{fontSize: '20px', fontWeight: 800, color: cumplimiento.pctGlobal >= 100 ? 'var(--gold)' : cumplimiento.pctGlobal >= 70 ? 'var(--green)' : 'var(--red)'}}>{cumplimiento.metaGlobalAnual > 0 ? `${cumplimiento.pctGlobal.toFixed(1)}%` : '—'}</div>
                <div style={{fontSize: '11px', color: 'var(--dim)', marginTop: '4px'}}>vs meta anual</div>
              </div>
            </div>
          </div>

          <div className="card" style={{marginBottom: '24px'}}>
            <div className="card-header">
              <h3 className="card-title">👥 Plan de Diezmos por Diezmador</h3>
            </div>
            <table className="data-table">
              <thead>
                <tr style={{background: 'var(--bg-input)'}}>
                  <th style={{textAlign: 'left'}}>DADOR</th>
                  <th style={{textAlign: 'left'}}>ZONA</th>
                  <th style={{textAlign: 'right'}}>PLAN DIEZMO</th>
                  <th style={{textAlign: 'right'}}>META ANUAL</th>
                  <th style={{textAlign: 'right'}}>RECAUDADO</th>
                  <th style={{textAlign: 'center'}}>%</th>
                </tr>
              </thead>
              <tbody>
                {cumplimiento.cumplimientoDiezmadores.map(d => {
                  const semaforo = d.pct === null ? 'none' : d.pct >= 100 ? 'green' : d.pct >= 70 ? 'yellow' : 'red';
                  const colorSem = semaforo === 'green' ? 'var(--green)' : semaforo === 'yellow' ? 'var(--yellow)' : semaforo === 'red' ? 'var(--red)' : 'var(--dim)';
                  return (
                    <tr key={d.id}>
                      <td style={{fontWeight: 600}}>{d.nombre} {d.apellido}</td>
                      <td style={{color: 'var(--dim)'}}>{d.zona}</td>
                      <td style={{textAlign: 'right'}}>{d.planDiezmo > 0 ? money(d.planDiezmo) : '—'}</td>
                      <td style={{textAlign: 'right'}}>{d.planDiezmo > 0 ? money(d.metaAnual) : '—'}</td>
                      <td style={{textAlign: 'right', fontWeight: 700, color: 'var(--gold)'}}>{money(d.total)}</td>
                      <td style={{textAlign: 'center'}}>
                        {d.pct !== null ? (
                          <span style={{padding: '4px 10px', borderRadius: '12px', background: `${colorSem}22`, color: colorSem, fontWeight: 700, fontSize: '12px', border: `1px solid ${colorSem}`}}>{d.pct.toFixed(0)}%</span>
                        ) : <span style={{color: 'var(--dim)'}}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{background: 'var(--bg-input)', fontWeight: 800}}>
                  <td colSpan={2}>TOTAL DADORES</td>
                  <td style={{textAlign: 'right'}}>{money(cumplimiento.cumplimientoDiezmadores.reduce((s, d) => s + d.planDiezmo, 0))}</td>
                  <td style={{textAlign: 'right'}}>{money(cumplimiento.cumplimientoDiezmadores.reduce((s, d) => s + d.metaAnual, 0))}</td>
                  <td style={{textAlign: 'right', color: 'var(--gold)'}}>{money(cumplimiento.cumplimientoDiezmadores.reduce((s, d) => s + d.total, 0))}</td>
                  <td style={{textAlign: 'center'}}>—</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="card">
            <div className="card-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h3 className="card-title">⛪ Plan de Ofrendas por Grupo</h3>
              <div style={{fontSize: '12px', color: 'var(--dim)'}}>Edita la meta mensual haciendo clic en el valor</div>
            </div>
            <table className="data-table">
              <thead>
                <tr style={{background: 'var(--bg-input)'}}>
                  <th style={{textAlign: 'left'}}>GRUPO</th>
                  <th style={{textAlign: 'left'}}>ZONA</th>
                  <th style={{textAlign: 'right'}}>META MENSUAL</th>
                  <th style={{textAlign: 'right'}}>META ANUAL</th>
                  <th style={{textAlign: 'right'}}>RECAUDADO</th>
                  <th style={{textAlign: 'center'}}>%</th>
                </tr>
              </thead>
              <tbody>
                {cumplimiento.cumplimientoGrupos.map(g => {
                  const semaforo = g.pct === null ? 'none' : g.pct >= 100 ? 'green' : g.pct >= 70 ? 'yellow' : 'red';
                  const colorSem = semaforo === 'green' ? 'var(--green)' : semaforo === 'yellow' ? 'var(--yellow)' : semaforo === 'red' ? 'var(--red)' : 'var(--dim)';
                  return (
                    <tr key={g.id}>
                      <td style={{fontWeight: 600}}>{g.nombre}</td>
                      <td style={{color: 'var(--dim)'}}>{g.zona}</td>
                      <td style={{textAlign: 'right'}}>
                        <input type="number" min="0" step="0.01" defaultValue={g.planOfrendasMensual} onBlur={async (e) => {
                          const v = parseFloat(e.target.value) || 0;
                          if (v !== g.planOfrendasMensual) {
                            await db.grupos.update(g.id, { planOfrendasMensual: v });
                            showToast(`Meta de ${g.nombre} actualizada`);
                          }
                        }} style={{width: '90px', textAlign: 'right', padding: '4px 8px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--gold)', fontWeight: 600, fontSize: '13px'}} />
                      </td>
                      <td style={{textAlign: 'right'}}>{g.planOfrendasMensual > 0 ? money(g.metaAnual) : '—'}</td>
                      <td style={{textAlign: 'right', fontWeight: 700, color: 'var(--gold)'}}>{money(g.total)}</td>
                      <td style={{textAlign: 'center'}}>
                        {g.pct !== null ? (
                          <span style={{padding: '4px 10px', borderRadius: '12px', background: `${colorSem}22`, color: colorSem, fontWeight: 700, fontSize: '12px', border: `1px solid ${colorSem}`}}>{g.pct.toFixed(0)}%</span>
                        ) : <span style={{color: 'var(--dim)'}}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{background: 'var(--bg-input)', fontWeight: 800}}>
                  <td colSpan={2}>TOTAL GRUPOS</td>
                  <td style={{textAlign: 'right'}}>{money(cumplimiento.cumplimientoGrupos.reduce((s, g) => s + g.planOfrendasMensual, 0))}</td>
                  <td style={{textAlign: 'right'}}>{money(cumplimiento.cumplimientoGrupos.reduce((s, g) => s + g.metaAnual, 0))}</td>
                  <td style={{textAlign: 'right', color: 'var(--gold)'}}>{money(cumplimiento.cumplimientoGrupos.reduce((s, g) => s + g.total, 0))}</td>
                  <td style={{textAlign: 'center'}}>—</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {subTab === 'cumplimiento' && (
        <>
          <div className="kpis" style={{marginBottom: '24px'}}>
            <div className="kpi" style={{'--accent': 'var(--gold)'} as any}>
              <div className="kpi-label">Meta Anual</div>
              <div className="kpi-value">{money(cumplimiento.metaGlobalAnual)}</div>
              <div className="kpi-icon">🎯</div>
            </div>
            <div className="kpi" style={{'--accent': 'var(--green)'} as any}>
              <div className="kpi-label">Recaudado</div>
              <div className="kpi-value">{money(cumplimiento.totalRecAnio)}</div>
              <div className="kpi-icon">💰</div>
            </div>
            <div className="kpi" style={{'--accent': cumplimiento.pctGlobal >= 100 ? 'var(--gold)' : cumplimiento.pctGlobal >= 70 ? 'var(--green)' : 'var(--red)'} as any}>
              <div className="kpi-label">% Cumplimiento</div>
              <div className="kpi-value">{cumplimiento.metaGlobalAnual > 0 ? `${cumplimiento.pctGlobal.toFixed(1)}%` : '—'}</div>
              <div style={{fontSize: '11px', fontWeight: 600, marginTop: '4px'}}>
                {cumplimiento.pctGlobal >= 100 ? '🎉 ¡Meta alcanzada!' : cumplimiento.pctGlobal >= 70 ? '👍 En camino' : '⚠️ Por debajo'}
              </div>
              <div className="kpi-icon">{cumplimiento.pctGlobal >= 100 ? '🏆' : cumplimiento.pctGlobal >= 70 ? '📈' : '⚠️'}</div>
            </div>
            <div className="kpi" style={{'--accent': 'var(--blue)'} as any}>
              <div className="kpi-label">{cumplimiento.totalRecAnio >= cumplimiento.metaGlobalAnual ? 'Superávit' : 'Faltante'}</div>
              <div className="kpi-value">{money(Math.abs(cumplimiento.metaGlobalAnual - cumplimiento.totalRecAnio))}</div>
              <div className="kpi-icon">{cumplimiento.totalRecAnio >= cumplimiento.metaGlobalAnual ? '✨' : '⏳'}</div>
            </div>
          </div>

          <div className="card" style={{marginBottom: '24px'}}>
            <div className="card-header">
              <h3 className="card-title">📊 Progreso General del Año</h3>
            </div>
            <div style={{padding: '8px 0'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px'}}>
                <span style={{color: 'var(--dim)'}}>{money(cumplimiento.totalRecAnio)} de {money(cumplimiento.metaGlobalAnual)}</span>
                <span style={{fontWeight: 700, color: cumplimiento.pctGlobal >= 100 ? 'var(--gold)' : cumplimiento.pctGlobal >= 70 ? 'var(--green)' : 'var(--red)'}}>{cumplimiento.metaGlobalAnual > 0 ? `${cumplimiento.pctGlobal.toFixed(1)}%` : '—'}</span>
              </div>
              <div style={{height: '24px', background: 'var(--bg-input)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', position: 'relative'}}>
                <div style={{height: '100%', width: `${Math.min(cumplimiento.pctGlobal, 100)}%`, background: `linear-gradient(90deg, var(--green), var(--gold))`, transition: 'width 0.6s', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', fontSize: '11px', fontWeight: 700, color: 'white'}}></div>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: 'var(--dim)'}}>
                <span>📍 Mes actual: {money(cumplimiento.totalRecMesActual)} / esperado {money(cumplimiento.metaGlobalMes)}</span>
                <span>📈 Acumulado esperado: {money(cumplimiento.metaAcumuladaEsperada)}</span>
              </div>
            </div>
          </div>

          <div className="card" style={{marginBottom: '24px'}}>
            <div className="card-header">
              <h3 className="card-title">📅 Cumplimiento Mensual</h3>
            </div>
            <table className="data-table">
              <thead>
                <tr style={{background: 'var(--bg-input)'}}>
                  <th style={{textAlign: 'left'}}>MES</th>
                  <th style={{textAlign: 'right'}}>META DEL MES</th>
                  <th style={{textAlign: 'right'}}>REAL</th>
                  <th style={{textAlign: 'center'}}>% MES</th>
                  <th style={{textAlign: 'right'}}>META ACUM.</th>
                  <th style={{textAlign: 'right'}}>REAL ACUM.</th>
                  <th style={{textAlign: 'center'}}>% ACUM.</th>
                </tr>
              </thead>
              <tbody>
                {cumplimiento.mensuales.map((m, i) => {
                  const semaforoM = m.pct === null ? 'none' : m.pct >= 100 ? 'green' : m.pct >= 70 ? 'yellow' : 'red';
                  const semaforoA = m.pctAcumulado === null ? 'none' : m.pctAcumulado >= 100 ? 'green' : m.pctAcumulado >= 70 ? 'yellow' : 'red';
                  const colorM = semaforoM === 'green' ? 'var(--green)' : semaforoM === 'yellow' ? 'var(--yellow)' : semaforoM === 'red' ? 'var(--red)' : 'var(--dim)';
                  const colorA = semaforoA === 'green' ? 'var(--green)' : semaforoA === 'yellow' ? 'var(--yellow)' : semaforoA === 'red' ? 'var(--red)' : 'var(--dim)';
                  const isCurrent = i === new Date().getMonth();
                  return (
                    <tr key={m.etiqueta} style={{background: isCurrent ? 'var(--gold-glow)' : (m.total > 0 ? 'var(--bg-input)' : 'transparent'), borderLeft: isCurrent ? '3px solid var(--gold)' : 'none'}}>
                      <td style={{fontWeight: 600}}>{m.etiqueta} {isCurrent && '⭐'}</td>
                      <td style={{textAlign: 'right', color: 'var(--dim)'}}>{cumplimiento.metaGlobalMes > 0 ? money(m.metaEsperada) : '—'}</td>
                      <td style={{textAlign: 'right', fontWeight: 700, color: m.total > 0 ? 'var(--gold)' : 'var(--dim)'}}>{money(m.total)}</td>
                      <td style={{textAlign: 'center'}}>
                        {m.pct !== null ? (
                          <div style={{display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center'}}>
                            <div style={{width: '40px', height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden'}}>
                              <div style={{height: '100%', width: `${Math.min(m.pct, 100)}%`, background: colorM}}></div>
                            </div>
                            <span style={{color: colorM, fontWeight: 700, fontSize: '12px'}}>{m.pct.toFixed(0)}%</span>
                          </div>
                        ) : <span style={{color: 'var(--dim)'}}>—</span>}
                      </td>
                      <td style={{textAlign: 'right', color: 'var(--dim)'}}>{cumplimiento.metaGlobalMes > 0 ? money(m.metaAcumulada) : '—'}</td>
                      <td style={{textAlign: 'right', fontWeight: 700, color: 'var(--gold)'}}>{money(m.acumulado)}</td>
                      <td style={{textAlign: 'center'}}>
                        {m.pctAcumulado !== null ? (
                          <span style={{padding: '3px 8px', borderRadius: '10px', background: `${colorA}22`, color: colorA, fontWeight: 700, fontSize: '12px', border: `1px solid ${colorA}`}}>{m.pctAcumulado.toFixed(0)}%</span>
                        ) : <span style={{color: 'var(--dim)'}}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px'}}>
            <div className="card">
              <div className="card-header"><h3 className="card-title">📆 Por Trimestre</h3></div>
              <table className="data-table">
                <thead><tr style={{background: 'var(--bg-input)'}}><th style={{textAlign: 'left'}}>PERÍODO</th><th style={{textAlign: 'right'}}>META</th><th style={{textAlign: 'right'}}>REAL</th><th style={{textAlign: 'center'}}>%</th></tr></thead>
                <tbody>
                  {cumplimiento.trimestres.map(t => {
                    const semaforo = t.pct === null ? 'none' : t.pct >= 100 ? 'green' : t.pct >= 70 ? 'yellow' : 'red';
                    const color = semaforo === 'green' ? 'var(--green)' : semaforo === 'yellow' ? 'var(--yellow)' : semaforo === 'red' ? 'var(--red)' : 'var(--dim)';
                    return (
                      <tr key={t.etiqueta}>
                        <td style={{fontWeight: 600}}>{t.etiqueta}</td>
                        <td style={{textAlign: 'right', color: 'var(--dim)'}}>{cumplimiento.metaGlobalAnual > 0 ? money(t.metaEsperada) : '—'}</td>
                        <td style={{textAlign: 'right', fontWeight: 700, color: 'var(--gold)'}}>{money(t.total)}</td>
                        <td style={{textAlign: 'center'}}>{t.pct !== null ? <span style={{padding: '3px 10px', borderRadius: '10px', background: `${color}22`, color, fontWeight: 700, fontSize: '12px', border: `1px solid ${color}`}}>{t.pct.toFixed(0)}%</span> : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="card">
              <div className="card-header"><h3 className="card-title">🗓️ Por Semestre</h3></div>
              <table className="data-table">
                <thead><tr style={{background: 'var(--bg-input)'}}><th style={{textAlign: 'left'}}>PERÍODO</th><th style={{textAlign: 'right'}}>META</th><th style={{textAlign: 'right'}}>REAL</th><th style={{textAlign: 'center'}}>%</th></tr></thead>
                <tbody>
                  {cumplimiento.semestres.map(s => {
                    const semaforo = s.pct === null ? 'none' : s.pct >= 100 ? 'green' : s.pct >= 70 ? 'yellow' : 'red';
                    const color = semaforo === 'green' ? 'var(--green)' : semaforo === 'yellow' ? 'var(--yellow)' : semaforo === 'red' ? 'var(--red)' : 'var(--dim)';
                    return (
                      <tr key={s.etiqueta}>
                        <td style={{fontWeight: 600}}>{s.etiqueta}</td>
                        <td style={{textAlign: 'right', color: 'var(--dim)'}}>{cumplimiento.metaGlobalAnual > 0 ? money(s.metaEsperada) : '—'}</td>
                        <td style={{textAlign: 'right', fontWeight: 700, color: 'var(--gold)'}}>{money(s.total)}</td>
                        <td style={{textAlign: 'center'}}>{s.pct !== null ? <span style={{padding: '3px 10px', borderRadius: '10px', background: `${color}22`, color, fontWeight: 700, fontSize: '12px', border: `1px solid ${color}`}}>{s.pct.toFixed(0)}%</span> : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{background: 'var(--bg-input)', fontWeight: 800}}>
                    <td>AÑO COMPLETO</td>
                    <td style={{textAlign: 'right'}}>{cumplimiento.metaGlobalAnual > 0 ? money(cumplimiento.anual.metaEsperada) : '—'}</td>
                    <td style={{textAlign: 'right', color: 'var(--gold)'}}>{money(cumplimiento.anual.total)}</td>
                    <td style={{textAlign: 'center', color: 'var(--gold)'}}>{cumplimiento.anual.pct !== null ? `${cumplimiento.anual.pct.toFixed(1)}%` : '—'}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px'}}>
            <div className="card">
              <div className="card-header"><h3 className="card-title">👥 Cumplimiento por Diezmador</h3></div>
              {cumplimiento.cumplimientoDiezmadores.length > 0 ? (
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto'}}>
                  {cumplimiento.cumplimientoDiezmadores.map(d => {
                    const semaforo = d.pct === null ? 'none' : d.pct >= 100 ? 'green' : d.pct >= 70 ? 'yellow' : 'red';
                    const color = semaforo === 'green' ? 'var(--green)' : semaforo === 'yellow' ? 'var(--yellow)' : semaforo === 'red' ? 'var(--red)' : 'var(--dim)';
                    return (
                      <div key={d.id} style={{padding: '8px 12px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border)'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px'}}>
                          <span style={{fontWeight: 600, fontSize: '13px'}}>{d.nombre} {d.apellido}</span>
                          <span style={{color, fontWeight: 700, fontSize: '13px'}}>{d.pct !== null ? `${d.pct.toFixed(0)}%` : '—'}</span>
                        </div>
                        <div style={{height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden'}}>
                          <div style={{height: '100%', width: `${Math.min(d.pct || 0, 100)}%`, background: color, transition: 'width 0.5s'}}></div>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', color: 'var(--dim)'}}>
                          <span>{money(d.total)} / {d.planDiezmo > 0 ? money(d.metaAnual) : 'sin meta'}</span>
                          <span>{d.zona}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <div style={{textAlign: 'center', padding: '30px', color: 'var(--dim)'}}>Sin diezmadores</div>}
            </div>
            <div className="card">
              <div className="card-header"><h3 className="card-title">⛪ Cumplimiento por Grupo</h3></div>
              {cumplimiento.cumplimientoGrupos.length > 0 ? (
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto'}}>
                  {cumplimiento.cumplimientoGrupos.map(g => {
                    const semaforo = g.pct === null ? 'none' : g.pct >= 100 ? 'green' : g.pct >= 70 ? 'yellow' : 'red';
                    const color = semaforo === 'green' ? 'var(--green)' : semaforo === 'yellow' ? 'var(--yellow)' : semaforo === 'red' ? 'var(--red)' : 'var(--dim)';
                    return (
                      <div key={g.id} style={{padding: '8px 12px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border)'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px'}}>
                          <span style={{fontWeight: 600, fontSize: '13px'}}>{g.nombre}</span>
                          <span style={{color, fontWeight: 700, fontSize: '13px'}}>{g.pct !== null ? `${g.pct.toFixed(0)}%` : '—'}</span>
                        </div>
                        <div style={{height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden'}}>
                          <div style={{height: '100%', width: `${Math.min(g.pct || 0, 100)}%`, background: color, transition: 'width 0.5s'}}></div>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', color: 'var(--dim)'}}>
                          <span>{money(g.total)} / {g.planOfrendasMensual > 0 ? money(g.metaAnual) : 'sin meta'}</span>
                          <span>{g.zona}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <div style={{textAlign: 'center', padding: '30px', color: 'var(--dim)'}}>Sin grupos</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
