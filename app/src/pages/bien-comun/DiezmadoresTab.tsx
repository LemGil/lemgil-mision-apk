import type { Dispatch, SetStateAction } from 'react';
import { exportCSV } from '../../lib/csvExport';
import { CsvImportButton } from '../../components/CsvImportButton';
import { showToast } from '../../lib/notification';
import { exportDiezmadoresPDF } from '../../lib/pdfExport';
import { money, monthKey, MS_SHORT } from '../../lib/utils';
import type { AporteComun, Diezmador } from '../../lib/types';

interface DiezmadoresTabProps {
  colaboradores: Diezmador[];
  aportes: AporteComun[];
  onNuevoDiezmador: () => void;
  onVerDiezmador: (d: Diezmador) => void;
  onDeleteDiezmador: (id: string) => void;
  searchDz: string; setSearchDz: Dispatch<SetStateAction<string>>;
  filterZona: string; setFilterZona: Dispatch<SetStateAction<string>>;
  filterEstado: string; setFilterEstado: Dispatch<SetStateAction<string>>;
  filterPlanDz: string; setFilterPlanDz: Dispatch<SetStateAction<string>>;
}

export function DiezmadoresTab(props: DiezmadoresTabProps) {
  const { colaboradores, aportes, onNuevoDiezmador, onVerDiezmador, onDeleteDiezmador, searchDz, setSearchDz, filterZona, setFilterZona, filterEstado, setFilterEstado, filterPlanDz, setFilterPlanDz } = props;
  return (
            <div className="page-content">
                <div className="actions-row">
                    <button className="btn btn-gold" onClick={onNuevoDiezmador}>➕ Nuevo Diezmador</button>
                    <button className="btn btn-secondary" onClick={() => exportDiezmadoresPDF({ colaboradores, aportes, anio: new Date().getFullYear().toString() })}>📄 Exportar PDF</button>
                    <button className="btn btn-secondary" onClick={() => {
                        if (!colaboradores.length) return showToast('No hay diezmadores para exportar');
                        const h = ['#', 'Nombre', 'Apellido', 'Zona', 'Estado', 'Plan Diezmo', 'Total Aportado'];
                        const r = colaboradores.map((c, i) => {
                            const regs = aportes.filter(a => a.diezmadorId === c.id);
                            const total = regs.reduce((s, a) => s + (a.monto || 0), 0);
                            return [i + 1, c.nombre, c.apellido, c.zona || '', c.estado, c.planDiezmo || 0, total];
                        });
                        exportCSV(h, r, 'lemgil-diezmadores.csv');
                        showToast('CSV exportado');
                    }}>📥 Exportar CSV</button>
                    <CsvImportButton
                      table="dadores"
                      fieldMapping={{
                        'Nombre': 'nombre',
                        'Apellido': 'apellido',
                        'Teléfono': 'telefono',
                        'Email': 'email',
                        'Zona': 'zona',
                        'Grupo': 'grupo',
                        'Estado': 'estado',
                        'Plan Diezmo': 'planDiezmo',
                        'Notas': 'notas',
                      }}
                      requiredFields={['nombre', 'apellido']}
                      defaults={{ estado: 'Activo', planDiezmo: 0 }}
                      onImport={(n) => showToast(`${n} diezmador(es) importado(s)`)}
                    />
                </div>
                <div className="search-bar">
                    <input className="search-input" placeholder="🔍 Buscar diezmador..." value={searchDz} onChange={e => setSearchDz(e.target.value)} />
                    <select className="filter-select" value={filterZona} onChange={e => setFilterZona(e.target.value)}><option value="">Todas las zonas</option><option>Norte</option><option>Sur</option><option>Este</option><option>Oeste</option><option>Centro</option></select>
                    <select className="filter-select" value={filterEstado} onChange={e => setFilterEstado(e.target.value)}><option value="">Todos</option><option>Activo</option><option>Irregular</option><option>Inactivo</option></select>
                    <select className="filter-select" value={filterPlanDz} onChange={e => setFilterPlanDz(e.target.value)}>
                        <option value="">Todos los planes</option>
                        <option value="con">Con plan diezmo</option>
                        <option value="sin">Sin plan diezmo</option>
                    </select>
                </div>
                <div className="dz-grid">
                    {colaboradores.filter(d => {
                        if (searchDz && !`${d.nombre} ${d.apellido}`.toLowerCase().includes(searchDz.toLowerCase())) return false;
                        if (filterZona && d.zona !== filterZona) return false;
                        if (filterEstado && d.estado !== filterEstado) return false;
                        if (filterPlanDz === 'con' && !(d.planDiezmo > 0)) return false;
                        if (filterPlanDz === 'sin' && (d.planDiezmo > 0)) return false;
                        return true;
                    }).map(d => {
                        const regs = aportes.filter(a => a.diezmadorId === d.id);
                        const total = regs.reduce((s, a) => s + (a.monto || 0), 0);
                        const mesK = new Date().toISOString().slice(0, 7);
                        const alDia = regs.some(a => monthKey(a.fecha) === mesK);
                        return (
                                 <div key={d.id} className="card" onClick={() => onVerDiezmador(d)} style={{cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--bg)', padding: '16px', borderRadius: '16px', position: 'relative', overflow: 'hidden'}}>
                                     <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px'}}>
                                         <div style={{width: '50px', height: '50px', borderRadius: '50%', background: 'var(--gold-glow)', border: '2px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--gold)', fontSize: '16px'}}>{d.nombre[0]}{d.apellido[0]}</div>
                                         <div style={{flex: 1}}>
                                             <div style={{fontWeight: 800, fontSize: '18px', lineHeight: '1.2'}}>{d.nombre} {d.apellido}</div>
                                             <div style={{color: 'var(--gold)', fontSize: '13px'}}>{d.zona || 'Sin zona'}</div>
                                         </div>
                                         <span className={`badge ${d.estado === 'Activo' ? 'badge-green' : 'badge-red'}`} style={{fontSize: '11px', padding: '4px 12px'}}>{d.estado}</span>
                                          <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); onDeleteDiezmador(d.id); }} style={{fontSize: '11px', padding: '4px 8px'}}>🗑️</button>
                                     </div>
                                     <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '8px', color: 'var(--dim)'}}>
                                         <span>💰 Total: <span style={{color: 'var(--gold)', fontWeight: 700}}>{money(total)}</span></span>
                                         <span style={{opacity: 0.5}}>•</span>
                                         <span>📋 {regs.length} registros</span>
                                         <span style={{opacity: 0.5}}>•</span>
                                         <span>Plan: <span style={{color: 'var(--dim)'}}>{money(d.planDiezmo || 0)}</span></span>
                                     </div>
                                     {(() => {
                                         const planDiezmo = d.planDiezmo || 0;
                                         const metaAnual = planDiezmo * 12;
                                         if (metaAnual <= 0) return null;
                                         const pctCump = Math.min((total / metaAnual) * 100, 100);
                                         const semaforo = pctCump >= 100 ? 'var(--gold)' : pctCump >= 70 ? 'var(--green)' : 'var(--red)';
                                         return (
                                             <div style={{marginBottom: '14px'}}>
                                                 <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--dim)', marginBottom: '3px'}}>
                                                     <span>🎯 Meta anual: {money(metaAnual)}</span>
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
                                             <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}><div style={{width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)'}}></div>Con aporte</div>
                                             <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}><div style={{width: '8px', height: '8px', borderRadius: '50%', background: 'var(--border)'}}></div>Sin aporte</div>
                                         </div>
                                         <div style={{display: 'flex', alignItems: 'center', gap: '4px', color: alDia ? 'var(--green)' : 'var(--dim)'}}>
                                             {alDia && <span style={{fontSize: '12px'}}>✅</span>} Al día
                                         </div>
                                     </div>
                                 </div>

                        );
                    })}
                </div>
            </div>
  );
}
