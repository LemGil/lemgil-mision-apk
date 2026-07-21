import { useMemo } from 'react';
import { exportCSV } from '../../lib/csvExport';
import { exportGruposPDF } from '../../lib/pdfExport';
import { money, MS_SHORT, monthKey } from '../../lib/utils';
import { CsvImportButton } from '../CsvImportButton';
import { showToast } from '../../lib/notification';
import type { Grupo, AporteComun } from '../../lib/types';

type ModalType = 'dador' | 'aporte' | 'delD' | 'delA' | 'verD' | 'verG' | 'tipoPlan' | 'delTipoPlan' | 'planDiezmador' | 'delPlanDiezmador';

interface OfrendasGruposTabProps {
  aportes: AporteComun[];
  grupos: Grupo[];
  searchG: string;
  setSearchG: (v: string) => void;
  filterGZona: string;
  setFilterGZona: (v: string) => void;
  filterGEstado: string;
  setFilterGEstado: (v: string) => void;
  setViewGrupo: (g: Grupo) => void;
  setModal: (m: ModalType | null) => void;
  resetA: () => void;
  setATipo: (t: 'Diezmo' | 'Ofrenda') => void;
}

export function OfrendasGruposTab({
  aportes, grupos,
  searchG, setSearchG, filterGZona, setFilterGZona, filterGEstado, setFilterGEstado,
  setViewGrupo, setModal, resetA, setATipo,
}: OfrendasGruposTabProps) {
  const ofrendasGruposFiltradas = useMemo(() => aportes.filter(a => a.tipo === 'Ofrenda' && a.grupoId), [aportes]);
  const totalOfrendasGrupos = useMemo(() => ofrendasGruposFiltradas.reduce((s, a) => s + (a.monto || 0), 0), [ofrendasGruposFiltradas]);

  const gruposVisibles = grupos.filter(g => {
    if (searchG && !g.nombre.toLowerCase().includes(searchG.toLowerCase())) return false;
    if (filterGZona && g.zona !== filterGZona) return false;
    if (filterGEstado) {
      const regs = ofrendasGruposFiltradas.filter(a => a.grupoId === g.id);
      const mesK = new Date().toISOString().slice(0, 7);
      const alDia = regs.some(a => monthKey(a.fecha) === mesK);
      if (filterGEstado === 'aldia' && !alDia) return false;
      if (filterGEstado === 'pendiente' && alDia) return false;
    }
    return true;
  });

  return (
    <div className="page-content">
      <div className="actions-row between">
        <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
          <button className="btn btn-gold" onClick={() => { resetA(); setATipo('Ofrenda'); setModal('aporte'); }}>➕ Registrar Ofrenda Grupo</button>
          <button className="btn btn-secondary" onClick={() => exportGruposPDF({ grupos, aportes, anio: new Date().getFullYear().toString() })}>📄 Exportar PDF</button>
          <button className="btn btn-secondary" onClick={() => {
            if (!grupos.length) return showToast('No hay grupos para exportar');
            const mesK = new Date().toISOString().slice(0, 7);
            const h = ['#', 'Grupo', 'Zona', 'Líder', 'Plan Mensual', 'Total Ofrendas', 'Este Mes'];
            const r = grupos.map((g, i) => {
              const regs = ofrendasGruposFiltradas.filter(a => a.grupoId === g.id);
              const total = regs.reduce((s, a) => s + (a.monto || 0), 0);
              const mes = regs.filter(a => a.fecha?.startsWith(mesK)).reduce((s, a) => s + (a.monto || 0), 0);
              return [i + 1, g.nombre, g.zona || '', g.lider || '', g.planOfrendasMensual || 0, total, mes];
            });
            exportCSV(h, r, 'lemgil-grupos-ofrendas.csv');
            showToast('CSV exportado');
          }}>📥 Exportar CSV</button>
          <CsvImportButton
            table="aportesComun"
            fieldMapping={{ 'Fecha': 'fecha', 'Grupo': 'grupoId', 'Tipo': 'tipo', 'Monto': 'monto', 'Método': 'metodo', 'Mes': 'mesCorrespondiente', 'Referencia': 'referencia', 'Notas': 'notas' }}
            requiredFields={['fecha', 'monto']}
            defaults={{ fecha: () => new Date().toISOString().split('T')[0], tipo: 'Ofrenda', metodo: 'Efectivo' }}
            onImport={(n) => showToast(`${n} ofrenda(s) importada(s)`)}
          />
        </div>
        <div style={{padding: '8px 16px', background: 'var(--gold-glow)', borderRadius: '8px', border: '1px solid var(--gold)', fontSize: '14px', fontWeight: 700, color: 'var(--gold)'}}>
          💰 Total: {money(totalOfrendasGrupos)}
        </div>
      </div>
      <div className="search-bar">
        <input className="search-input" placeholder="🔍 Buscar grupo..." value={searchG} onChange={e => setSearchG(e.target.value)} />
        <select className="filter-select" value={filterGZona} onChange={e => setFilterGZona(e.target.value)}><option value="">Todas las zonas</option>{[...new Set(grupos.map(g => g.zona).filter(Boolean))].sort().map(z => <option key={z} value={z}>{z}</option>)}</select>
        <select className="filter-select" value={filterGEstado} onChange={e => setFilterGEstado(e.target.value)}><option value="">Todos</option><option value="aldia">✅ Al día</option><option value="pendiente">⏳ Pendientes</option></select>
      </div>
      <div className="dz-grid">
        {gruposVisibles.map(g => {
          const regs = ofrendasGruposFiltradas.filter(a => a.grupoId === g.id);
          const total = regs.reduce((s, a) => s + (a.monto || 0), 0);
          const regsCount = regs.length;
          const ultima = regs.length > 0 ? [...regs].sort((a, b) => b.fecha.localeCompare(a.fecha))[0].fecha : null;
          const mesK = new Date().toISOString().slice(0, 7);
          const alDia = regs.some(a => monthKey(a.fecha) === mesK);
          const iniciales = g.nombre.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
          return (
            <div key={g.id} className="card" onClick={() => { setViewGrupo(g); setModal('verG'); }} style={{cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--bg)', padding: '16px', borderRadius: '16px', position: 'relative', overflow: 'hidden'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px'}}>
                <div style={{width: '50px', height: '50px', borderRadius: '50%', background: 'var(--gold-glow)', border: '2px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--gold)', fontSize: '16px'}}>{iniciales}</div>
                <div style={{flex: 1}}>
                  <div style={{fontWeight: 800, fontSize: '18px', lineHeight: '1.2'}}>{g.nombre}</div>
                  <div style={{color: 'var(--dim)', fontSize: '13px'}}>Grupo de Misión</div>
                </div>
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '8px', color: 'var(--dim)', flexWrap: 'wrap'}}>
                <span>💰 Total: <span style={{color: 'var(--gold)', fontWeight: 700}}>{money(total)}</span></span>
                <span style={{opacity: 0.5}}>•</span>
                <span>📋 {regsCount} ofrendas</span>
                <span style={{opacity: 0.5}}>•</span>
                <span>📅 Última: <span style={{color: 'var(--dim)'}}>{ultima || '—'}</span></span>
              </div>
              {(() => {
                const metaMes = g.planOfrendasMensual || 0;
                const metaAnual = metaMes * 12;
                if (metaAnual <= 0) return null;
                const pctCump = Math.min((total / metaAnual) * 100, 100);
                const semaforo = pctCump >= 100 ? 'var(--gold)' : pctCump >= 70 ? 'var(--green)' : 'var(--red)';
                return (
                  <div style={{marginBottom: '14px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--dim)', marginBottom: '3px'}}>
                      <span>🎯 Meta anual: {money(metaAnual)} ({money(metaMes)}/mes)</span>
                      <span style={{color: semaforo, fontWeight: 700}}>{pctCump.toFixed(0)}%</span>
                    </div>
                    <div style={{height: '5px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden'}}>
                      <div style={{height: '100%', width: `${pctCump}%`, background: semaforo, transition: 'width 0.5s'}}></div>
                    </div>
                  </div>
                );
              })()}
              <div className="grid-meses" style={{display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px', marginBottom: '16px'}}>
                {MS_SHORT.map((m, i) => {
                  const mk = `${new Date().getFullYear()}-${String(i+1).padStart(2, '0')}`;
                  const hasAporte = regs.some(a => monthKey(a.fecha) === mk);
                  const isCurrent = new Date().getMonth() === i;
                  return <div key={m} style={{fontSize: '10px', textAlign: 'center', background: hasAporte ? 'var(--green)' : 'var(--border)', color: hasAporte ? 'white' : 'var(--dim)', borderRadius: '4px', padding: '4px 0', border: isCurrent ? '1px solid var(--gold)' : 'none', fontWeight: isCurrent ? 700 : 400}}>{m}</div>;
                })}
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'var(--dim)'}}>
                <div style={{display: 'flex', gap: '10px'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}><div style={{width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)'}}></div>Con ofrenda</div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}><div style={{width: '8px', height: '8px', borderRadius: '50%', background: 'var(--border)'}}></div>Sin ofrenda</div>
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '4px', color: alDia ? 'var(--green)' : 'var(--dim)'}}>
                  {alDia && <span style={{fontSize: '12px'}}>✅</span>} {alDia ? 'Al día' : 'Sin ofrenda este mes'}
                </div>
              </div>
            </div>
          );
        })}
        {grupos.length === 0 && (
          <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--dim)'}}>No hay grupos registrados</div>
        )}
        {grupos.length > 0 && gruposVisibles.length === 0 && (
          <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--dim)'}}>No se encontraron grupos con los filtros aplicados</div>
        )}
      </div>
    </div>
  );
}
